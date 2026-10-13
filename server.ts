import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import localtunnel from 'localtunnel';
import fs from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const LOCALTUNNEL_SUBDOMAIN = process.env.LOCALTUNNEL_SUBDOMAIN || 'pawsduty-duty';

let tunnelStatus = {
  active: false,
  url: `https://${LOCALTUNNEL_SUBDOMAIN}.loca.lt`,
  webhookUrl: `https://${LOCALTUNNEL_SUBDOMAIN}.loca.lt/api/line/webhook`,
  lastError: null as string | null,
};

// Initialize Firestore for server-side LINE OA queries
let serverDb: any = null;
try {
  const cfgPath = path.join(__dirname, 'firebase-applet-config.json');
  if (fs.existsSync(cfgPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    const fApp = initializeApp(firebaseConfig, 'server-app');
    serverDb = getFirestore(fApp, firebaseConfig.firestoreDatabaseId);
    console.log('✅ Connected Firestore in server.ts');
  }
} catch (e: any) {
  console.warn('⚠️ Server Firestore init notice:', e.message);
}

app.use(express.json());

// Permanent LINE OA configuration store
const DEFAULT_LINE_CONFIG = {
  lineChannelId: '2011986358',
  lineChannelSecret: 'e5b4f8b6ee153630605a8ae570acacd9',
  lineAccessToken:
    'KuXbOznb4aCQvDid2OyJ8F4+k3o221q6owdzubhHzw0hNexdEEw+3bYMMY4EhgjA/UQ6WvBR5/Zyy1WgjZwITGugy5rnBqMnkBBpqJY4NGVHmd1wfImEstyXPUV3blruSEEwn+ywp8PHBBIk0smvYgdB04t89/1O/w1cDnyilFU=',
  liffId: '',
};

let lineConfig = {
  lineChannelId: process.env.LINE_CHANNEL_ID || DEFAULT_LINE_CONFIG.lineChannelId,
  lineChannelSecret: process.env.LINE_CHANNEL_SECRET || DEFAULT_LINE_CONFIG.lineChannelSecret,
  lineAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || DEFAULT_LINE_CONFIG.lineAccessToken,
  liffId: process.env.VITE_LINE_LIFF_ID || DEFAULT_LINE_CONFIG.liffId,
};

// API: Get LINE OA Config & Webhook status
app.get('/api/line/config', (req, res) => {
  res.json({
    hasChannelId: !!lineConfig.lineChannelId,
    hasChannelSecret: !!lineConfig.lineChannelSecret,
    hasAccessToken: !!lineConfig.lineAccessToken,
    lineChannelId: lineConfig.lineChannelId,
    liffId: lineConfig.liffId,
    webhookUrl: tunnelStatus.webhookUrl,
    tunnelUrl: tunnelStatus.url,
    tunnelActive: tunnelStatus.active,
    accessTokenLength: lineConfig.lineAccessToken ? lineConfig.lineAccessToken.length : 0,
    // Mask sensitive secrets for UI display
    lineChannelSecretMasked: lineConfig.lineChannelSecret
      ? lineConfig.lineChannelSecret.slice(0, 4) + '••••••••' + lineConfig.lineChannelSecret.slice(-4)
      : '',
    lineAccessTokenMasked: lineConfig.lineAccessToken
      ? lineConfig.lineAccessToken.slice(0, 8) + '••••••••' + lineConfig.lineAccessToken.slice(-6)
      : '',
  });
});

app.get('/api/line/tunnel-status', (req, res) => {
  res.json(tunnelStatus);
});

// API: Update LINE OA Config
app.post('/api/line/config', (req, res) => {
  const { lineChannelId, lineChannelSecret, lineAccessToken, liffId } = req.body;

  if (lineChannelId !== undefined) lineConfig.lineChannelId = lineChannelId.trim();
  if (lineChannelSecret !== undefined) lineConfig.lineChannelSecret = lineChannelSecret.trim();
  if (lineAccessToken !== undefined) lineConfig.lineAccessToken = lineAccessToken.trim();
  if (liffId !== undefined) lineConfig.liffId = liffId.trim();

  res.json({
    success: true,
    message: 'อัปเดตการตั้งค่า LINE OA เรียบร้อยแล้ว',
    configStatus: {
      hasChannelId: !!lineConfig.lineChannelId,
      hasChannelSecret: !!lineConfig.lineChannelSecret,
      hasAccessToken: !!lineConfig.lineAccessToken,
    },
  });
});

// API: Get LINE OAuth Login URL
app.get('/api/line/login-url', (req, res) => {
  const redirectUri = req.query.redirect_uri as string || `${req.protocol}://${req.get('host')}/auth/line/callback`;
  const state = Math.random().toString(36).substring(2, 15);

  if (!lineConfig.lineChannelId) {
    return res.status(400).json({
      error: 'ยังไม่ได้ตั้งค่า LINE Channel ID กรุณากรอกในระบบตั้งค่า LINE OA',
    });
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: lineConfig.lineChannelId,
    redirect_uri: redirectUri,
    state,
    scope: 'profile openid email',
  });

  const loginUrl = `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`;
  res.json({ loginUrl, state, redirectUri });
});

// API: LINE Login OAuth Callback - Exchange authorization code for profile
app.post('/api/line/callback', async (req, res) => {
  try {
    const { code, redirectUri } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Missing authorization code' });
    }

    if (!lineConfig.lineChannelId || !lineConfig.lineChannelSecret) {
      return res.status(400).json({
        error: 'กรุณาตั้งค่า LINE Channel ID และ Channel Secret ก่อนใช้งาน LINE Login',
      });
    }

    // Exchange code for Token
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: lineConfig.lineChannelId,
      client_secret: lineConfig.lineChannelSecret,
    });

    const tokenResponse = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
      const errData = await tokenResponse.json();
      return res.status(400).json({
        error: 'LINE Token Error: ' + (errData.error_description || JSON.stringify(errData)),
      });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Get Profile from LINE API
    const profileResponse = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!profileResponse.ok) {
      return res.status(400).json({ error: 'ไม่สามารถดึงข้อมูลโปรไฟล์จาก LINE ได้' });
    }

    const profile = await profileResponse.json();

    res.json({
      success: true,
      lineUserId: profile.userId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl,
      statusMessage: profile.statusMessage,
    });
  } catch (err: any) {
    console.error('LINE Callback Error:', err);
    res.status(500).json({ error: err.message || 'Server error during LINE authentication' });
  }
});

// API: LINE Messaging API Webhook (รองรับการ Verify Webhook จาก LINE Developers Console และการตอบกลับ)
app.get('/api/line/webhook', (req, res) => {
  res.status(200).send('BojoiDuty LINE Webhook endpoint is active and ready.');
});

// Thai Date Formatters for LINE Bot
const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];
const THAI_DAYS_NAME = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];

function formatThaiDateDisplay(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dayOfWeek = new Date(y, m - 1, d).getDay();
    return `${THAI_DAYS_NAME[dayOfWeek]}ที่ ${d} ${THAI_MONTHS_SHORT[m - 1]} ${y + 543}`;
  } catch {
    return dateStr;
  }
}

function getTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getTomorrowString(): string {
  const now = new Date();
  now.setDate(now.getDate() + 1);
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getLineQuickReplyItems() {
  return {
    items: [
      {
        type: 'action',
        action: {
          type: 'message',
          label: '📅 เวรที่ใกล้จะถึง',
          text: 'เวรที่ใกล้จะถึง',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '☀️ เวรวันนี้',
          text: 'เวรวันนี้',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '🌙 เวรพรุ่งนี้',
          text: 'เวรพรุ่งนี้',
        },
      },
      {
        type: 'action',
        action: {
          type: 'message',
          label: '📋 ตารางเวร 7 วัน',
          text: 'ตารางเวร',
        },
      },
    ],
  };
}

// API: LINE Messaging API Webhook (รองรับการ Verify Webhook และการพิมพ์โต้ตอบถามเวร)
app.get('/api/line/webhook', (req, res) => {
  res.status(200).send('BojoiDuty LINE Webhook endpoint is active and ready.');
});

app.post('/api/line/webhook', async (req, res) => {
  try {
    const events = req.body?.events || [];
    console.log(`[LINE Webhook]: Received ${events.length} event(s)`);

    const hostUrl = `${req.protocol}://${req.get('host')}`;

    for (const event of events) {
      if (event.type === 'message' && event.replyToken && lineConfig.lineAccessToken) {
        if (event.message?.type === 'text') {
          const userRawText = (event.message.text || '').trim();
          const userText = userRawText.toLowerCase();
          const lineSenderId = event.source?.userId || '';

          let replyText = '';

          // 1. ดึงข้อมูลผู้ใช้และเวรจาก Firestore
          let allUsers: any[] = [];
          let allShifts: any[] = [];

          if (serverDb) {
            try {
              const [usersSnap, shiftsSnap] = await Promise.all([
                getDocs(collection(serverDb, 'users')),
                getDocs(collection(serverDb, 'shifts')),
              ]);
              allUsers = usersSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
              allShifts = shiftsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
            } catch (dbErr: any) {
              console.warn('[Firestore Fetch Warning]:', dbErr.message);
            }
          }

          const userMap = new Map<string, any>();
          allUsers.forEach((u) => userMap.set(u.id, u));

          // ค้นหาผู้ใช้จาก LINE User ID
          const linkedUser = allUsers.find((u) => u.lineUserId === lineSenderId);
          const userName = linkedUser ? (linkedUser.nickname || linkedUser.name || linkedUser.username) : '';

          const todayStr = getTodayString();
          const tomorrowStr = getTomorrowString();

          // 2. วิเคราะห์คำสั่งที่พิมพ์เข้ามา
          const isUpcomingQuery =
            userText.includes('เวรที่ใกล้จะถึง') ||
            userText.includes('เวรใกล้จะถึง') ||
            userText.includes('เวรใกล้ถึง') ||
            userText.includes('เวรของฉัน') ||
            userText.includes('เวรฉัน') ||
            userText.includes('เวรผม') ||
            userText.includes('เวรเรา') ||
            userText.includes('ตารางเวรฉัน');

          const isTodayQuery =
            userText.includes('เวรวันนี้') ||
            userText.includes('วันนี้ใครอยู่เวร') ||
            userText === 'วันนี้' ||
            userText.includes('เวรวันนี');

          const isTomorrowQuery =
            userText.includes('เวรพรุ่งนี้') ||
            userText.includes('พรุ่งนี้ใครอยู่เวร') ||
            userText === 'พรุ่งนี้';

          const isScheduleQuery =
            userText.includes('ตารางเวร') ||
            userText.includes('ตารางเวรทั้งหมด') ||
            userText.includes('ดูเวร') ||
            userText.includes('เวรทั้งหมด');

          if (isUpcomingQuery) {
            // === ฟังก์ชั่น: เวรที่ใกล้จะถึง ===
            if (linkedUser) {
              // ดึงเวรของผู้ใช้คนนี้ที่ตั้งแต่วันนี้เป็นต้นไป
              const myUpcomingShifts = allShifts
                .filter(
                  (s) =>
                    s.date >= todayStr &&
                    (s.userId === linkedUser.id ||
                      s.morningUserId === linkedUser.id ||
                      s.eveningUserId === linkedUser.id)
                )
                .sort((a, b) => a.date.localeCompare(b.date))
                .slice(0, 5); // แสดง 5 รายการแรกที่ใกล้ที่สุด

              if (myUpcomingShifts.length > 0) {
                const shiftLines = myUpcomingShifts.map((s, idx) => {
                  let partText = 'เวรเต็มวัน';
                  if (s.type === 'bathing') {
                    partText = '🛁 เวรอาบน้ำน้องหมา';
                  } else if (s.morningUserId === linkedUser.id && s.eveningUserId === linkedUser.id) {
                    partText = '☀️🌙 ทั้งเวรเช้าและเวรเย็น';
                  } else if (s.morningUserId === linkedUser.id) {
                    partText = '☀️ เวรเช้า (08:00 - 12:00 น.)';
                  } else if (s.eveningUserId === linkedUser.id) {
                    partText = '🌙 เวรเย็น (16:00 - 20:00 น.)';
                  }

                  const isToday = s.date === todayStr;
                  const isTomorrow = s.date === tomorrowStr;
                  const relativeLabel = isToday ? ' (🚨 วันนี้!)' : isTomorrow ? ' (พรุ่งนี้)' : '';

                  return `${idx + 1}. 📅 ${formatThaiDateDisplay(s.date)}${relativeLabel}\n   📌 ${partText}${s.notes ? `\n   📝 โน้ต: ${s.notes}` : ''}`;
                });

                replyText =
                  `🐶 [BojoiDuty] ตารางเวรที่ใกล้จะถึงของคุณ ${userName}:\n\n` +
                  shiftLines.join('\n\n') +
                  `\n\n✨ สู้ ๆ นะครับน้องหมารออยู่! 🐾\n🌐 จัดการเวรเพิ่มเติมได้ที่: ${hostUrl}`;
              } else {
                replyText =
                  `🐶 [BojoiDuty] สวัสดีครับคุณ ${userName}\n\n` +
                  `🎉 ช่วงนี้คุณยังไม่มีตารางเวรที่ต้องปฏิบัติหน้าที่ครับ\n\n` +
                  `หากต้องการจองเวรเลี้ยงน้องหมา สามารถกดเข้าสู่ระบบได้เลยที่:\n🌐 ${hostUrl}`;
              }
            } else {
              // หากบัญชี LINE ยังไม่ได้ผูกกับสมาชิกในเว็บ แสดงเวรของทีมที่ใกล้จะถึงแทน
              const teamUpcoming = allShifts
                .filter((s) => s.date >= todayStr)
                .sort((a, b) => a.date.localeCompare(b.date))
                .slice(0, 4);

              let teamText = '';
              if (teamUpcoming.length > 0) {
                teamText = teamUpcoming
                  .map((s) => {
                    const u = userMap.get(s.userId || s.morningUserId);
                    const name = u ? (u.nickname || u.name) : 'สมาชิก';
                    const typeText = s.type === 'bathing' ? '🛁 อาบน้ำ' : '🐶 เวรประจำวัน';
                    return `• 📅 ${formatThaiDateDisplay(s.date)}: ${name} (${typeText})`;
                  })
                  .join('\n');
              } else {
                teamText = '• ยังไม่มีการจัดเวรในช่วง 7 วันนี้';
              }

              replyText =
                `🐶 [BojoiDuty] ตารางเวรของทีมที่ใกล้จะถึง:\n\n` +
                teamText +
                `\n\n💡 หมายเหตุ: บัญชี LINE ของท่านยังไม่ได้เชื่อมต่อกับชื่อสมาชิกในเว็บ\nหากต้องการดู "เวรของฉัน" โดยเฉพาะ กรุณาเข้าสู่ระบบในเว็บแล้วกด "เชื่อมต่อ LINE" ในหน้าโปรไฟล์ครับ\n🌐 ${hostUrl}`;
            }
          } else if (isTodayQuery) {
            // === ฟังก์ชั่น: เวรวันนี้ ===
            const todayShifts = allShifts.filter((s) => s.date === todayStr);

            if (todayShifts.length > 0) {
              const daily = todayShifts.find((s) => s.type === 'daily');
              const bathing = todayShifts.find((s) => s.type === 'bathing');

              let morningName = 'ยังไม่มีผู้ปฏิบัติหน้าที่';
              let eveningName = 'ยังไม่มีผู้ปฏิบัติหน้าที่';

              if (daily) {
                const mUser = userMap.get(daily.morningUserId || daily.userId);
                const eUser = userMap.get(daily.eveningUserId || daily.userId);
                if (mUser) morningName = mUser.nickname || mUser.name;
                if (eUser) eveningName = eUser.nickname || eUser.name;
              }

              let bathingText = '';
              if (bathing) {
                const bUser = userMap.get(bathing.userId);
                bathingText = `\n🛁 เวรอาบน้ำ: ${bUser ? bUser.nickname || bUser.name : 'มีนัดหมายอาบน้ำ'}`;
              }

              replyText =
                `🐶 [BojoiDuty] ตารางเวรประจำวันนี้ (${formatThaiDateDisplay(todayStr)}):\n\n` +
                `☀️ เวรเช้า (08:00 - 12:00 น.): ${morningName}\n` +
                `🌙 เวรเย็น (16:00 - 20:00 น.): ${eveningName}` +
                bathingText +
                `\n\nอย่าลืมให้อาหารและพาน้องหมาไปวิ่งเล่นด้วยนะครับ 🐕`;
            } else {
              replyText = `🐶 [BojoiDuty] วันนี้ (${formatThaiDateDisplay(todayStr)}) ยังไม่มีผู้จองเวรครับ สมาชิกสามารถเข้าไปจองเวรได้ที่:\n🌐 ${hostUrl}`;
            }
          } else if (isTomorrowQuery) {
            // === ฟังก์ชั่น: เวรพรุ่งนี้ ===
            const tmrShifts = allShifts.filter((s) => s.date === tomorrowStr);

            if (tmrShifts.length > 0) {
              const daily = tmrShifts.find((s) => s.type === 'daily');
              const bathing = tmrShifts.find((s) => s.type === 'bathing');

              let morningName = 'ยังไม่มีผู้ปฏิบัติหน้าที่';
              let eveningName = 'ยังไม่มีผู้ปฏิบัติหน้าที่';

              if (daily) {
                const mUser = userMap.get(daily.morningUserId || daily.userId);
                const eUser = userMap.get(daily.eveningUserId || daily.userId);
                if (mUser) morningName = mUser.nickname || mUser.name;
                if (eUser) eveningName = eUser.nickname || eUser.name;
              }

              let bathingText = '';
              if (bathing) {
                const bUser = userMap.get(bathing.userId);
                bathingText = `\n🛁 เวรอาบน้ำ: ${bUser ? bUser.nickname || bUser.name : 'มีนัดหมายอาบน้ำ'}`;
              }

              replyText =
                `🐶 [BojoiDuty] ตารางเวรวันพรุ่งนี้ (${formatThaiDateDisplay(tomorrowStr)}):\n\n` +
                `☀️ เวรเช้า (08:00 - 12:00 น.): ${morningName}\n` +
                `🌙 เวรเย็น (16:00 - 20:00 น.): ${eveningName}` +
                bathingText +
                `\n\nเตรียมตัวดูแลน้องหมากันนะครับ 🐾`;
            } else {
              replyText = `🐶 [BojoiDuty] วันพรุ่งนี้ (${formatThaiDateDisplay(tomorrowStr)}) ยังไม่มีผู้จองเวรครับ`;
            }
          } else if (isScheduleQuery) {
            // === ฟังก์ชั่น: ตารางเวร 7 วัน ===
            const next7Days = allShifts
              .filter((s) => s.date >= todayStr)
              .sort((a, b) => a.date.localeCompare(b.date))
              .slice(0, 6);

            if (next7Days.length > 0) {
              const lines = next7Days.map((s) => {
                const u = userMap.get(s.userId || s.morningUserId);
                const name = u ? (u.nickname || u.name) : 'มีผู้จอง';
                const typeText = s.type === 'bathing' ? '🛁 อาบน้ำ' : '🐶 เวรประจำวัน';
                return `• ${formatThaiDateDisplay(s.date)}: ${name} (${typeText})`;
              });

              replyText =
                `📋 [BojoiDuty] ตารางเวรที่ใกล้จะถึงของทีม:\n\n` +
                lines.join('\n') +
                `\n\n🌐 เข้าดูปฏิทินแบบเต็มได้ที่: ${hostUrl}`;
            } else {
              replyText = `📋 [BojoiDuty] ยังไม่มีเวรที่จองไว้ในช่วง 7 วันนี้ครับ ท่านสามารถจองเวรได้ที่:\n🌐 ${hostUrl}`;
            }
          } else {
            // === คำสั่งอื่นๆ / ทักทาย ===
            const welcomeGreeting = linkedUser
              ? `สวัสดีครับคุณ ${userName}! 🐶`
              : `สวัสดีครับ! 🐶`;

            replyText =
              `${welcomeGreeting} ผมคือบอท BojoiDuty ดูแลตารางเวรน้องหมา\n\n` +
              `📌 คุณสามารถกดปุ่มด้านล่างหรือพิมพ์คำสั่งได้เลยครับ:\n` +
              `• "เวรที่ใกล้จะถึง" หรือ "เวรของฉัน" เพื่อดูเวรของคุณ\n` +
              `• "เวรวันนี้" เพื่อดูว่าวันนี้ใครอยู่เวร\n` +
              `• "เวรพรุ่งนี้" เพื่อดูเวรวันพรุ่งนี้\n` +
              `• "ตารางเวร" เพื่อดูเวรของทีมทั้งหมด\n\n` +
              `🌐 เข้าสู่ระบบ BojoiDuty: ${hostUrl}`;
          }

          // ส่งข้อความตอบกลับ พร้อม Quick Reply Chips 4 ปุ่ม
          await fetch('https://api.line.me/v2/bot/message/reply', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${lineConfig.lineAccessToken}`,
            },
            body: JSON.stringify({
              replyToken: event.replyToken,
              messages: [
                {
                  type: 'text',
                  text: replyText,
                  quickReply: getLineQuickReplyItems(),
                },
              ],
            }),
          }).catch((e) => console.warn('[Webhook Reply Error]:', e.message));
        }
      }
    }

    res.status(200).send('OK');
  } catch (err: any) {
    console.warn('[Webhook Error]:', err.message);
    res.status(200).send('OK');
  }
});

// API: Send Push Notification via Messaging API
app.post('/api/line/push-notification', async (req, res) => {
  try {
    const { targetUserId, messageText, flexMessage } = req.body;

    if (!lineConfig.lineAccessToken) {
      return res.status(200).json({
        success: false,
        error: 'ยังไม่ได้ตั้งค่า LINE Messaging API Channel Access Token ในส่วนผู้ดูแลระบบ',
      });
    }

    // Check if the token is obviously invalid (e.g. 32-char Secret Key instead of long-lived access token)
    if (lineConfig.lineAccessToken.length < 50) {
      return res.status(200).json({
        success: false,
        error:
          'Channel Access Token ไม่ถูกต้อง: Token สำหรับส่งข้อความต้องเป็น Long-lived Token (ขนาดยาว ~172 ตัวอักษร) ที่ได้จากการกดปุ่ม "Issue" ในแท็บ Messaging API ของ LINE Developers Console',
      });
    }

    if (!targetUserId) {
      return res.status(200).json({ success: false, error: 'กรุณาระบุ LINE User ID ของผู้รับ' });
    }

    // Build LINE messages payload
    const messages = flexMessage
      ? [flexMessage]
      : [
          {
            type: 'text',
            text: messageText || '🐶 [BojoiDuty] คุณมีแจ้งเตือนเวรใหม่ที่ใกล้จะถึง กรุณาตรวจสอบในระบบ',
          },
        ];

    const pushResponse = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${lineConfig.lineAccessToken}`,
      },
      body: JSON.stringify({
        to: targetUserId,
        messages,
      }),
    });

    if (!pushResponse.ok) {
      const errJson = await pushResponse.json().catch(() => ({}));
      console.warn('[LINE Push API Notice]:', errJson?.message || errJson);
      return res.status(200).json({
        success: false,
        error: `LINE API Error (${pushResponse.status}): ` + (errJson.message || JSON.stringify(errJson)),
      });
    }

    res.json({
      success: true,
      message: 'ส่งการแจ้งเตือนเข้า LINE สำเร็จ!',
      targetUserId,
    });
  } catch (err: any) {
    console.warn('[Push Notification Notice]:', err.message);
    res.status(200).json({
      success: false,
      error: err.message || 'Failed to send LINE push notification',
    });
  }
});

// API: Test LINE Connection
app.post('/api/line/test-notification', async (req, res) => {
  try {
    const { testUserId } = req.body;
    if (!lineConfig.lineAccessToken) {
      return res.status(200).json({
        success: false,
        error: 'กรุณากรอก LINE Channel Access Token ก่อนทำการทดสอบ',
      });
    }

    if (lineConfig.lineAccessToken.length < 50) {
      return res.status(200).json({
        success: false,
        error:
          'Channel Access Token สั้นเกินไป (' +
          lineConfig.lineAccessToken.length +
          ' ตัวอักษร): รหัสนี้ดูเหมือนจะเป็น Secret Key (32 ตัวอักษร) กรุณาไปที่แท็บ Messaging API ใน LINE Developers แล้วกดปุ่ม "Issue" ตรง Channel access token (long-lived) เพื่อคัดลอกรหัสขนาดยาว (~172 ตัวอักษร)',
      });
    }

    const testMessage = {
      type: 'text',
      text: '🔔 [ทดสอบระบบ BojoiDuty] การเชื่อมต่อ LINE Messaging API สำเร็จเรียบร้อยแล้ว!',
    };

    const pushResponse = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${lineConfig.lineAccessToken}`,
      },
      body: JSON.stringify({
        to: testUserId || 'U_TEST_USER_ID',
        messages: [testMessage],
      }),
    });

    const resJson = await pushResponse.json().catch(() => ({}));
    if (!pushResponse.ok) {
      return res.status(200).json({
        success: false,
        error: resJson.message || JSON.stringify(resJson),
      });
    }

    res.json({ success: true, message: 'ส่งข้อความทดสอบไปยัง LINE สำเร็จ!' });
  } catch (err: any) {
    res.status(200).json({ success: false, error: err.message });
  }
});

// Memory log to prevent duplicate notifications on the same date for the same shift event
const sentRemindersLog = new Set<string>();

function getDateNDaysAway(n: number): string {
  const date = new Date();
  date.setDate(date.getDate() + n);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function checkAndSendScheduledReminders(forceRun: boolean = false) {
  if (!serverDb || !lineConfig.lineAccessToken || lineConfig.lineAccessToken.length < 50) {
    console.log('[Scheduled Reminders Notice]: Firestore or valid LINE Access Token not ready');
    return { success: false, sentCount: 0, reason: 'Firestore or Token not ready' };
  }

  try {
    const todayStr = getDateNDaysAway(0);
    const in1DayStr = getDateNDaysAway(1);
    const in3DaysStr = getDateNDaysAway(3);

    console.log(`[Scheduled Reminders]: Checking shifts for Today (${todayStr}), Tomorrow (${in1DayStr}), 3 Days (${in3DaysStr})`);

    const [usersSnap, shiftsSnap, annSnap] = await Promise.all([
      getDocs(collection(serverDb, 'users')),
      getDocs(collection(serverDb, 'shifts')),
      getDocs(collection(serverDb, 'announcements')),
    ]);

    const allUsers = usersSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    const allShifts = shiftsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    const allAnnouncements = annSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    const userMap = new Map<string, any>();
    allUsers.forEach((u) => userMap.set(u.id, u));

    // Prepare announcements summary text for D-0
    let announcementText = '';
    if (allAnnouncements.length > 0) {
      const sortedAnn = allAnnouncements.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      const topAnn = sortedAnn.slice(0, 3);
      announcementText = topAnn
        .map((a, idx) => `${idx + 1}. 📌 ${a.title || 'ประกาศ'}\n   ${a.content || ''}`)
        .join('\n\n');
    } else {
      announcementText = '• ไม่มีประกาศใหม่ในวันนี้ สามารถเข้าดูปฏิทินในระบบได้ครับ';
    }

    const reminderTargets = [
      { dateStr: todayStr, code: 'D0', label: '🚨 แจ้งเตือนเวรของคุณวันนี้!' },
      { dateStr: in1DayStr, code: 'D1', label: '🌙 แจ้งเตือนเวรวันพรุ่งนี้ (อีก 1 วัน)!' },
      { dateStr: in3DaysStr, code: 'D3', label: '📅 แจ้งเตือนเวรล่วงหน้าอีก 3 วัน!' },
    ];

    let sentCount = 0;
    const results: string[] = [];

    for (const target of reminderTargets) {
      const targetShifts = allShifts.filter((s) => s.date === target.dateStr);

      for (const shift of targetShifts) {
        // Collect assigned user IDs for this shift
        const assignedUserIds = new Set<string>();

        if (shift.type === 'bathing' && shift.userId) {
          assignedUserIds.add(shift.userId);
        } else if (shift.type === 'daily') {
          if (shift.morningUserId) assignedUserIds.add(shift.morningUserId);
          if (shift.eveningUserId) assignedUserIds.add(shift.eveningUserId);
          if (shift.userId) assignedUserIds.add(shift.userId);
        }

        for (const userId of assignedUserIds) {
          const userObj = userMap.get(userId);
          if (!userObj || !userObj.lineUserId) continue;

          const logKey = `${userObj.id}_${target.dateStr}_${target.code}`;
          if (!forceRun && sentRemindersLog.has(logKey)) {
            continue; // Already sent today for this event
          }

          // Determine shift parts for this user
          let partText = 'เวรปฏิบัติหน้าที่';
          if (shift.type === 'bathing') {
            partText = '🛁 เวรอาบน้ำดูแลน้องหมา';
          } else if (shift.morningUserId === userId && shift.eveningUserId === userId) {
            partText = '☀️🌙 ทั้งเวรเช้า (08:00 - 12:00 น.) และเวรเย็น (16:00 - 20:00 น.)';
          } else if (shift.morningUserId === userId) {
            partText = '☀️ เวรเช้า (08:00 - 12:00 น.)';
          } else if (shift.eveningUserId === userId) {
            partText = '🌙 เวรเย็น (16:00 - 20:00 น.)';
          }

          const thaiDate = formatThaiDateDisplay(target.dateStr);
          const userName = userObj.nickname || userObj.name || 'คุณสมาชิก';

          let msg = `🐶 [BojoiDuty] ${target.label}\n\n`;
          msg += `สวัสดีครับคุณ ${userName}\n`;
          msg += `📌 คุณมีเวรในวันที่: ${thaiDate}\n`;
          msg += `⏰ รายละเอียด: ${partText}\n`;

          if (shift.notes) {
            msg += `📝 โน้ตเพิ่มเติม: ${shift.notes}\n`;
          }

          // If Today (D0), include ANNOUNCEMENTS details as requested!
          if (target.code === 'D0') {
            msg += `\n━━━━━━━━━━━━━━━\n📢 [ประกาศ & ข่าวสารสำคัญประจำวันนี้]:\n${announcementText}\n━━━━━━━━━━━━━━━\n`;
          }

          msg += `\n✨ สู้ ๆ นะครับ น้องหมารออยู่! 🐾\n🌐 เข้าสู่ระบบ: ${tunnelStatus.url}`;

          // Send LINE Push Notification
          try {
            const pushRes = await fetch('https://api.line.me/v2/bot/message/push', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${lineConfig.lineAccessToken}`,
              },
              body: JSON.stringify({
                to: userObj.lineUserId,
                messages: [{ type: 'text', text: msg, quickReply: getLineQuickReplyItems() }],
              }),
            });

            if (pushRes.ok) {
              sentRemindersLog.add(logKey);
              sentCount++;
              results.push(`ส่งแจ้งเตือน ${target.code} ถึง ${userName} (${target.dateStr}) สำเร็จ`);
              console.log(`[Scheduled Push Success]: ${logKey} -> ${userObj.lineUserId}`);
            } else {
              const err = await pushRes.json().catch(() => ({}));
              console.warn(`[Scheduled Push Failed]: ${logKey}`, err);
            }
          } catch (pushErr: any) {
            console.warn(`[Scheduled Push Error]: ${logKey}`, pushErr.message);
          }
        }
      }
    }

    return { success: true, sentCount, results };
  } catch (err: any) {
    console.warn('[Scheduled Reminders Error]:', err.message);
    return { success: false, error: err.message, sentCount: 0 };
  }
}

// API: Trigger Scheduled Reminders (D-3, D-1, Today + Announcements)
app.post('/api/line/trigger-scheduled-reminders', async (req, res) => {
  const force = req.body?.force === true;
  const result = await checkAndSendScheduledReminders(force);
  res.json(result);
});

// Start Express server with Vite in Development mode
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    startLocalTunnel();
    // Run scheduled reminders check once on boot & every 1 hour
    setTimeout(() => checkAndSendScheduledReminders(), 10000);
    setInterval(() => checkAndSendScheduledReminders(), 3600000);
  });
}

async function startLocalTunnel() {
  try {
    const tunnel = await localtunnel({
      port: Number(PORT),
      subdomain: LOCALTUNNEL_SUBDOMAIN,
    });

    tunnelStatus.active = true;
    tunnelStatus.url = tunnel.url;
    tunnelStatus.webhookUrl = `${tunnel.url}/api/line/webhook`;
    tunnelStatus.lastError = null;

    console.log(`🚀 Localtunnel active at: ${tunnel.url}`);
    console.log(`🔗 LINE Webhook URL: ${tunnel.url}/api/line/webhook`);

    tunnel.on('close', () => {
      console.log('⚠️ Localtunnel closed. Reconnecting in 5 seconds...');
      tunnelStatus.active = false;
      setTimeout(startLocalTunnel, 5000);
    });

    tunnel.on('error', (err: any) => {
      console.warn('⚠️ Localtunnel error:', err.message || err);
      tunnelStatus.active = false;
      tunnelStatus.lastError = err.message || String(err);
      setTimeout(startLocalTunnel, 5000);
    });
  } catch (err: any) {
    console.warn('⚠️ Failed to start localtunnel:', err.message || err);
    tunnelStatus.active = false;
    tunnelStatus.lastError = err.message || String(err);
    setTimeout(startLocalTunnel, 5000);
  }
}

startServer();

