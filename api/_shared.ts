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
    publicSiteUrl:
      process.env.PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
      runtimeLineConfig.publicSiteUrl,
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
        const decodedState = decodeURIComponent(state);
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

    let callbackBaseOrigin = clientOrigin;
    if (config.publicSiteUrl) {
      callbackBaseOrigin = config.publicSiteUrl;
    } else if (
      clientOrigin.includes('localhost') ||
      clientOrigin.includes('ais-dev-') ||
      clientOrigin.includes('ais-pre-')
    ) {
      callbackBaseOrigin = clientOrigin.includes('ais-dev-') ? clientOrigin : 'https://bojoiduty.vercel.app';
    } else {
      callbackBaseOrigin = clientOrigin;
    }

    const redirectUri = (query.redirect_uri as string) || `${callbackBaseOrigin}/api/auth/line/callback`;

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
    const state = encodeURIComponent(JSON.stringify(stateObj));

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
