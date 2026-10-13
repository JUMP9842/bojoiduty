const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Default Long-Lived LINE Channel Access Token
const DEFAULT_LINE_ACCESS_TOKEN =
  process.env.LINE_ACCESS_TOKEN ||
  "KuXbOznb4aCQvDid2OyJ8F4+k3o221q6owdzubhHzw0hNexdEEw+3bYMMY4EhgjA/UQ6WvBR5/Zyy1WgjZwITGugy5rnBqMnkBBpqJY4NGVHmd1wfImEstyXPUV3blruSEEwn+ywp8PHBBIk0smvYgdB04t89/1O/w1cDnyilFU=";

const THAI_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
];
const THAI_DAYS_NAME = ["วันอาทิตย์", "วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์"];

function formatThaiDateDisplay(dateStr) {
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dayOfWeek = new Date(y, m - 1, d).getDay();
    return `${THAI_DAYS_NAME[dayOfWeek]}ที่ ${d} ${THAI_MONTHS_SHORT[m - 1]} ${y + 543}`;
  } catch {
    return dateStr;
  }
}

function getTodayString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function getTomorrowString() {
  const now = new Date();
  now.setDate(now.getDate() + 1);
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function getQuickReplyItems() {
  return {
    items: [
      {
        type: "action",
        action: {
          type: "message",
          label: "📅 เวรที่ใกล้จะถึง",
          text: "เวรที่ใกล้จะถึง",
        },
      },
      {
        type: "action",
        action: {
          type: "message",
          label: "☀️ เวรวันนี้",
          text: "เวรวันนี้",
        },
      },
      {
        type: "action",
        action: {
          type: "message",
          label: "🌙 เวรพรุ่งนี้",
          text: "เวรพรุ่งนี้",
        },
      },
      {
        type: "action",
        action: {
          type: "message",
          label: "📋 ตารางเวร 7 วัน",
          text: "ตารางเวร",
        },
      },
    ],
  };
}

/**
 * Helper to reply to LINE messages
 */
async function replyLineMessage(replyToken, messages, token = DEFAULT_LINE_ACCESS_TOKEN) {
  if (!replyToken || !token) return;
  try {
    const res = await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        replyToken,
        messages,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      logger.warn("LINE reply API error:", err);
    }
  } catch (err) {
    logger.error("Failed to send LINE reply message:", err);
  }
}

/**
 * Core Webhook Handler Logic
 */
async function handleWebhook(req, res) {
  if (req.method === "GET") {
    return res.status(200).send("OK: BojoiDuty LINE Webhook (Firebase Cloud Function) is running!");
  }

  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const events = req.body?.events || [];
    logger.info(`Received ${events.length} event(s) from LINE Webhook`);

    for (const event of events) {
      const lineSenderId = event.source?.userId || "unknown";

      if (event.type === "message" && event.replyToken) {
        if (event.message?.type === "text") {
          const userRawText = (event.message.text || "").trim();
          const userText = userRawText.toLowerCase();

          let replyText = "";

          // Fetch users and shifts from Firestore
          let allUsers = [];
          let allShifts = [];

          try {
            const [usersSnap, shiftsSnap] = await Promise.all([
              db.collection("users").get(),
              db.collection("shifts").get(),
            ]);
            allUsers = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
            allShifts = shiftsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
          } catch (dbErr) {
            logger.warn("Firestore fetch warning:", dbErr.message);
          }

          const userMap = new Map();
          allUsers.forEach((u) => userMap.set(u.id, u));

          const linkedUser = allUsers.find((u) => u.lineUserId === lineSenderId);
          const userName = linkedUser ? (linkedUser.nickname || linkedUser.name || linkedUser.username) : "";

          const todayStr = getTodayString();
          const tomorrowStr = getTomorrowString();

          const isUpcomingQuery =
            userText.includes("เวรที่ใกล้จะถึง") ||
            userText.includes("เวรใกล้จะถึง") ||
            userText.includes("เวรใกล้ถึง") ||
            userText.includes("เวรของฉัน") ||
            userText.includes("เวรฉัน") ||
            userText.includes("เวรผม") ||
            userText.includes("เวรเรา") ||
            userText.includes("ตารางเวรฉัน");

          const isTodayQuery =
            userText.includes("เวรวันนี้") ||
            userText.includes("วันนี้ใครอยู่เวร") ||
            userText === "วันนี้" ||
            userText.includes("เวรวันนี");

          const isTomorrowQuery =
            userText.includes("เวรพรุ่งนี้") ||
            userText.includes("พรุ่งนี้ใครอยู่เวร") ||
            userText === "พรุ่งนี้";

          const isScheduleQuery =
            userText.includes("ตารางเวร") ||
            userText.includes("ตารางเวรทั้งหมด") ||
            userText.includes("ดูเวร") ||
            userText.includes("เวรทั้งหมด");

          const isIdQuery =
            userText === "id" ||
            userText === "myid" ||
            userText === "ไอดี" ||
            userText === "รหัส";

          if (isUpcomingQuery) {
            if (linkedUser) {
              const myUpcomingShifts = allShifts
                .filter(
                  (s) =>
                    s.date >= todayStr &&
                    (s.userId === linkedUser.id ||
                      s.morningUserId === linkedUser.id ||
                      s.eveningUserId === linkedUser.id)
                )
                .sort((a, b) => a.date.localeCompare(b.date))
                .slice(0, 5);

              if (myUpcomingShifts.length > 0) {
                replyText = `📌 รายการเวรที่ใกล้จะถึงของคุณ ${userName}:\n\n`;
                myUpcomingShifts.forEach((s, idx) => {
                  const thaiDate = formatThaiDateDisplay(s.date);
                  let shiftTypeStr = "";
                  if (s.morningUserId === linkedUser.id) shiftTypeStr = "☀️ เวรเช้า";
                  else if (s.eveningUserId === linkedUser.id) shiftTypeStr = "🌙 เวรเย็น";
                  else shiftTypeStr = `⏰ ${s.shiftType || "เวรประจำวัน"}`;

                  replyText += `${idx + 1}. ${thaiDate}\n   └ ${shiftTypeStr}${s.note ? ` (${s.note})` : ""}\n`;
                });
                replyText += `\n🔔 ระบบจะส่งข้อความแจ้งเตือนอัตโนมัติก่อนถึงวันเวร 3 วัน และ 1 วันครับ!`;
              } else {
                replyText = `ℹ️ ไม่พบรายการเวรในอนาคตของคุณ ${userName} ครับ\n\n(หากเพิ่งจองเวร สามารถกดดูตารางเวรทั้งหมดได้เลยครับ)`;
              }
            } else {
              replyText = `⚠️ ยังไม่ได้เชื่อมต่อบัญชี LINE กับระบบเวร BojoiDuty!\n\n📌 LINE User ID ของคุณคือ:\n${lineSenderId}\n\nโปรดคัดลอก User ID นี้ไปบันทึกในหน้าโปรไฟล์เวรของคุณ เพื่อดูเวรและรับแจ้งเตือนครับ`;
            }
          } else if (isTodayQuery) {
            const todayShifts = allShifts.filter((s) => s.date === todayStr);
            const formattedDate = formatThaiDateDisplay(todayStr);

            if (todayShifts.length > 0) {
              replyText = `📅 ตารางเวรประจำวันนี้ (${formattedDate}):\n\n`;
              todayShifts.forEach((s) => {
                const mUser = userMap.get(s.morningUserId || s.userId);
                const eUser = userMap.get(s.eveningUserId);

                const mName = mUser ? (mUser.nickname || mUser.name) : "ยังไม่มีผู้ปฏิบัติงาน";
                const eName = eUser ? (eUser.nickname || eUser.name) : "ยังไม่มีผู้ปฏิบัติงาน";

                replyText += `☀️ เวรเช้า (08:00 - 16:00): ${mName}\n`;
                replyText += `🌙 เวรเย็น (16:00 - 24:00): ${eName}\n`;
                if (s.note) replyText += `📝 หมายเหตุ: ${s.note}\n`;
              });
            } else {
              replyText = `ℹ️ วันนี้ (${formattedDate}) ไม่มีเวรหรือยังไม่ได้ลงตารางเวรครับ`;
            }
          } else if (isTomorrowQuery) {
            const tomorrowShifts = allShifts.filter((s) => s.date === tomorrowStr);
            const formattedDate = formatThaiDateDisplay(tomorrowStr);

            if (tomorrowShifts.length > 0) {
              replyText = `🌙 ตารางเวรประจำวันพรุ่งนี้ (${formattedDate}):\n\n`;
              tomorrowShifts.forEach((s) => {
                const mUser = userMap.get(s.morningUserId || s.userId);
                const eUser = userMap.get(s.eveningUserId);

                const mName = mUser ? (mUser.nickname || mUser.name) : "ยังไม่มีผู้ปฏิบัติงาน";
                const eName = eUser ? (eUser.nickname || eUser.name) : "ยังไม่มีผู้ปฏิบัติงาน";

                replyText += `☀️ เวรเช้า: ${mName}\n`;
                replyText += `🌙 เวรเย็น: ${eName}\n`;
                if (s.note) replyText += `📝 หมายเหตุ: ${s.note}\n`;
              });
            } else {
              replyText = `ℹ️ วันพรุ่งนี้ (${formattedDate}) ไม่มีเวรครับ`;
            }
          } else if (isScheduleQuery) {
            const upcomingShifts = allShifts
              .filter((s) => s.date >= todayStr)
              .sort((a, b) => a.date.localeCompare(b.date))
              .slice(0, 7);

            if (upcomingShifts.length > 0) {
              replyText = `📋 ตารางเวรล่วงหน้า 7 วัน:\n\n`;
              upcomingShifts.forEach((s) => {
                const formattedDate = formatThaiDateDisplay(s.date);
                const mUser = userMap.get(s.morningUserId || s.userId);
                const eUser = userMap.get(s.eveningUserId);

                const mName = mUser ? (mUser.nickname || mUser.name) : "-";
                const eName = eUser ? (eUser.nickname || eUser.name) : "-";

                replyText += `📅 ${formattedDate}\n`;
                replyText += `   ☀️ เช้า: ${mName} | 🌙 เย็น: ${eName}\n\n`;
              });
            } else {
              replyText = `ℹ️ ยังไม่มีตารางเวรในระบบครับ`;
            }
          } else if (isIdQuery) {
            replyText = `📌 LINE User ID ของคุณคือ:\n${lineSenderId}\n\n(นำรหัสนี้ไปบันทึกในโปรไฟล์หน้าเว็บตารางเวร BojoiDuty เพื่อรับการแจ้งเตือนเตือนเวรล่วงหน้าครับ)`;
          } else {
            const greetingName = userName ? `คุณ ${userName}` : "ท่าน";
            replyText = `👋 สวัสดีครับ ${greetingName}!\n\nบอท BojoiDuty ยินดีให้บริการ ท่านสามารถกดเลือกเมนูทางด้านล่าง หรือพิมพ์คำถามได้ดังนี้ครับ:\n\n1. "เวรที่ใกล้จะถึง" - ดูเวรของตัวเองที่กำลังจะถึง\n2. "เวรวันนี้" - ดูว่าใครอยู่เวรวันนี้บ้าง\n3. "เวรพรุ่งนี้" - ดูเวรของวันพรุ่งนี้\n4. "ตารางเวร" - ดูตารางเวรทั้งหมด 7 วัน\n5. "id" - ขอ LINE User ID สำหรับผูกกับระบบ\n\n📌 LINE User ID ของคุณคือ:\n${lineSenderId}`;
          }

          await replyLineMessage(event.replyToken, [
            {
              type: "text",
              text: replyText,
              quickReply: getQuickReplyItems(),
            },
          ]);
        }
      } else if (event.type === "follow" && event.replyToken) {
        logger.info(`New follower [${lineSenderId}] added the bot`);
        const welcomeText = `🐶 ยินดีต้อนรับสู่ระบบตารางเวร BojoiDuty!\n\nขอบคุณที่เพิ่มเพื่อนกับบอทแจ้งเตือนเวร\n\n📌 LINE User ID ของคุณคือ:\n${lineSenderId}\n\nโปรดคัดลอก User ID นี้ไปบันทึกในหน้าโปรไฟล์ตารางเวร เพื่อรับแจ้งเตือนเตือนล่วงหน้า 3 วัน และ 1 วันครับ`;
        await replyLineMessage(event.replyToken, [
          {
            type: "text",
            text: welcomeText,
            quickReply: getQuickReplyItems(),
          },
        ]);
      }
    }

    return res.status(200).send("OK");
  } catch (error) {
    logger.error("Error processing LINE Webhook:", error);
    return res.status(200).send("OK");
  }
}

/**
 * 1. asia-southeast1 Region (Recommended for Thailand)
 * Webhook URL: https://asia-southeast1-feisty-quasar-q53bd.cloudfunctions.net/lineWebhook
 */
exports.lineWebhook = onRequest(
  {
    region: "asia-southeast1",
    cors: true,
  },
  handleWebhook
);

/**
 * 2. us-central1 Region
 * Webhook URL: https://us-central1-feisty-quasar-q53bd.cloudfunctions.net/lineWebhookUs
 */
exports.lineWebhookUs = onRequest(
  {
    region: "us-central1",
    cors: true,
  },
  handleWebhook
);
