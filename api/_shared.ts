// Shared utility for Vercel Serverless Functions & Express Server
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

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

// Safe json response helper ensuring 200 HTTP status to prevent Vercel 500 error page interception
export function sendJson(res: any, status: number, data: any) {
  try {
    if (res && typeof res.setHeader === 'function') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
    if (res && typeof res.status === 'function') {
      res.status(200);
      if (typeof res.json === 'function') {
        return res.json(data);
      }
      return res.end(JSON.stringify(data));
    }
    if (res) {
      res.statusCode = 200;
      return res.end(JSON.stringify(data));
    }
  } catch (e) {
    try {
      if (res) {
        res.statusCode = 200;
        res.end(JSON.stringify(data));
      }
    } catch {}
  }
}

// Safe html response helper ensuring 200 HTTP status to prevent Vercel 500 error page interception
export function sendHtml(res: any, status: number, html: string) {
  try {
    if (res && typeof res.setHeader === 'function') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    if (res && typeof res.status === 'function') {
      res.status(200);
      if (typeof res.send === 'function') {
        return res.send(html);
      }
      return res.end(html);
    }
    if (res) {
      res.statusCode = 200;
      return res.end(html);
    }
  } catch (e) {
    try {
      if (res) {
        res.statusCode = 200;
        res.end(html);
      }
    } catch {}
  }
}

// 1. LINE Login OAuth Callback Handler
export async function handleLineOAuthCallback(req: any, res: any) {
  try {
    const query = req?.query || {};
    const body = req?.body || {};

    const code = typeof query.code === 'string' ? query.code : Array.isArray(query.code) ? query.code[0] : body.code;
    const state = typeof query.state === 'string' ? query.state : Array.isArray(query.state) ? query.state[0] : body.state;
    const error = typeof query.error === 'string' ? query.error : body.error;
    const errorDescription = typeof query.error_description === 'string' ? query.error_description : body.error_description;

    const reqHost = (req?.headers?.['x-forwarded-host'] || req?.headers?.host || '').trim();
    const reqProto = (req?.headers?.['x-forwarded-proto'] || 'https').trim();
    const serverOrigin = reqHost ? `${reqProto}://${reqHost}` : 'https://bojoiduty.vercel.app';

    let clientOrigin = serverOrigin;
    let tokenRedirectUri = typeof body.redirectUri === 'string' ? body.redirectUri : '';

    if (state && typeof state === 'string') {
      try {
        let decodedState = '';
        try {
          decodedState = decodeURIComponent(state);
        } catch {
          decodedState = state;
        }

        if (!decodedState.startsWith('{') && !decodedState.startsWith('http')) {
          try {
            decodedState = Buffer.from(state, 'base64url').toString('utf8');
          } catch {
            try {
              decodedState = Buffer.from(state, 'base64').toString('utf8');
            } catch {}
          }
        }

        if (decodedState.startsWith('{')) {
          const parsed = JSON.parse(decodedState);
          if (parsed.origin) clientOrigin = parsed.origin;
          if (parsed.redirectUri) tokenRedirectUri = parsed.redirectUri;
        } else if (decodedState.startsWith('http://') || decodedState.startsWith('https://')) {
          clientOrigin = decodedState;
        }
      } catch (e) {
        console.warn('[LINE Callback State Warning]:', e);
      }
    }

    const config = getLineConfig();
    if (!tokenRedirectUri) {
      tokenRedirectUri = 'https://bojoiduty.vercel.app/api/auth/line/callback';
    }

    // Handle OAuth error or missing code
    if (error || !code) {
      const errMsg = errorDescription || error || 'Missing authorization code in LINE request';
      if (req?.method === 'POST') {
        return sendJson(res, 200, { success: false, error: errMsg });
      }
      return sendHtml(
        res,
        200,
        `<!DOCTYPE html>
<html>
<head><title>LINE Login Error</title><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 40px; background: #fff5f5; color: #9b1c1c;">
  <h2>❌ เข้าสู่ระบบ LINE ไม่สำเร็จ</h2>
  <p>${errMsg}</p>
  <p style="font-size: 13px; color: #666; margin-top: 20px;">กำลังพาท่านกลับสู่แอปพลิเคชัน...</p>
  <script>
    setTimeout(() => { window.location.href = "${clientOrigin}"; }, 3000);
  </script>
</body>
</html>`
      );
    }

    if (!config.lineChannelId || !config.lineChannelSecret) {
      const errMsg = 'กรุณาตั้งค่า LINE Channel ID และ Channel Secret ในระบบก่อนใช้งาน LINE Login';
      if (req?.method === 'POST') return sendJson(res, 200, { success: false, error: errMsg });
      return sendHtml(res, 200, `<h2>❌ ${errMsg}</h2>`);
    }

    // Exchange code for token
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code: String(code),
      redirect_uri: tokenRedirectUri,
      client_id: String(config.lineChannelId),
      client_secret: String(config.lineChannelSecret),
    });

    const tokenResponse = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
      const errData = await tokenResponse.json().catch(() => ({}));
      const errMsg = 'LINE Token Error: ' + (errData.error_description || errData.error || JSON.stringify(errData));

      if (req?.method === 'POST') return sendJson(res, 200, { success: false, error: errMsg });

      return sendHtml(
        res,
        200,
        `<!DOCTYPE html>
<html>
<head><title>LINE Token Error</title><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 40px; background: #fff5f5;">
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
      if (req?.method === 'POST') return sendJson(res, 200, { success: false, error: errMsg });
      return sendHtml(res, 200, `<h2>❌ ${errMsg}</h2>`);
    }

    const profileData = await profileResponse.json();
    const profile = {
      lineUserId: profileData.userId,
      displayName: profileData.displayName,
      pictureUrl: profileData.pictureUrl,
      statusMessage: profileData.statusMessage,
    };

    if (req?.method === 'POST') {
      return sendJson(res, 200, { success: true, ...profile });
    }

    return sendHtml(
      res,
      200,
      `<!DOCTYPE html>
<html>
<head>
  <title>LINE Login Success</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
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
    <p>ยินดีต้อนรับคุณ ${profile.displayName || ''}</p>
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
    if (req?.method === 'POST') {
      return sendJson(res, 200, { success: false, error: err?.message || 'Server error during LINE authentication' });
    }
    return sendHtml(res, 200, `<!DOCTYPE html><html><body><h2>❌ เกิดข้อผิดพลาดในระบบ LINE OAuth Callback</h2><p>${err?.message || 'Server error'}</p></body></html>`);
  }
}

// 2. LINE Login Authorize URL Generator
export function handleLineLoginUrl(req: any, res: any) {
  try {
    const config = getLineConfig();
    const query = req?.query || {};
    const reqHost = (req?.headers?.['x-forwarded-host'] || req?.headers?.host || '').trim();
    const reqProto = (req?.headers?.['x-forwarded-proto'] || 'https').trim();
    const serverOrigin = reqHost ? `${reqProto}://${reqHost}` : 'https://bojoiduty.vercel.app';

    let clientOrigin = (query.client_origin as string) || (req?.headers?.origin as string) || serverOrigin;
    clientOrigin = clientOrigin.replace(/\/$/, '');

    const redirectUri = 'https://bojoiduty.vercel.app/api/auth/line/callback';

    if (!config.lineChannelId) {
      return sendJson(res, 200, {
        success: false,
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
      success: true,
      loginUrl,
      liffUrl,
      state,
      redirectUri,
      publicOrigin: 'https://bojoiduty.vercel.app',
    });
  } catch (err: any) {
    return sendJson(res, 200, { success: false, error: err?.message || 'Failed to generate login URL' });
  }
}

// 3. LINE Config Handler
export function handleLineConfig(req: any, res: any) {
  try {
    const config = getLineConfig();

    if (req?.method === 'POST') {
      const { lineChannelId, lineChannelSecret, lineAccessToken, liffId, publicSiteUrl } = req.body || {};
      const updates: any = {};
      if (lineChannelId !== undefined) updates.lineChannelId = String(lineChannelId).trim();
      if (lineChannelSecret !== undefined) updates.lineChannelSecret = String(lineChannelSecret).trim();
      if (lineAccessToken !== undefined) updates.lineAccessToken = String(lineAccessToken).trim();
      if (liffId !== undefined) updates.liffId = String(liffId).trim();
      if (publicSiteUrl !== undefined) updates.publicSiteUrl = String(publicSiteUrl).trim().replace(/\/$/, '');

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
      success: true,
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
  } catch (err: any) {
    return sendJson(res, 200, { success: false, error: err?.message || String(err) });
  }
}

const FALLBACK_FIREBASE_CONFIG = {
  projectId: 'feisty-quasar-q53bd',
  appId: '1:388800385483:web:6cf3b76992d27ecb89a64e',
  apiKey: 'AIzaSyDkCS6LtGhrk0kU8WSfwDcMOv1QXexyrAg',
  authDomain: 'feisty-quasar-q53bd.firebaseapp.com',
  firestoreDatabaseId: 'ai-studio-pawsduty-53653dc7-02ef-4c8b-a749-e32b6a62213f',
  storageBucket: 'feisty-quasar-q53bd.firebasestorage.app',
  messagingSenderId: '388800385483',
};

let sharedDb: any = null;
export function getSharedFirestore() {
  if (!sharedDb) {
    try {
      const existing = getApps();
      const fApp = existing.find((a) => a.name === 'shared-app') || existing[0] || initializeApp(FALLBACK_FIREBASE_CONFIG, 'shared-app');
      sharedDb = getFirestore(fApp, FALLBACK_FIREBASE_CONFIG.firestoreDatabaseId);
    } catch (e) {
      console.warn('[Shared Firestore Init Notice]:', e);
    }
  }
  return sharedDb;
}

// Fetch all documents from a Firestore collection using Firebase SDK
export async function fetchCollectionFromFirestore(collectionName: string): Promise<any[]> {
  try {
    const db = getSharedFirestore();
    if (db) {
      const snap = await getDocs(collection(db, collectionName));
      return snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    }
  } catch (err: any) {
    console.warn(`[Firestore SDK ${collectionName} Warning]:`, err?.message || err);
  }
  return [];
}

const sentRemindersLog = new Set<string>();
const sentAnnouncementLocks = new Set<string>();

// Atomic lock and persistence helper in Firestore
async function acquireReminderLockFirestore(logKey: string): Promise<boolean> {
  if (!logKey) return false;
  if (sentRemindersLog.has(logKey)) return false;
  try {
    const db = getSharedFirestore();
    if (!db) {
      sentRemindersLog.add(logKey);
      return true;
    }
    const docRef = doc(db, 'reminder_logs', logKey);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      sentRemindersLog.add(logKey);
      return false;
    }
    await setDoc(docRef, { logKey, sentAt: new Date().toISOString() });
    sentRemindersLog.add(logKey);
    return true;
  } catch (e) {
    console.warn('[Firestore Reminder Lock Error]:', e);
    if (sentRemindersLog.has(logKey)) return false;
    sentRemindersLog.add(logKey);
    return true;
  }
}

// Helper to patch Firestore document fields
export async function patchFirestoreDoc(collectionName: string, id: string, fields: Record<string, any>): Promise<boolean> {
  try {
    const db = getSharedFirestore();
    if (db) {
      const docRef = doc(db, collectionName, id);
      await setDoc(docRef, fields, { merge: true });
      return true;
    }
  } catch (err: any) {
    console.warn(`[Firestore PATCH ${collectionName}/${id} Warning]:`, err?.message || err);
  }
  return false;
}

// Helper to delete Firestore document
export async function deleteFirestoreDoc(collectionName: string, id: string): Promise<boolean> {
  try {
    sentAnnouncementLocks.delete(id);
    const db = getSharedFirestore();
    if (db) {
      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);
      return true;
    }
  } catch (err: any) {
    console.warn(`[Firestore DELETE ${collectionName}/${id} Warning]:`, err?.message || err);
  }
  return false;
}

// Acquire lock document for announcement LINE notification
export async function acquireAnnouncementLineLock(
  logId: string,
  fields: Record<string, any>
): Promise<{ acquired: boolean; reason?: string }> {
  try {
    if (sentAnnouncementLocks.has(logId)) {
      return { acquired: false, reason: 'already_sent_mem' };
    }

    const db = getSharedFirestore();
    if (!db) {
      sentAnnouncementLocks.add(logId);
      return { acquired: true };
    }

    const docRef = doc(db, 'announcement_line_logs', logId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      sentAnnouncementLocks.add(logId);
      return { acquired: false, reason: 'already_sent' };
    }

    await setDoc(docRef, fields);
    sentAnnouncementLocks.add(logId);
    return { acquired: true };
  } catch (err: any) {
    console.warn('[Announcement Line Lock Exception]', logId, err?.message || String(err));
    if (sentAnnouncementLocks.has(logId)) return { acquired: false, reason: 'already_sent_mem' };
    sentAnnouncementLocks.add(logId);
    return { acquired: true };
  }
}

// Get unique recipient lineUserIds from users list
export function getAnnouncementLineRecipients(users: any[]): string[] {
  const lineUserIds = new Set<string>();
  for (const u of users) {
    const uid = (u.lineUserId || '').trim();
    if (uid.startsWith('U') && uid.length >= 30 && u.lineNotificationEnabled !== false) {
      lineUserIds.add(uid);
    }
  }
  return Array.from(lineUserIds);
}

// Format ISO string to Thai date and time in Asia/Bangkok timezone
export function formatThaiDateTimeBangkok(iso?: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const parts = new Intl.DateTimeFormat('th-TH', {
      timeZone: 'Asia/Bangkok',
      day: 'numeric',
      month: 'short',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(d);

    const day = parts.find((p) => p.type === 'day')?.value || '';
    const month = parts.find((p) => p.type === 'month')?.value || '';
    const year = parts.find((p) => p.type === 'year')?.value || '';
    const hour = parts.find((p) => p.type === 'hour')?.value || '00';
    const minute = parts.find((p) => p.type === 'minute')?.value || '00';
    return `${day} ${month} ${year} เวลา ${hour}:${minute} น.`;
  } catch {
    return iso;
  }
}

// Build LINE announcement message
export function buildAnnouncementLineMessage(ann: any, kind: 'publish' | 'scheduled', config: any) {
  const header = kind === 'publish' ? '📢 ประกาศใหม่ [BojoiDuty]' : '⏰ เตือนประกาศ [BojoiDuty]';
  const lines: string[] = [header];

  if (ann.badge && typeof ann.badge === 'string' && ann.badge.trim()) {
    lines.push(`🏷 ${ann.badge.trim()}`);
  }

  lines.push('');
  lines.push(ann.title || 'ประกาศ');
  lines.push('');

  let content = (ann.content || '').trim();
  if (content.length > 900) {
    content = content.slice(0, 900) + '…';
  }
  lines.push(content);
  lines.push('');

  lines.push(`🗓 วันที่เกี่ยวข้อง: ${formatThaiDateDisplay(ann.date)}`);
  if (ann.endAt) {
    lines.push(`⌛ แสดงถึง: ${formatThaiDateTimeBangkok(ann.endAt)}`);
  }
  lines.push(`✍️ โดย ${ann.authorName || 'ทีมงาน'}`);
  lines.push(`👉 ${config.publicSiteUrl || 'https://bojoiduty.vercel.app'}`);

  return {
    type: 'text',
    text: lines.join('\n'),
    quickReply: getLineQuickReplyItems(),
  };
}

// Multicast message to LINE in chunks of up to 500 recipients
export async function multicastLine(
  token: string,
  userIds: string[],
  messages: any[]
): Promise<{ successCount: number; failedCount: number; errors: any[] }> {
  let successCount = 0;
  let failedCount = 0;
  const errors: any[] = [];

  for (let i = 0; i < userIds.length; i += 500) {
    const chunk = userIds.slice(i, i + 500);
    try {
      const res = await fetch('https://api.line.me/v2/bot/message/multicast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          to: chunk,
          messages,
        }),
      });

      if (res.ok) {
        successCount += chunk.length;
      } else {
        failedCount += chunk.length;
        const errJson = await res.json().catch(() => ({}));
        errors.push({ status: res.status, error: errJson });
      }
    } catch (err: any) {
      failedCount += chunk.length;
      errors.push({ error: err?.message || String(err) });
    }
  }

  return { successCount, failedCount, errors };
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
  if (cleanTarget.startsWith('U') && cleanTarget.length >= 30) {
    return { lineUserId: cleanTarget, userName: cleanTarget };
  }

  try {
    const allUsers = await fetchCollectionFromFirestore('users');
    if (!allUsers || allUsers.length === 0) {
      return { lineUserId: null, userName: cleanTarget, error: 'ไม่พบข้อมูลผู้ใช้ในระบบ' };
    }

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
    return { lineUserId: null, userName: cleanTarget, error: err?.message || String(err) };
  }
}

// 4. Push Notification Handler
export async function handleLinePushNotification(req: any, res: any) {
  try {
    let body = req?.body || {};
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {}
    }

    const rawTo = (
      body.to ||
      body.userId ||
      body.lineUserId ||
      body.targetUserId ||
      ''
    ).trim();

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
      return sendJson(res, 200, {
        success: false,
        error: 'ไม่พบ LINE Channel Access Token ในระบบ (.env หรือการตั้งค่า Backend)',
      });
    }

    if (!rawTo) {
      return sendJson(res, 200, {
        success: false,
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
      return sendJson(res, 200, {
        success: false,
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

    const resText = await pushResponse.text().catch(() => '');
    let resData: any = {};
    try {
      resData = resText ? JSON.parse(resText) : {};
    } catch {
      resData = { message: resText };
    }

    if (!pushResponse.ok) {
      const lineError = resData.message || resData.error || resText || `LINE API ตอบกลับสถานะ ${pushResponse.status}`;
      return sendJson(res, 200, {
        success: false,
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
    return sendJson(res, 200, {
      success: false,
      error: err?.message || String(err) || 'Internal Server Error in LINE Push Handler',
    });
  }
}



function getDateNDaysAway(n: number): string {
  const date = new Date();
  date.setDate(date.getDate() + n);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// 5. Secure Scheduled Reminders Handler with Cron Authentication, Pre-locking, and Single Combined Message per User
export async function handleLineTriggerScheduledReminders(req: any, res: any) {
  try {
    const config = getLineConfig();
    const body = req?.body || {};

    // 1. Enforce CRON_SECRET or Vercel Cron Header Verification
    const authHeader = (req?.headers?.authorization || req?.headers?.['authorization'] || '').trim();
    const bearerToken = authHeader.replace(/^Bearer\s+/i, '').trim();

    const isVercelCron = !!req?.headers?.['x-vercel-cron'];
    const expectedCronSecret = (process.env.CRON_SECRET || 'bojoiduty_cron_secret_2026').trim();
    const expectedChannelSecret = (process.env.LINE_CHANNEL_SECRET || config.lineChannelSecret || '').trim();

    const isAuthorized =
      isVercelCron ||
      (bearerToken && (bearerToken === expectedCronSecret || bearerToken === expectedChannelSecret)) ||
      (body.cronSecret && body.cronSecret === expectedCronSecret);

    if (!isAuthorized) {
      return sendJson(res, 200, {
        success: false,
        sentCount: 0,
        error: 'Unauthorized: CRON_SECRET is required to trigger scheduled reminders',
      });
    }

    const forceRun = body.force === true && isAuthorized;

    if (!config.lineAccessToken || config.lineAccessToken.length < 50) {
      return sendJson(res, 200, {
        success: false,
        sentCount: 0,
        reason: 'LINE Access Token ยังไม่พร้อมใช้งาน',
      });
    }

    const todayStr = getDateNDaysAway(0);
    const in1DayStr = getDateNDaysAway(1);
    const in3DaysStr = getDateNDaysAway(3);

    const [allUsers, allShifts, allAnnouncements] = await Promise.all([
      fetchCollectionFromFirestore('users'),
      fetchCollectionFromFirestore('shifts'),
      fetchCollectionFromFirestore('announcements'),
    ]);

    const userMap = new Map<string, any>();
    allUsers.forEach((u: any) => userMap.set(u.id, u));

    const nowTs = Date.now();
    const activeAnnouncements = allAnnouncements.filter((a: any) => {
      const startTs = a.startAt ? new Date(a.startAt).getTime() : 0;
      const endTs = a.endAt ? new Date(a.endAt).getTime() : Infinity;
      return nowTs >= startTs && nowTs <= endTs;
    });

    let announcementText = '';
    if (activeAnnouncements.length > 0) {
      const sortedAnn = activeAnnouncements.sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      const topAnn = sortedAnn.slice(0, 3);
      announcementText = topAnn
        .map((a: any, idx: number) => `${idx + 1}. 📌 ${a.title || 'ประกาศ'}\n   ${a.content || ''}`)
        .join('\n\n');
    } else {
      announcementText = '• ไม่มีประกาศใหม่ที่บังคับใช้ในวันนี้ สามารถเข้าดูปฏิทินในระบบได้ครับ';
    }

    const nowThai = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    const currentHour = nowThai.getHours();

    // Tight target windows
    const allTargets = [
      { dateStr: todayStr, code: 'D0', label: '🚨 แจ้งเตือนเวรของคุณวันนี้!', targetHourRange: [7, 11] },
      { dateStr: in1DayStr, code: 'D1', label: '🌙 แจ้งเตือนเวรวันพรุ่งนี้ (อีก 1 วัน)!', targetHourRange: [18, 23] },
      { dateStr: in3DaysStr, code: 'D3', label: '📅 แจ้งเตือนเวรล่วงหน้าอีก 3 วัน!', targetHourRange: [11, 15] },
    ];

    const reminderTargets = forceRun
      ? allTargets
      : allTargets.filter((t) => currentHour >= t.targetHourRange[0] && currentHour <= t.targetHourRange[1]);

    // Group duty notifications by user ID
    const userRemindersMap = new Map<string, Array<{
      code: string;
      dateStr: string;
      label: string;
      shift: any;
      partText: string;
      logKey: string;
    }>>();

    for (const target of reminderTargets) {
      const targetShifts = allShifts.filter((s: any) => s.date === target.dateStr);

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

          const logKey = `rem_${target.code}_${target.dateStr}_${userId}`;

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

          if (!userRemindersMap.has(userId)) {
            userRemindersMap.set(userId, []);
          }

          userRemindersMap.get(userId)!.push({
            code: target.code,
            dateStr: target.dateStr,
            label: target.label,
            shift,
            partText,
            logKey,
          });
        }
      }
    }

    let sentCount = 0;
    const results: string[] = [];

    // Combine multiple reminders per user into 1 single message and pre-lock in Firestore
    for (const [userId, items] of userRemindersMap.entries()) {
      const userObj = userMap.get(userId);
      if (!userObj || !userObj.lineUserId) continue;

      const itemsToSend: typeof items = [];
      for (const item of items) {
        if (forceRun) {
          itemsToSend.push(item);
        } else {
          // Pre-lock in Firestore to prevent race conditions and duplicate sends
          const locked = await acquireReminderLockFirestore(item.logKey);
          if (locked) {
            itemsToSend.push(item);
          }
        }
      }

      if (itemsToSend.length === 0) continue;

      const userName = userObj.nickname || userObj.name || 'คุณสมาชิก';
      const hasD0 = itemsToSend.some((i) => i.code === 'D0');

      let msg = `🐶 [BojoiDuty] แจ้งเตือนตารางเวรดูแลน้องหมา\n\n`;
      msg += `สวัสดีครับคุณ ${userName}\n`;
      msg += `📌 คุณมีเวรปฏิบัติหน้าที่ดังนี้:\n\n`;

      itemsToSend.forEach((item, idx) => {
        const thaiDate = formatThaiDateDisplay(item.dateStr);
        msg += `${idx + 1}. ${item.label}\n`;
        msg += `   📅 วันที่: ${thaiDate}\n`;
        msg += `   ⏰ รายละเอียด: ${item.partText}\n`;
        if (item.shift.notes) {
          msg += `   📝 โน้ต: ${item.shift.notes}\n`;
        }
        msg += `\n`;
      });

      if (hasD0) {
        msg += `━━━━━━━━━━━━━━━\n📢 [ประกาศ & ข่าวสารสำคัญประจำวันนี้]:\n${announcementText}\n━━━━━━━━━━━━━━━\n\n`;
      }

      msg += `✨ สู้ ๆ นะครับ น้องหมารออยู่! 🐾`;

      try {
        const pushRes = await fetch('https://api.line.me/v2/bot/message/push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.lineAccessToken}`,
          },
          body: JSON.stringify({
            to: userObj.lineUserId,
            messages: [{ type: 'text', text: msg.trim(), quickReply: getLineQuickReplyItems() }],
          }),
        });

        if (pushRes.ok) {
          sentCount++;
          results.push(`ส่งแจ้งเตือนรวม (${itemsToSend.length} รายการ) ถึง ${userName} สำเร็จ`);
        } else {
          const errData = await pushRes.json().catch(() => ({}));
          console.warn(`[Scheduled Combined Push Error for ${userName}]:`, errData);
        }
      } catch (pushErr: any) {
        console.warn(`[Scheduled Push Exception for ${userName}]:`, pushErr?.message);
      }
    }

    return sendJson(res, 200, { success: true, sentCount, results });
  } catch (err: any) {
    return sendJson(res, 200, { success: false, error: err?.message || String(err), sentCount: 0 });
  }
}

// 6. Process Announcement Line Notifications (Publish + Scheduled Timing)
export async function processAnnouncementLineNotifications(opts?: {
  onlyAnnouncementId?: string;
  announcement?: any;
  recipientUserIds?: string[];
  force?: boolean;
}): Promise<{
  success: boolean;
  processed?: number;
  sent?: number;
  skipped?: number;
  reason?: string;
  results?: string[];
}> {
  try {
    const config = getLineConfig();
    const token = config.lineAccessToken;
    if (!token || token.length < 50) {
      return { success: false, reason: 'no_token' };
    }

    let announcements: any[] = [];
    if (opts?.announcement) {
      announcements = [opts.announcement];
    } else {
      announcements = await fetchCollectionFromFirestore('announcements');
      if (opts?.onlyAnnouncementId) {
        announcements = announcements.filter((a) => a.id === opts.onlyAnnouncementId);
        if (announcements.length === 0) {
          return { success: true, processed: 0, sent: 0, skipped: 0, results: ['not_found'] };
        }
      }
    }

    let recipientIds: string[] = [];
    if (opts?.recipientUserIds && Array.isArray(opts.recipientUserIds) && opts.recipientUserIds.length > 0) {
      const set = new Set<string>();
      for (const uid of opts.recipientUserIds) {
        if (typeof uid === 'string' && uid.startsWith('U') && uid.length >= 30) {
          set.add(uid);
        }
      }
      recipientIds = Array.from(set);
    } else {
      const users = await fetchCollectionFromFirestore('users');
      recipientIds = getAnnouncementLineRecipients(users);
    }

    const now = Date.now();

    // Filter active announcements: not before startAt (with 2 min skew tolerance), not after endAt
    const activeAnnouncements = announcements.filter((ann) => {
      if (opts?.force) return true; // Forced admin send always active
      const startTs = ann.startAt ? Date.parse(ann.startAt) : 0;
      const endTs = ann.endAt ? Date.parse(ann.endAt) : Infinity;
      // Allow 2-minute grace period for clock skew between user device and server
      return (now + 120000) >= startTs && now <= endTs;
    });

    const jobs: Array<{
      ann: any;
      logId: string;
      kind: 'publish' | 'scheduled';
      slotAt?: string;
    }> = [];

    for (const ann of activeAnnouncements) {
      if (ann.lineNotifyOnPublish === true || opts?.force) {
        jobs.push({
          ann,
          logId: `${ann.id}__publish`,
          kind: 'publish',
        });
      }

      const scheduledList = Array.isArray(ann.lineNotifyScheduledAt) ? ann.lineNotifyScheduledAt : [];
      for (const slotAt of scheduledList) {
        if (typeof slotAt === 'string' && slotAt.trim()) {
          const slotTs = Date.parse(slotAt.trim());
          const startTs = ann.startAt ? Date.parse(ann.startAt) : 0;
          const endTs = ann.endAt ? Date.parse(ann.endAt) : Infinity;
          // Slot is due if slotTs <= now + 2 mins (clock skew) and within start/end window
          if (opts?.force || (!isNaN(slotTs) && slotTs <= (now + 120000) && (slotTs + 120000) >= startTs && slotTs <= endTs)) {
            jobs.push({
              ann,
              logId: `${ann.id}__sched__${slotTs}`,
              kind: 'scheduled',
              slotAt: slotAt.trim(),
            });
          }
        }
      }
    }

    let processed = 0;
    let sent = 0;
    let skipped = 0;
    const results: string[] = [];

    for (const job of jobs) {
      processed++;
      const nowIso = new Date().toISOString();

      const initialFields: Record<string, any> = {
        announcementId: job.ann.id,
        kind: job.kind,
        status: 'sending',
        recipientCount: recipientIds.length,
        successCount: 0,
        failedCount: 0,
        sentAt: nowIso,
      };
      if (job.slotAt) {
        initialFields.slotAt = job.slotAt;
      }

      if (!opts?.force) {
        const lock = await acquireAnnouncementLineLock(job.logId, initialFields);
        if (!lock.acquired) {
          skipped++;
          results.push(`[Skip ${job.logId}]: ${lock.reason || 'lock_not_acquired'}`);
          continue;
        }
      }

      if (recipientIds.length === 0) {
        await patchFirestoreDoc('announcement_line_logs', job.logId, {
          status: 'sent',
          recipientCount: 0,
          successCount: 0,
          failedCount: 0,
          sentAt: new Date().toISOString(),
        });
        results.push(`[Sent ${job.logId}]: 0 recipients`);
        sent++;
        continue;
      }

      const message = buildAnnouncementLineMessage(job.ann, job.kind, config);
      const multiRes = await multicastLine(token, recipientIds, [message]);

      if (multiRes.successCount === 0 && recipientIds.length > 0) {
        await deleteFirestoreDoc('announcement_line_logs', job.logId);
        console.error('[Announcement Line Notification Failed]', job.logId, multiRes.errors);
        results.push(`[Failed ${job.logId}]: All ${recipientIds.length} failed, lock deleted`);
      } else {
        await patchFirestoreDoc('announcement_line_logs', job.logId, {
          status: 'sent',
          successCount: multiRes.successCount,
          failedCount: multiRes.failedCount,
          sentAt: new Date().toISOString(),
        });
        sent++;
        results.push(`[Sent ${job.logId}]: ${multiRes.successCount}/${recipientIds.length}`);
      }
    }

    return { success: true, processed, sent, skipped, results };
  } catch (err: any) {
    console.error('[Process Announcement Line Notifications Error]:', err);
    return { success: false, reason: err?.message || String(err) };
  }
}

// 7. Announcement Line Notification Endpoint Handler
export async function handleLineAnnouncementNotify(req: any, res: any) {
  try {
    const config = getLineConfig();
    const authHeader = (req?.headers?.authorization || req?.headers?.['authorization'] || '').trim();
    const bearerToken = authHeader.replace(/^Bearer\s+/i, '').trim();
    const isVercelCron = !!req?.headers?.['x-vercel-cron'];

    const expectedCronSecret = (process.env.CRON_SECRET || 'bojoiduty_cron_secret_2026').trim();
    const expectedChannelSecret = (process.env.LINE_CHANNEL_SECRET || config.lineChannelSecret || '').trim();

    const isCron =
      isVercelCron ||
      (bearerToken && (bearerToken === expectedCronSecret || bearerToken === expectedChannelSecret)) ||
      (req?.body?.cronSecret && req.body.cronSecret === expectedCronSecret) ||
      req?.query?.cron === 'true' ||
      req?.body?.cron === true ||
      req?.body?.triggerAll === true ||
      req?.method === 'GET';

    if (isCron) {
      const result = await processAnnouncementLineNotifications();
      return sendJson(res, 200, result);
    }

    if (req.method === 'POST') {
      const announcement = req.body?.announcement;
      const announcementId = req.body?.announcementId || announcement?.id;
      const recipientUserIds = req.body?.recipientUserIds;
      const force = req.body?.force === true;

      if (announcement || announcementId) {
        const result = await processAnnouncementLineNotifications({
          onlyAnnouncementId: announcementId,
          announcement,
          recipientUserIds,
          force,
        });
        return sendJson(res, 200, result);
      }
    }

    return sendJson(res, 200, { success: false, error: 'bad request' });
  } catch (err: any) {
    console.error('[handleLineAnnouncementNotify Exception]:', err);
    return sendJson(res, 200, { success: false, error: err?.message || String(err) });
  }
}
