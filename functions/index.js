const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

// Default Long-Lived LINE Channel Access Token
const DEFAULT_LINE_ACCESS_TOKEN =
  process.env.LINE_ACCESS_TOKEN ||
  "KuXbOznb4aCQvDid2OyJ8F4+k3o221q6owdzubhHzw0hNexdEEw+3bYMMY4EhgjA/UQ6WvBR5/Zyy1WgjZwITGugy5rnBqMnkBBpqJY4NGVHmd1wfImEstyXPUV3blruSEEwn+ywp8PHBBIk0smvYgdB04t89/1O/w1cDnyilFU=";

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
      logger.warn("LINE reply API returned error:", err);
    }
  } catch (err) {
    logger.error("Failed to send LINE reply message:", err);
  }
}

/**
 * Core Webhook Handler Logic
 */
async function handleWebhook(req, res) {
  // Support GET health check for easy browser verification
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
      const userId = event.source?.userId || "unknown";

      // 1. User sends a message to the bot
      if (event.type === "message" && event.replyToken) {
        if (event.message?.type === "text") {
          const userText = event.message.text.trim();
          logger.info(`Message from [${userId}]: "${userText}"`);

          let replyText = "";
          if (userText === "id" || userText === "ID" || userText === "ไอดี" || userText === "myid") {
            replyText = `📌 LINE User ID ของคุณคือ:\n${userId}\n\n(สามารถคัดลอกรหัสนี้ไปใส่ในเว็บตารางเวรเพื่อรับแจ้งเตือนได้เลยครับ)`;
          } else {
            replyText = `👋 สวัสดีครับ! บอท BojoiDuty ได้รับข้อความ: "${userText}" เรียบร้อยแล้ว\n\n📌 LINE User ID ของท่านคือ:\n${userId}\n\n(นำรหัสนี้ไปใส่ในโปรไฟล์หรือระบบแจ้งเตือนเวร เพื่อรับข้อความแจ้งเตือนอัตโนมัติ)`;
          }

          await replyLineMessage(event.replyToken, [
            { type: "text", text: replyText },
          ]);
        }
      }

      // 2. User adds or unblocks the bot (Follow event)
      else if (event.type === "follow" && event.replyToken) {
        logger.info(`New follower [${userId}] added the bot`);
        const welcomeText = `🐶 ยินดีต้อนรับสู่ระบบตารางเวร BojoiDuty!\n\nขอบคุณที่เพิ่มเพื่อนกับบอทแจ้งเตือน\n\n📌 LINE User ID ของคุณคือ:\n${userId}\n\nโปรดคัดลอก User ID นี้ไปบันทึกในหน้าเว็บตารางเวร เพื่อรับแจ้งเตือนก่อนเข้าเวรครับ`;
        await replyLineMessage(event.replyToken, [
          { type: "text", text: welcomeText },
        ]);
      }
    }

    // LINE requires an immediate HTTP 200 response to pass Webhook Verify & delivery
    return res.status(200).send("OK");
  } catch (error) {
    logger.error("Error processing LINE Webhook:", error);
    // Still return 200 so LINE does not mark webhook as dead
    return res.status(200).send("OK");
  }
}

/**
 * 1. asia-southeast1 Region (Singapore / Recommended for Thailand)
 * URL: https://asia-southeast1-feisty-quasar-q53bd.cloudfunctions.net/lineWebhook
 */
exports.lineWebhook = onRequest(
  {
    region: "asia-southeast1",
    cors: true,
  },
  handleWebhook
);

/**
 * 2. us-central1 Region (Default Firebase region)
 * URL: https://us-central1-feisty-quasar-q53bd.cloudfunctions.net/lineWebhookUs
 */
exports.lineWebhookUs = onRequest(
  {
    region: "us-central1",
    cors: true,
  },
  handleWebhook
);
