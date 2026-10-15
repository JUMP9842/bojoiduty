// Shared utility for Vercel Serverless Functions & Express Server

export const DEFAULT_LINE_CONFIG = {
  lineChannelId: '2011986358',
  lineChannelSecret: 'e5b4f8b6ee153630605a8ae570acacd9',
  lineAccessToken:
    'KuXbOznb4aCQvDid2OyJ8F4+k3o221q6owdzubhHzw0hNexdEEw+3bYMMY4EhgjA/UQ6WvBR5/Zyy1WgjZwITGugy5rnBqMnkBBpqJY4NGVHmd1wfImEstyXPUV3blruSEEwn+ywp8PHBBIk0smvYgdB04t89/1O/w1cDnyilFU=',
  liffId: '',
  publicSiteUrl: 'https://bojoiduty.vercel.app',
};

let runtimeLineConfig = { ...DEFAULT_LINE_CONFIG };

export function getLineConfig() {
  return {
    lineChannelId: process.env.LINE_CHANNEL_ID || runtimeLineConfig.lineChannelId,
    lineChannelSecret: process.env.LINE_CHANNEL_SECRET || runtimeLineConfig.lineChannelSecret,
    lineAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || runtimeLineConfig.lineAccessToken,
    liffId: process.env.VITE_LINE_LIFF_ID || runtimeLineConfig.liffId,
    publicSiteUrl: process.env.PUBLIC_SITE_URL || runtimeLineConfig.publicSiteUrl || 'https://bojoiduty.vercel.app',
  };
}

export function updateLineConfig(updates: Partial<typeof DEFAULT_LINE_CONFIG>) {
  runtimeLineConfig = { ...runtimeLineConfig, ...updates };
  return runtimeLineConfig;
}

// Helper to safely send response whether Express or Vercel Serverless Function
export function sendJson(res: any, status: number, data: any) {
  if (typeof res.status === 'function') {
    res.status(status);
    if (typeof res.json === 'function') {
      return res.json(data);
    }
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(data));
  }
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify(data));
}

export function sendHtml(res: any, status: number, html: string) {
  if (typeof res.status === 'function') {
    res.status(status);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    if (typeof res.send === 'function') {
      return res.send(html);
    }
    return res.end(html);
  }
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.end(html);
}

// 1. LINE Login OAuth Callback Handler
export async function handleLineOAuthCallback(req: any, res: any) {
  try {
    const query = req.query || {};
    const body = req.body || {};
    const code = (query.code as string) || body.code;
    const state = (query.state as string) || body.state;
    const error = query.error as string;
    const errorDescription = query.error_description as string;

    const reqHost = req.headers?.['x-forwarded-host'] || req.headers?.host || '';
    const reqProto = req.headers?.['x-forwarded-proto'] || 'https';
    const serverOrigin = reqHost ? `${reqProto}://${reqHost}` : 'https://bojoiduty.vercel.app';

    let clientOrigin = serverOrigin;
    let tokenRedirectUri = body.redirectUri;

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

    const config = getLineConfig();
    if (!tokenRedirectUri) {
      const callbackBase = config.publicSiteUrl || clientOrigin;
      tokenRedirectUri = `${callbackBase.replace(/\/$/, '')}/api/auth/line/callback`;
    }

    // Handle OAuth error return
    if (error || !code) {
      const errMsg = errorDescription || error || 'Missing authorization code';
      if (req.method === 'POST') {
        return sendJson(res, 400, { error: errMsg });
      }
      return sendHtml(
        res,
        400,
        `<!DOCTYPE html>
<html>
<head><title>LINE Login Error</title><meta charset="utf-8" /></head>
<body style="font-family: sans-serif; text-align: center; padding: 40px; background: #fff5f5; color: #9b1c1c;">
  <h2>❌ เข้าสู่ระบบ LINE ไม่สำเร็จ</h2>
  <p>${errMsg}</p>
  <script>
    setTimeout(() => { window.location.href = "${clientOrigin}"; }, 3000);
  </script>
</body>
</html>`
      );
    }

    if (!config.lineChannelId || !config.lineChannelSecret) {
      const errMsg = 'กรุณาตั้งค่า LINE Channel ID และ Channel Secret ก่อนใช้งาน LINE Login';
      if (req.method === 'POST') return sendJson(res, 400, { error: errMsg });
      return sendHtml(res, 400, `<h2>❌ ${errMsg}</h2>`);
    }

    // Exchange code for token using the matching redirect_uri
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: tokenRedirectUri,
      client_id: config.lineChannelId,
      client_secret: config.lineChannelSecret,
    });

    const tokenResponse = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
      const errData = await tokenResponse.json().catch(() => ({}));
      const errMsg = 'LINE Token Error: ' + (errData.error_description || JSON.stringify(errData));
      if (req.method === 'POST') return sendJson(res, 400, { error: errMsg });
      return sendHtml(
        res,
        400,
        `<!DOCTYPE html>
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
</html>`
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Get Profile from LINE API
    const profileResponse = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!profileResponse.ok) {
      const errMsg = 'ไม่สามารถดึงข้อมูลโปรไฟล์จาก LINE ได้';
      if (req.method === 'POST') return sendJson(res, 400, { error: errMsg });
      return sendHtml(res, 400, `<h2>❌ ${errMsg}</h2>`);
    }

    const profileData = await profileResponse.json();
    const profile = {
      lineUserId: profileData.userId,
      displayName: profileData.displayName,
      pictureUrl: profileData.pictureUrl,
      statusMessage: profileData.statusMessage,
    };

    if (req.method === 'POST') {
      return sendJson(res, 200, { success: true, ...profile });
    }

    // HTML response broadcasting results back to client via postMessage, BroadcastChannel, and LocalStorage
    return sendHtml(
      res,
      200,
      `<!DOCTYPE html>
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

    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: 'LINE_LOGIN_SUCCESS', profile }, '*');
      }
    } catch(e){}

    try {
      const bc = new BroadcastChannel('line_oauth_channel');
      bc.postMessage({ type: 'LINE_LOGIN_SUCCESS', profile });
      bc.close();
    } catch(e){}

    try {
      localStorage.setItem('line_oauth_success', JSON.stringify({ profile, ts: Date.now() }));
    } catch(e){}

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
</html>`
    );
  } catch (err: any) {
    console.error('LINE Callback Error:', err);
    if (req.method === 'POST') {
      return sendJson(res, 500, { error: err.message || 'Server error during LINE authentication' });
    }
    return sendHtml(res, 500, 'Server Error during LINE OAuth Callback');
  }
}

// 2. LINE Login Authorize URL Generator
export function handleLineLoginUrl(req: any, res: any) {
  try {
    const config = getLineConfig();
    const query = req.query || {};
    const reqHost = (req.headers?.['x-forwarded-host'] || req.headers?.host || '').trim();
    const reqProto = (req.headers?.['x-forwarded-proto'] || 'https').trim();
    const serverOrigin = reqHost ? `${reqProto}://${reqHost}` : 'https://bojoiduty.vercel.app';

    let clientOrigin = (query.client_origin as string) || (req.headers?.origin as string) || serverOrigin;
    clientOrigin = clientOrigin.replace(/\/$/, '');

    // Canonical Callback URL registered in LINE Developers Console
    const callbackBaseOrigin = (config.publicSiteUrl || 'https://bojoiduty.vercel.app').replace(/\/$/, '');
    const redirectUri = `${callbackBaseOrigin}/api/auth/line/callback`;

    if (!config.lineChannelId) {
      return sendJson(res, 400, {
        error: 'ยังไม่ได้ตั้งค่า LINE Channel ID กรุณากรอกในระบบตั้งค่า LINE OA',
      });
    }

    const stateObj = {
      origin: clientOrigin,
      redirectUri: redirectUri,
      t: Date.now(),
    };
    const state = Buffer.from(JSON.stringify(stateObj)).toString('base64url');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.lineChannelId,
      redirect_uri: redirectUri,
      state,
      scope: 'profile openid',
    });

    const loginUrl = `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`;
    const liffUrl = config.liffId ? `https://liff.line.me/${config.liffId}` : null;

    return sendJson(res, 200, {
      loginUrl,
      liffUrl,
      state,
      redirectUri,
      publicOrigin: callbackBaseOrigin,
    });
  } catch (err: any) {
    return sendJson(res, 500, { error: err.message || 'Failed to generate login URL' });
  }
}

// 3. LINE Config Handler
export function handleLineConfig(req: any, res: any) {
  const config = getLineConfig();

  if (req.method === 'POST') {
    const { lineChannelId, lineChannelSecret, lineAccessToken, liffId, publicSiteUrl } = req.body || {};
    const updates: any = {};
    if (lineChannelId !== undefined) updates.lineChannelId = lineChannelId.trim();
    if (lineChannelSecret !== undefined) updates.lineChannelSecret = lineChannelSecret.trim();
    if (lineAccessToken !== undefined) updates.lineAccessToken = lineAccessToken.trim();
    if (liffId !== undefined) updates.liffId = liffId.trim();
    if (publicSiteUrl !== undefined) updates.publicSiteUrl = publicSiteUrl.trim().replace(/\/$/, '');

    updateLineConfig(updates);
    return sendJson(res, 200, {
      success: true,
      message: 'อัปเดตการตั้งค่า LINE OA เรียบร้อยแล้ว',
      configStatus: {
        hasChannelId: !!config.lineChannelId,
        hasChannelSecret: !!config.lineChannelSecret,
        hasAccessToken: !!config.lineAccessToken,
        publicSiteUrl: config.publicSiteUrl,
      },
    });
  }

  return sendJson(res, 200, {
    hasChannelId: !!config.lineChannelId,
    hasChannelSecret: !!config.lineChannelSecret,
    hasAccessToken: !!config.lineAccessToken,
    lineChannelId: config.lineChannelId,
    liffId: config.liffId,
    publicSiteUrl: config.publicSiteUrl || '',
    webhookUrl: `${config.publicSiteUrl}/api/line/webhook`,
    accessTokenLength: config.lineAccessToken ? config.lineAccessToken.length : 0,
    lineChannelSecretMasked: config.lineChannelSecret
      ? config.lineChannelSecret.slice(0, 4) + '••••••••' + config.lineChannelSecret.slice(-4)
      : '',
    lineAccessTokenMasked: config.lineAccessToken
      ? config.lineAccessToken.slice(0, 8) + '••••••••' + config.lineAccessToken.slice(-6)
      : '',
  });
}

// Initialize Firestore for Vercel / Express serverless calls
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';

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
  const existingApps = getApps();
  const fApp = existingApps.find((a) => a.name === 'server-app') || initializeApp(FALLBACK_FIREBASE_CONFIG, 'server-app');
  serverDb = getFirestore(fApp, FALLBACK_FIREBASE_CONFIG.firestoreDatabaseId);
} catch (e: any) {
  console.warn('[Shared Firestore Init Notice]:', e.message);
}

export function getLineQuickReplyItems() {
  return {
    items: [
      { type: 'action', action: { type: 'message', label: '📅 เวรของฉัน', text: 'เวรของฉัน' } },
      { type: 'action', action: { type: 'message', label: '☀️ เวรวันนี้', text: 'เวรวันนี้' } },
      { type: 'action', action: { type: 'message', label: '🌙 เวรพรุ่งนี้', text: 'เวรพรุ่งนี้' } },
      { type: 'action', action: { type: 'message', label: '📋 ตารางเวร 7 วัน', text: 'ตารางเวร' } },
    ],
  };
}

export function formatThaiDateDisplay(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const y = parseInt(parts[0], 10) + 543;
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  const thaiMonths = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];
  return `${d} ${thaiMonths[m - 1]} ${y}`;
}

// Helper to resolve LINE User ID from username, nickname, app user ID, or raw LINE ID
async function resolveLineUserIdFromTarget(targetUserId: string): Promise<{ lineUserId: string | null; userName: string; error?: string }> {
  if (!targetUserId) return { lineUserId: null, userName: '', error: 'ไม่ได้ระบุผู้รับ' };
  
  const cleanTarget = targetUserId.trim();
  // If already a valid LINE User ID format
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

// 4. Push Notification Handler
export async function handleLinePushNotification(req: any, res: any) {
  try {
    let body = req.body || {};
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {}
    }

    // Extract target user ID supporting both { to }, { userId }, { lineUserId }, { targetUserId }
    const rawTo = (
      body.to ||
      body.userId ||
      body.lineUserId ||
      body.targetUserId ||
      ''
    ).trim();

    // Extract message supporting both { messages }, { message }, { messageText }, { text }
    const rawMessage = body.messages ?? body.message ?? body.messageText ?? body.text;

    const config = getLineConfig();

    const envToken = (process.env.LINE_CHANNEL_ACCESS_TOKEN || '').trim();
    const envViteToken = (process.env.VITE_LINE_CHANNEL_ACCESS_TOKEN || '').trim();

    const token = (
      body.token ||
      body.channelAccessToken ||
      body.lineAccessToken ||
      envToken ||
      envViteToken ||
      config.lineAccessToken ||
      DEFAULT_LINE_CONFIG.lineAccessToken ||
      ''
    ).trim();

    if (!token) {
      return sendJson(res, 400, {
        error: 'ไม่พบ LINE Channel Access Token ในระบบ (.env หรือการตั้งค่า Backend)',
      });
    }

    if (!rawTo) {
      return sendJson(res, 400, {
        error: 'ไม่พบรหัส LINE User ID (to หรือ userId) ของผู้รับ',
      });
    }

    let recipientLineUserId = rawTo;
    if (!(rawTo.startsWith('U') && rawTo.length >= 30)) {
      try {
        const resolved = await resolveLineUserIdFromTarget(rawTo);
        if (resolved?.lineUserId) {
          recipientLineUserId = resolved.lineUserId;
        }
      } catch (e) {
        console.warn('[Shared Line Target Resolution Warning]:', e);
      }
    }

    if (!recipientLineUserId || !recipientLineUserId.startsWith('U')) {
      return sendJson(res, 400, {
        error: `ผู้ใช้ "${rawTo}" ยังไม่ได้ผูกบัญชี LINE OA (ไม่พบรหัส LINE User ID ที่ขึ้นต้นด้วย U)`,
      });
    }

    let messages: any[];
    if (Array.isArray(rawMessage)) {
      messages = rawMessage;
    } else if (typeof rawMessage === 'object' && rawMessage !== null && rawMessage.type) {
      messages = [rawMessage];
    } else {
      const textVal = rawMessage !== undefined && rawMessage !== null ? String(rawMessage) : '🐶 [BojoiDuty] คุณมีแจ้งเตือนเวรใหม่';
      messages = [{ type: 'text', text: textVal }];
    }

    console.log(`[LINE Push Direct Dispatch] Target: ${recipientLineUserId}`);

    const pushResponse = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: recipientLineUserId,
        messages,
      }),
    });

    const resText = await pushResponse.text();
    let resData: any = {};
    try {
      resData = resText ? JSON.parse(resText) : {};
    } catch {
      resData = { message: resText };
    }

    if (!pushResponse.ok) {
      const lineError = resData.message || resData.error || resText || `LINE API ตอบกลับสถานะ ${pushResponse.status}`;
      return sendJson(res, pushResponse.status || 400, {
        error: `เกิดข้อผิดพลาดจาก LINE Messaging API (${pushResponse.status}): ${lineError}`,
        details: resData,
      });
    }

    return sendJson(res, 200, {
      success: true,
      message: `ส่งการแจ้งเตือนเข้า LINE สำเร็จ!`,
      data: resData,
      targetUserId: recipientLineUserId,
    });
  } catch (err: any) {
    console.error('[LINE Push Shared Exception]:', err);
    return sendJson(res, 500, {
      error: err?.message || String(err) || 'Internal Server Error in LINE Push Handler',
    });
  }
}

// Memory log for sent reminders
const sentRemindersLog = new Set<string>();

function getDateNDaysAway(n: number): string {
  const date = new Date();
  date.setDate(date.getDate() + n);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// 5. Scheduled Reminders Handler
export async function handleLineTriggerScheduledReminders(req: any, res: any) {
  try {
    const config = getLineConfig();
    const body = req.body || {};
    const forceRun = body.force === true;

    if (!serverDb || !config.lineAccessToken || config.lineAccessToken.length < 50) {
      return sendJson(res, 200, {
        success: false,
        sentCount: 0,
        reason: 'Firestore หรือ LINE Access Token ยังไม่พร้อมใช้งาน',
      });
    }

    const todayStr = getDateNDaysAway(0);
    const in1DayStr = getDateNDaysAway(1);
    const in3DaysStr = getDateNDaysAway(3);

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

    const nowThai = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    const currentHour = nowThai.getHours();

    const allTargets = [
      { dateStr: todayStr, code: 'D0', label: '🚨 แจ้งเตือนเวรของคุณวันนี้!', targetHourRange: [7, 11] },
      { dateStr: in1DayStr, code: 'D1', label: '🌙 แจ้งเตือนเวรวันพรุ่งนี้ (อีก 1 วัน)!', targetHourRange: [18, 23] },
      { dateStr: in3DaysStr, code: 'D3', label: '📅 แจ้งเตือนเวรล่วงหน้าอีก 3 วัน!', targetHourRange: [11, 15] },
    ];

    const reminderTargets = forceRun
      ? allTargets
      : allTargets.filter((t) => currentHour >= t.targetHourRange[0] && currentHour <= t.targetHourRange[1]);

    let sentCount = 0;
    const results: string[] = [];

    for (const target of reminderTargets) {
      const targetShifts = allShifts.filter((s) => s.date === target.dateStr);

      for (const shift of targetShifts) {
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
            continue;
          }

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

          if (target.code === 'D0') {
            msg += `\n━━━━━━━━━━━━━━━\n📢 [ประกาศ & ข่าวสารสำคัญประจำวันนี้]:\n${announcementText}\n━━━━━━━━━━━━━━━\n`;
          }

          msg += `\n✨ สู้ ๆ นะครับ น้องหมารออยู่! 🐾`;

          try {
            const pushRes = await fetch('https://api.line.me/v2/bot/message/push', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${config.lineAccessToken}`,
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
            }
          } catch (pushErr: any) {
            console.warn(`[Scheduled Push Error]: ${logKey}`, pushErr.message);
          }
        }
      }
    }

    return sendJson(res, 200, { success: true, sentCount, results });
  } catch (err: any) {
    return sendJson(res, 200, { success: false, error: err.message, sentCount: 0 });
  }
}
