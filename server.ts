import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const LOCALTUNNEL_SUBDOMAIN = process.env.LOCALTUNNEL_SUBDOMAIN || 'pawsduty-duty';

const DEV_SERVER_URL = 'https://ais-dev-olsgx3yczrx7ghc5qkwxao-603131036827.asia-southeast1.run.app';

let tunnelStatus = {
  active: false,
  url: DEV_SERVER_URL,
  webhookUrl: `${DEV_SERVER_URL}/api/line/webhook`,
  lastError: null as string | null,
};

// Initialize Firestore for server-side LINE OA queries
const FALLBACK_FIREBASE_CONFIG = {
  projectId: 'feisty-quasar-q53bd',
  appId: '1:388800385483:web:6cf3b76992d27ecb89a64e',
  apiKey: 'AIzaSyDkCS6LtGhrk0kU8WSfwDcMOv1QXexyrAg',
  authDomain: 'feisty-quasar-q53bd.firebaseapp.com',
  firestoreDatabaseId: 'ai-studio-pawsduty-53653dc7-02ef-4c8b-a749-e32b6a62213f',
  storageBucket: 'feisty-quasar-q53bd.firebasestorage.app',
  messagingSenderId: '388800385483',
};

let serverDb: any = null;
try {
  let firebaseConfig = FALLBACK_FIREBASE_CONFIG;
  let cfgPath = path.join(__dirname, 'firebase-applet-config.json');
  if (!fs.existsSync(cfgPath)) {
    cfgPath = path.join(process.cwd(), 'firebase-applet-config.json');
  }
  if (fs.existsSync(cfgPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  }
  const existingApps = getApps();
  const fApp = existingApps.find(a => a.name === 'server-app') || initializeApp(firebaseConfig, 'server-app');
  serverDb = getFirestore(fApp, firebaseConfig.firestoreDatabaseId);
  console.log('✅ Connected Firestore in server.ts');
} catch (e: any) {
  console.warn('⚠️ Server Firestore init notice:', e.message);
}

app.use(express.json());

// Normalize rewritten paths in serverless environments (if /api prefix is stripped by Vercel rewrite)
app.use((req, res, next) => {
  if (req.url.startsWith('/auth/line/') || req.url.startsWith('/line/')) {
    req.url = '/api' + req.url;
  }
  next();
});

// 1. Enable CORS for dual domain routing (ais-dev Express Container vs ais-pre Static CDN)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Permanent LINE OA configuration store
const DEFAULT_LINE_CONFIG = {
  lineChannelId: '2011986358',
  lineChannelSecret: 'e5b4f8b6ee153630605a8ae570acacd9',
  lineAccessToken:
    'KuXbOznb4aCQvDid2OyJ8F4+k3o221q6owdzubhHzw0hNexdEEw+3bYMMY4EhgjA/UQ6WvBR5/Zyy1WgjZwITGugy5rnBqMnkBBpqJY4NGVHmd1wfImEstyXPUV3blruSEEwn+ywp8PHBBIk0smvYgdB04t89/1O/w1cDnyilFU=',
  liffId: '',
  publicSiteUrl: 'https://bojoiduty.vercel.app',
  basicId: '@090puwgd',
  botDisplayName: 'BojoiDuty',
  addFriendUrl: 'https://line.me/R/ti/p/@090puwgd',
  qrCodeUrl: 'https://qr-official.line.me/gs/M_090puwgd_GW.png',
};

let lineConfig = {
  lineChannelId: process.env.LINE_CHANNEL_ID || DEFAULT_LINE_CONFIG.lineChannelId,
  lineChannelSecret: process.env.LINE_CHANNEL_SECRET || DEFAULT_LINE_CONFIG.lineChannelSecret,
  lineAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || DEFAULT_LINE_CONFIG.lineAccessToken,
  liffId: process.env.VITE_LINE_LIFF_ID || DEFAULT_LINE_CONFIG.liffId,
  publicSiteUrl: process.env.PUBLIC_SITE_URL || DEFAULT_LINE_CONFIG.publicSiteUrl || 'https://bojoiduty.vercel.app',
  basicId: process.env.LINE_BASIC_ID || DEFAULT_LINE_CONFIG.basicId,
  botDisplayName: process.env.LINE_BOT_DISPLAY_NAME || DEFAULT_LINE_CONFIG.botDisplayName,
  addFriendUrl: DEFAULT_LINE_CONFIG.addFriendUrl,
  qrCodeUrl: DEFAULT_LINE_CONFIG.qrCodeUrl,
};

// Automatic Webhook URL Sync Function (PUT https://api.line.me/v2/bot/channel/webhook/endpoint)
async function syncLineWebhookUrl(customHostUrl?: string) {
  if (!lineConfig.lineAccessToken || lineConfig.lineAccessToken.length < 50) {
    console.log('[Auto Webhook Sync Notice]: Valid LINE Access Token not set');
    return false;
  }

  try {
    const host = customHostUrl || tunnelStatus.url || DEV_SERVER_URL;
    const targetWebhookUrl = `${host}/api/line/webhook`;

    console.log(`[LINE Syncing Webhook] -> Registering Webhook URL at LINE Console: ${targetWebhookUrl}`);

    const response = await fetch('https://api.line.me/v2/bot/channel/webhook/endpoint', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${lineConfig.lineAccessToken}`,
      },
      body: JSON.stringify({ endpoint: targetWebhookUrl }),
    });

    if (response.ok) {
      console.log(`✅ LINE Webhook URL automatically updated at LINE Console: ${targetWebhookUrl}`);
      return true;
    } else {
      const errJson = await response.json().catch(() => ({}));
      console.warn('⚠️ LINE Webhook Sync Notice:', errJson?.message || response.statusText);
      return false;
    }
  } catch (err: any) {
    console.warn('⚠️ LINE Webhook Sync Error:', err.message);
    return false;
  }
}

// Helper: Remove invalid or self target user ID from Subscribers
async function removeInvalidLineSubscriber(lineUserId: string) {
  if (!serverDb || !lineUserId) return;
  try {
    const usersSnap = await getDocs(collection(serverDb, 'users'));
    for (const d of usersSnap.docs) {
      const data = d.data();
      if (data.lineUserId === lineUserId) {
        console.log(`[LINE Cleanup]: Removing invalid lineUserId from user ${d.id}`);
        const ref = doc(serverDb, 'users', d.id);
        await setDoc(ref, { ...data, lineUserId: null, lineConnectedAt: null });
      }
    }
  } catch (err: any) {
    console.warn('[LINE Cleanup Error]:', err.message);
  }
}

// API: Get LINE OA Config & Webhook status
app.get(['/api/line/config', '/line/config'], (req, res) => {
  res.json({
    hasChannelId: !!lineConfig.lineChannelId,
    hasChannelSecret: !!lineConfig.lineChannelSecret,
    hasAccessToken: !!lineConfig.lineAccessToken,
    lineChannelId: lineConfig.lineChannelId,
    liffId: lineConfig.liffId,
    publicSiteUrl: lineConfig.publicSiteUrl || '',
    basicId: lineConfig.basicId || '@090puwgd',
    botDisplayName: lineConfig.botDisplayName || 'BojoiDuty',
    addFriendUrl: lineConfig.addFriendUrl || 'https://line.me/R/ti/p/@090puwgd',
    qrCodeUrl: lineConfig.qrCodeUrl || 'https://qr-official.line.me/gs/M_090puwgd_GW.png',
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

app.get(['/api/line/tunnel-status', '/line/tunnel-status'], (req, res) => {
  res.json(tunnelStatus);
});

// API: Update LINE OA Config
app.post(['/api/line/config', '/line/config'], async (req, res) => {
  const { lineChannelId, lineChannelSecret, lineAccessToken, liffId, publicSiteUrl, basicId, botDisplayName } = req.body;

  if (lineChannelId !== undefined) lineConfig.lineChannelId = lineChannelId.trim();
  if (lineChannelSecret !== undefined) lineConfig.lineChannelSecret = lineChannelSecret.trim();
  if (lineAccessToken !== undefined) lineConfig.lineAccessToken = lineAccessToken.trim();
  if (liffId !== undefined) lineConfig.liffId = liffId.trim();
  if (publicSiteUrl !== undefined) lineConfig.publicSiteUrl = publicSiteUrl.trim().replace(/\/$/, '');
  if (basicId !== undefined) {
    lineConfig.basicId = basicId.trim();
    lineConfig.addFriendUrl = `https://line.me/R/ti/p/${encodeURIComponent(lineConfig.basicId)}`;
    lineConfig.qrCodeUrl = `https://qr-official.line.me/gs/M_${lineConfig.basicId.replace(/^@/, '')}_GW.png`;
  }
  if (botDisplayName !== undefined) lineConfig.botDisplayName = botDisplayName.trim();

  // Auto sync webhook URL to LINE Console
  const serverHost = `${req.protocol}://${req.get('host')}`;
  await syncLineWebhookUrl(serverHost);

  res.json({
    success: true,
    message: 'อัปเดตการตั้งค่า LINE OA เรียบร้อยแล้ว',
    configStatus: {
      hasChannelId: !!lineConfig.lineChannelId,
      hasChannelSecret: !!lineConfig.lineChannelSecret,
      hasAccessToken: !!lineConfig.lineAccessToken,
      publicSiteUrl: lineConfig.publicSiteUrl,
      basicId: lineConfig.basicId,
      botDisplayName: lineConfig.botDisplayName,
      addFriendUrl: lineConfig.addFriendUrl,
      qrCodeUrl: lineConfig.qrCodeUrl,
    },
  });
});

app.get(['/api/line/login-url', '/line/login-url'], (req, res) => {
  const reqHost = (req.get('x-forwarded-host') || req.get('host') || '').trim();
  const reqProto = (req.get('x-forwarded-proto') || req.protocol || 'https').trim();
  const serverOrigin = reqHost ? `${reqProto}://${reqHost}` : DEV_SERVER_URL;

  // Determine client origin (where user is clicking from, e.g. Vercel public site)
  let clientOrigin = (req.query.client_origin as string) || (req.get('origin') as string) || serverOrigin;
  clientOrigin = clientOrigin.replace(/\/$/, '');

  // Canonical Callback URL registered in LINE Developers Console
  const callbackBaseOrigin = (lineConfig.publicSiteUrl || 'https://bojoiduty.vercel.app').replace(/\/$/, '');
  const redirectUri = `${callbackBaseOrigin}/api/auth/line/callback`;

  if (!lineConfig.lineChannelId) {
    return res.status(400).json({
      error: 'ยังไม่ได้ตั้งค่า LINE Channel ID กรุณากรอกในระบบตั้งค่า LINE OA',
    });
  }

  // Encode origin AND redirectUri into state so callback can reliably exchange token and redirect back
  const stateObj = {
    origin: clientOrigin,
    redirectUri: redirectUri,
    t: Date.now(),
  };
  const state = Buffer.from(JSON.stringify(stateObj)).toString('base64url');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: lineConfig.lineChannelId,
    redirect_uri: redirectUri,
    state,
    scope: 'profile openid',
    bot_prompt: 'aggressive',
  });

  const loginUrl = `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`;
  const liffUrl = lineConfig.liffId ? `https://liff.line.me/${lineConfig.liffId}` : null;

  res.json({
    loginUrl,
    liffUrl,
    state,
    redirectUri,
    publicOrigin: callbackBaseOrigin,
    basicId: lineConfig.basicId || '@090puwgd',
    botDisplayName: lineConfig.botDisplayName || 'BojoiDuty',
    addFriendUrl: lineConfig.addFriendUrl || 'https://line.me/R/ti/p/@090puwgd',
    qrCodeUrl: lineConfig.qrCodeUrl || 'https://qr-official.line.me/gs/M_090puwgd_GW.png',
  });
});

// API: LINE Login OAuth Callback handler
async function handleLineOAuthCallback(req: express.Request, res: express.Response) {
  try {
    const code = (req.query.code as string) || req.body?.code;
    const state = (req.query.state as string) || req.body?.state;
    const error = req.query.error as string;
    const errorDescription = req.query.error_description as string;

    // Determine client origin and target redirectUri
    const reqHost = req.get('x-forwarded-host') || req.get('host') || '';
    const reqProto = req.get('x-forwarded-proto') || req.protocol || 'https';
    const serverOrigin = reqHost ? `${reqProto}://${reqHost}` : DEV_SERVER_URL;

    let clientOrigin = serverOrigin;
    let tokenRedirectUri = req.body?.redirectUri;

    if (state) {
      try {
        let decodedState = decodeURIComponent(state);
        if (!decodedState.startsWith('{') && !decodedState.startsWith('http')) {
          try {
            decodedState = Buffer.from(state, 'base64url').toString('utf8');
          } catch {}
        }
        if (decodedState.startsWith('{')) {
          const parsed = JSON.parse(decodedState);
          if (parsed.origin) clientOrigin = parsed.origin;
          if (parsed.redirectUri) tokenRedirectUri = parsed.redirectUri;
        } else if (decodedState.startsWith('http://') || decodedState.startsWith('https://')) {
          clientOrigin = decodedState;
        }
      } catch {}
    }

    if (!tokenRedirectUri) {
      const callbackBase = lineConfig.publicSiteUrl || clientOrigin;
      tokenRedirectUri = `${callbackBase.replace(/\/$/, '')}/api/auth/line/callback`;
    }

    // Handle OAuth error return
    if (error || !code) {
      const errMsg = errorDescription || error || 'Missing authorization code';
      if (req.method === 'POST') {
        return res.status(400).json({ error: errMsg });
      }
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head><title>LINE Login Error</title><meta charset="utf-8" /></head>
        <body style="font-family: sans-serif; text-align: center; padding: 40px; background: #fff5f5; color: #9b1c1c;">
          <h2>❌ เข้าสู่ระบบ LINE ไม่สำเร็จ</h2>
          <p>${errMsg}</p>
          <script>
            setTimeout(() => { window.location.href = "${clientOrigin}"; }, 3000);
          </script>
        </body>
        </html>
      `);
    }

    if (!lineConfig.lineChannelId || !lineConfig.lineChannelSecret) {
      const errMsg = 'กรุณาตั้งค่า LINE Channel ID และ Channel Secret ก่อนใช้งาน LINE Login';
      if (req.method === 'POST') return res.status(400).json({ error: errMsg });
      return res.status(400).send(`<h2>❌ ${errMsg}</h2>`);
    }

    // Exchange code for token using the matching redirect_uri
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: tokenRedirectUri,
      client_id: lineConfig.lineChannelId,
      client_secret: lineConfig.lineChannelSecret,
    });

    const tokenResponse = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
      const errData = await tokenResponse.json().catch(() => ({}));
      const errMsg = 'LINE Token Error: ' + (errData.error_description || JSON.stringify(errData));
      if (req.method === 'POST') return res.status(400).json({ error: errMsg });
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head><title>LINE Token Error</title><meta charset="utf-8" /></head>
        <body style="font-family: sans-serif; text-align: center; padding: 40px; background: #fff5f5;">
          <h2 style="color: #9b1c1c;">❌ ${errMsg}</h2>
          <p style="color: #666; font-size: 13px;">Redirect URI used: <code>${tokenRedirectUri}</code></p>
          <p style="font-size: 12px; color: #888;">ระบบจะพากลับหน้าเว็บหลักใน 4 วินาที...</p>
          <script>
            setTimeout(() => { window.location.href = "${clientOrigin}"; }, 4000);
          </script>
        </body>
        </html>
      `);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Get Profile from LINE API
    const profileResponse = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!profileResponse.ok) {
      const errMsg = 'ไม่สามารถดึงข้อมูลโปรไฟล์จาก LINE ได้';
      if (req.method === 'POST') return res.status(400).json({ error: errMsg });
      return res.status(400).send(`<h2>❌ ${errMsg}</h2>`);
    }

    const profileData = await profileResponse.json();

    // Check Friendship Status (whether user has added the LINE OA as a friend)
    let isFriend = false;
    try {
      const friendshipRes = await fetch('https://api.line.me/friendship/v1/status', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (friendshipRes.ok) {
        const friendshipData = await friendshipRes.json();
        isFriend = !!friendshipData.friendFlag;
      }
    } catch (e) {
      console.warn('[LINE Friendship Check Notice]:', e);
    }

    const profile = {
      lineUserId: profileData.userId,
      displayName: profileData.displayName,
      pictureUrl: profileData.pictureUrl,
      statusMessage: profileData.statusMessage,
      isFriend,
    };

    if (req.method === 'POST') {
      return res.json({ success: true, ...profile });
    }

    // HTML response broadcasting results back to client via postMessage, BroadcastChannel, and LocalStorage
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>LINE Login Success</title>
        <meta charset="utf-8" />
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f0fdf4; color: #166534; text-align: center; }
          .card { background: white; padding: 32px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); border: 2px solid #22c55e; max-width: 380px; width: 90%; }
          .icon { font-size: 48px; margin-bottom: 12px; }
          h2 { margin: 0 0 8px; font-size: 20px; color: #15803d; }
          p { margin: 0; font-size: 14px; opacity: 0.85; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">🐶</div>
          <h2>เข้าสู่ระบบ LINE สำเร็จ!</h2>
          <p>ยินดีต้อนรับคุณ ${profile.displayName}</p>
          <p style="margin-top: 12px; font-size: 12px; color: #65a30d;">กำลังนำท่านกลับสู่แอปพลิเคชัน...</p>
        </div>
        <script>
          const profile = ${JSON.stringify(profile)};
          const clientOrigin = "${clientOrigin}";
          const profileParam = encodeURIComponent(JSON.stringify(profile));
          const redirectUrl = clientOrigin.includes('?') 
            ? clientOrigin + '&line_login_profile=' + profileParam 
            : clientOrigin + '/?line_login_profile=' + profileParam;

          // 1. PostMessage to opener window
          try {
            if (window.opener && !window.opener.closed) {
              window.opener.postMessage({ type: 'LINE_LOGIN_SUCCESS', profile }, '*');
            }
          } catch(e){}

          // 2. BroadcastChannel
          try {
            const bc = new BroadcastChannel('line_oauth_channel');
            bc.postMessage({ type: 'LINE_LOGIN_SUCCESS', profile });
            bc.close();
          } catch(e){}

          // 3. LocalStorage
          try {
            localStorage.setItem('line_oauth_success', JSON.stringify({ profile, ts: Date.now() }));
          } catch(e){}

          // Close popup or redirect to clientOrigin with profile parameter
          setTimeout(() => {
            if (window.opener && window.opener !== window) {
              try {
                window.opener.postMessage({ type: 'LINE_LOGIN_SUCCESS', profile }, '*');
                window.close();
              } catch(e) {}
              setTimeout(() => {
                if (!window.closed) {
                  window.location.href = redirectUrl;
                }
              }, 400);
            } else {
              window.location.href = redirectUrl;
            }
          }, 800);
        </script>
      </body>
      </html>
    `);
  } catch (err: any) {
    console.error('LINE Callback Error:', err);
    if (req.method === 'POST') {
      res.status(500).json({ error: err.message || 'Server error during LINE authentication' });
    } else {
      res.status(500).send('Server Error during LINE OAuth Callback');
    }
  }
}

app.get(['/api/auth/line/callback', '/auth/line/callback'], handleLineOAuthCallback);
app.get(['/api/line/callback', '/line/callback'], handleLineOAuthCallback);
app.post(['/api/line/callback', '/line/callback'], handleLineOAuthCallback);

// API: LINE Messaging API Webhook (รองรับการ Verify Webhook จาก LINE Developers Console และการตอบกลับ)
app.get(['/api/line/webhook', '/line/webhook'], (req, res) => {
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
app.post(['/api/line/webhook', '/line/webhook'], async (req, res) => {
  try {
    const events = req.body?.events || [];
    console.log(`[LINE Webhook]: Received ${events.length} event(s)`);

    const hostUrl = `${req.protocol}://${req.get('host')}`;

    for (const event of events) {
      // 1. Follow event (เมื่อเพื่อนกดเพิ่มเพื่อนบอท LINE OA หรือปลดบล็อก)
      if (event.type === 'follow' && event.replyToken && lineConfig.lineAccessToken) {
        const publicSite = lineConfig.publicSiteUrl || 'https://bojoiduty.vercel.app';
        const welcomeText =
          `🐶 สวัสดีครับ! ขอบคุณที่เพิ่มเพื่อน BojoiDuty (@090puwgd)\n\n` +
          `บอทนี้จะคอยส่งการแจ้งเตือนตารางเวรน้องหมาให้คุณโดยอัตโนมัติ (เตือนล่วงหน้า 3 วัน, 1 วัน, และในวันที่มีเวร)\n\n` +
          `👉 เพื่อเชื่อมต่อบัญชีเวรของคุณกับ LINE OA กรุณาเปิดเว็บแล้วกด "Login LINE" หรือ "เชื่อมต่อ LINE":\n` +
          `${publicSite}\n\n` +
          `✨ เมื่อเชื่อมต่อแล้ว คุณจะได้รับการแจ้งเตือนเวรและสามารถพิมพ์สอบถามเวรได้ตลอด 24 ชม. ครับ!`;

        await fetch('https://api.line.me/v2/bot/message/reply', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${lineConfig.lineAccessToken}`,
          },
          body: JSON.stringify({
            replyToken: event.replyToken,
            messages: [{ type: 'text', text: welcomeText, quickReply: getLineQuickReplyItems() }],
          }),
        }).catch((e) => console.warn('[Follow Event Reply Notice]:', e.message));
        continue;
      }

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
                    partText = '☀️ เวรเช้า';
                  } else if (s.eveningUserId === linkedUser.id) {
                    partText = '🌙 เวรเย็น';
                  }

                  const isToday = s.date === todayStr;
                  const isTomorrow = s.date === tomorrowStr;
                  const relativeLabel = isToday ? ' (🚨 วันนี้!)' : isTomorrow ? ' (พรุ่งนี้)' : '';

                  return `${idx + 1}. 📅 ${formatThaiDateDisplay(s.date)}${relativeLabel}\n   📌 ${partText}${s.notes ? `\n   📝 โน้ต: ${s.notes}` : ''}`;
                });

                replyText =
                  `🐶 [BojoiDuty] ตารางเวรที่ใกล้จะถึงของคุณ ${userName}:\n\n` +
                  shiftLines.join('\n\n') +
                  `\n\n✨ สู้ ๆ นะครับน้องหมารออยู่! 🐾`;
              } else {
                replyText =
                  `🐶 [BojoiDuty] สวัสดีครับคุณ ${userName}\n\n` +
                  `🎉 ช่วงนี้คุณยังไม่มีตารางเวรที่ต้องปฏิบัติหน้าที่ครับ`;
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
                teamText;
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

              let notesText = '';
              const notesList = todayShifts.filter((s) => s.notes || s.note).map((s) => s.notes || s.note);
              if (notesList.length > 0) {
                notesText = `\n📝 โน้ตประจำวัน: ${notesList.join(', ')}`;
              }

              replyText =
                `🐶 [BojoiDuty] ตารางเวรประจำวันนี้ (${formatThaiDateDisplay(todayStr)}):\n\n` +
                `☀️ เวรเช้า: ${morningName}\n` +
                `🌙 เวรเย็น: ${eveningName}` +
                bathingText +
                notesText +
                `\n\nอย่าลืมให้อาหารและพาน้องหมาไปวิ่งเล่นด้วยนะครับ 🐕`;
            } else {
              replyText = `🐶 [BojoiDuty] วันนี้ (${formatThaiDateDisplay(todayStr)}) ยังไม่มีผู้จองเวรครับ`;
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

              let notesText = '';
              const notesList = tmrShifts.filter((s) => s.notes || s.note).map((s) => s.notes || s.note);
              if (notesList.length > 0) {
                notesText = `\n📝 โน้ตประจำวัน: ${notesList.join(', ')}`;
              }

              replyText =
                `🐶 [BojoiDuty] ตารางเวรวันพรุ่งนี้ (${formatThaiDateDisplay(tomorrowStr)}):\n\n` +
                `☀️ เวรเช้า: ${morningName}\n` +
                `🌙 เวรเย็น: ${eveningName}` +
                bathingText +
                notesText +
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
                lines.join('\n');
            } else {
              replyText = `📋 [BojoiDuty] ยังไม่มีเวรที่จองไว้ในช่วง 7 วันนี้ครับ`;
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
              `• "ตารางเวร" เพื่อดูเวรของทีมทั้งหมด`;
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

// Helper to resolve LINE User ID from username, nickname, app user ID, or raw LINE ID
async function resolveLineUserIdFromTarget(targetUserId: string): Promise<{ lineUserId: string | null; userName: string; error?: string }> {
  if (!targetUserId) return { lineUserId: null, userName: '', error: 'ไม่ได้ระบุผู้รับ' };

  const cleanTarget = targetUserId.trim();
  if (cleanTarget.startsWith('U') && cleanTarget.length >= 30) {
    return { lineUserId: cleanTarget, userName: cleanTarget };
  }

  if (!serverDb) {
    return { lineUserId: null, userName: cleanTarget, error: 'ระบบเชื่อมต่อฐานข้อมูล Firestore ไม่พร้อมใช้งาน' };
  }

  try {
    const usersSnap = await getDocs(collection(serverDb, 'users'));
    const allUsers = usersSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    const queryClean = cleanTarget.toLowerCase();
    const matchedUser = allUsers.find(
      (u: any) =>
        u.id === cleanTarget ||
        (u.lineUserId && u.lineUserId === cleanTarget) ||
        (u.username && u.username.toLowerCase() === queryClean) ||
        (u.name && u.name.toLowerCase() === queryClean) ||
        (u.nickname && u.nickname.toLowerCase() === queryClean) ||
        (u.username && u.username.toLowerCase().includes(queryClean)) ||
        (u.name && u.name.toLowerCase().includes(queryClean)) ||
        (u.nickname && u.nickname.toLowerCase().includes(queryClean))
    );

    if (matchedUser) {
      const uName = matchedUser.nickname || matchedUser.name || matchedUser.username || cleanTarget;
      if (matchedUser.lineUserId) {
        return { lineUserId: matchedUser.lineUserId, userName: uName };
      } else {
        return {
          lineUserId: null,
          userName: uName,
          error: `ผู้ใช้ "${uName}" ในระบบยังไม่ได้เชื่อมต่อบัญชี LINE OA (ผู้ใช้ต้องล็อกอินผ่าน LINE หรือกดปุ่มผูกบัญชีในโปรไฟล์ก่อน)`,
        };
      }
    }

    return {
      lineUserId: null,
      userName: cleanTarget,
      error: `ไม่พบบัญชีผู้ใช้ชื่อหรือรหัส "${cleanTarget}" ในระบบ`,
    };
  } catch (err: any) {
    return { lineUserId: null, userName: cleanTarget, error: err.message };
  }
}

// API: Send Push Notification via Messaging API
app.post(['/api/line/push-notification', '/line/push-notification'], async (req, res) => {
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
      return res.status(200).json({ success: false, error: 'กรุณาระบุผู้รับการแจ้งเตือน (LINE User ID, ชื่อผู้ใช้ หรือชื่อเล่น)' });
    }

    // Resolve targetUserId to actual LINE User ID if necessary
    const resolved = await resolveLineUserIdFromTarget(targetUserId);
    if (!resolved.lineUserId) {
      return res.status(200).json({
        success: false,
        error: resolved.error || `ไม่สามารถระบุ LINE User ID ของผู้รับ "${targetUserId}" ได้`,
      });
    }

    const recipientLineUserId = resolved.lineUserId;

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
        to: recipientLineUserId,
        messages,
      }),
    });

    if (!pushResponse.ok) {
      const errJson = await pushResponse.json().catch(() => ({}));
      console.warn('[LINE Push API Notice]:', errJson?.message || errJson);
      const errMsg = errJson?.message || JSON.stringify(errJson);
      let userFriendlyNotice = `LINE API Error (${pushResponse.status}): ${errMsg}`;
      if (errMsg.includes('property') && errMsg.includes('to')) {
        userFriendlyNotice += ' (ผู้รับยังไม่ได้กดแอดเพื่อน LINE OA @090puwgd หรือบล็อกบอทอยู่)';
      }
      return res.status(200).json({
        success: false,
        error: userFriendlyNotice,
      });
    }

    res.json({
      success: true,
      message: `ส่งการแจ้งเตือนถึงคุณ ${resolved.userName} เข้า LINE สำเร็จ!`,
      targetUserId: recipientLineUserId,
      recipientName: resolved.userName,
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
app.post(['/api/line/test-notification', '/line/test-notification'], async (req, res) => {
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

    // Get current hour in Thailand Timezone (Asia/Bangkok)
    const nowThai = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    const currentHour = nowThai.getHours();

    // Default scheduled time windows:
    // D0 (Today): Morning 08:00 (7:00 - 10:00)
    // D1 (Tomorrow / 1 day away): Evening 20:00 (18:00 - 22:00)
    // D3 (3 days away): Noon 12:00 (11:00 - 14:00)
    const allTargets = [
      { dateStr: todayStr, code: 'D0', label: '🚨 แจ้งเตือนเวรของคุณวันนี้!', targetHourRange: [7, 11] },
      { dateStr: in1DayStr, code: 'D1', label: '🌙 แจ้งเตือนเวรวันพรุ่งนี้ (อีก 1 วัน)!', targetHourRange: [18, 23] },
      { dateStr: in3DaysStr, code: 'D3', label: '📅 แจ้งเตือนเวรล่วงหน้าอีก 3 วัน!', targetHourRange: [11, 15] },
    ];

    const reminderTargets = forceRun
      ? allTargets
      : allTargets.filter(t => currentHour >= t.targetHourRange[0] && currentHour <= t.targetHourRange[1]);

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
            partText = '☀️🌙 ทั้งเวรเช้าและเวรเย็น';
          } else if (shift.morningUserId === userId) {
            partText = '☀️ เวรเช้า';
          } else if (shift.eveningUserId === userId) {
            partText = '🌙 เวรเย็น';
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

          msg += `\n✨ สู้ ๆ นะครับ น้องหมารออยู่! 🐾`;

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
app.post(['/api/line/trigger-scheduled-reminders', '/line/trigger-scheduled-reminders'], async (req, res) => {
  const force = req.body?.force === true;
  const result = await checkAndSendScheduledReminders(force);
  res.json(result);
});

// Start Express server with Vite in Development mode
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    try {
      const vitePkg = 'vite';
      const { createServer: createViteServer } = await import(/* @vite-ignore */ vitePkg);
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (err: any) {
      console.warn('⚠️ Vite middleware dynamic import notice:', err.message);
    }
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    startTunnel();
    // Run scheduled reminders check once on boot & every 1 hour
    setTimeout(() => checkAndSendScheduledReminders(), 10000);
    setInterval(() => checkAndSendScheduledReminders(), 3600000);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️ Port ${PORT} is already in use. Retrying on port ${Number(PORT) + 1}...`);
      const altPort = Number(PORT) + 1;
      const altServer = app.listen(altPort, () => {
        console.log(`🚀 Server running on alternative port ${altPort}`);
        startTunnel();
        setTimeout(() => checkAndSendScheduledReminders(), 10000);
        setInterval(() => checkAndSendScheduledReminders(), 3600000);
      });
      altServer.on('error', (err2: any) => {
        console.error('Alternative port also in use or failed:', err2);
      });
    } else {
      console.error('Server error:', err);
    }
  });
}

async function startTunnel() {
  try {
    console.log('🚀 Starting Tunnelmole tunnel for LINE Webhook (No 302 Redirects)...');
    const tmPkg = 'tunnelmole';
    const { tunnelmole } = await import(/* @vite-ignore */ tmPkg);
    const url = await tunnelmole({ port: Number(PORT) });
    if (url && typeof url === 'string' && url.startsWith('http')) {
      const httpsUrl = url.startsWith('http:') ? url.replace('http:', 'https:') : url;
      tunnelStatus.active = true;
      tunnelStatus.url = httpsUrl;
      tunnelStatus.webhookUrl = `${httpsUrl}/api/line/webhook`;
      tunnelStatus.lastError = null;

      console.log(`🚀 Tunnelmole active at: ${httpsUrl}`);
      console.log(`🔗 Active LINE Webhook URL: ${tunnelStatus.webhookUrl}`);

      // Auto sync webhook URL with LINE Console
      await syncLineWebhookUrl(httpsUrl);
      return;
    }
  } catch (err: any) {
    console.warn('⚠️ Tunnelmole notice:', err.message || err);
  }

  // Fallback to localtunnel
  startLocalTunnel();
}

async function startLocalTunnel() {
  try {
    const ltPkg = 'localtunnel';
    const { default: localtunnel } = await import(/* @vite-ignore */ ltPkg);
    const tunnel = await localtunnel({
      port: Number(PORT),
      subdomain: LOCALTUNNEL_SUBDOMAIN,
    });

    tunnelStatus.active = true;
    tunnelStatus.url = tunnel.url;
    tunnelStatus.webhookUrl = `${tunnel.url}/api/line/webhook`;
    tunnelStatus.lastError = null;

    console.log(`🚀 Localtunnel active at: ${tunnel.url}`);
    console.log(`🔗 LINE Webhook URL: ${tunnelStatus.webhookUrl}`);

    await syncLineWebhookUrl(tunnel.url);

    tunnel.on('close', () => {
      console.log('⚠️ Localtunnel closed. Reconnecting in 5 seconds...');
      tunnelStatus.active = false;
      setTimeout(startTunnel, 5000);
    });

    tunnel.on('error', (err: any) => {
      console.warn('⚠️ Localtunnel error:', err.message || err);
      tunnelStatus.active = false;
      tunnelStatus.lastError = err.message || String(err);
      setTimeout(startTunnel, 5000);
    });
  } catch (err: any) {
    console.warn('⚠️ Failed to start localtunnel:', err.message || err);
    tunnelStatus.active = false;
    tunnelStatus.lastError = err.message || String(err);
    setTimeout(startTunnel, 5000);
  }
}

// Global error handler so any unhandled route error responds with JSON instead of crashing Vercel function
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Express Server Global Error:', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({
    error: 'Internal server error',
    message: err?.message || String(err),
  });
});

const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NOW_REGION);
if (!isServerless) {
  startServer();
}

export default app;

