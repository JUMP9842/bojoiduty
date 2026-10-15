const DEFAULT_LINE_ACCESS_TOKEN =
  'KuXbOznb4aCQvDid2OyJ8F4+k3o221q6owdzubhHzw0hNexdEEw+3bYMMY4EhgjA/UQ6WvBR5/Zyy1WgjZwITGugy5rnBqMnkBBpqJY4NGVHmd1wfImEstyXPUV3blruSEEwn+ywp8PHBBIk0smvYgdB04t89/1O/w1cDnyilFU=';

function safeParseJSON(raw: any): any {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return {};
}

export const handler = async (event: any) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'CORS OK' }),
    };
  }

  try {
    const body = safeParseJSON(event.body);

    // Extract target user ID (supporting all frontend conventions)
    const rawTo = (
      body.to ||
      body.userId ||
      body.lineUserId ||
      body.targetUserId ||
      ''
    ).trim();

    // Extract message content
    const rawMessage = body.messages ?? body.message ?? body.messageText ?? body.text;

    // Extract Authorization Header token if available
    const authHeader =
      event.headers?.authorization || event.headers?.Authorization || '';
    const headerToken = authHeader.replace(/^Bearer\s+/i, '').trim();

    // Safely retrieve environment tokens without throwing
    let envToken = '';
    let envViteToken = '';
    try {
      if (typeof process !== 'undefined' && process?.env) {
        envToken = (process.env.LINE_CHANNEL_ACCESS_TOKEN || '').trim();
        envViteToken = (process.env.VITE_LINE_CHANNEL_ACCESS_TOKEN || '').trim();
      }
    } catch {}

    // Resolve token priority: Body token -> Header token -> Env tokens -> Default fallback
    const token = (
      body.token ||
      body.lineAccessToken ||
      body.channelAccessToken ||
      headerToken ||
      envToken ||
      envViteToken ||
      DEFAULT_LINE_ACCESS_TOKEN ||
      ''
    ).trim();

    if (!token) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'ไม่พบ LINE Channel Access Token ในระบบ',
        }),
      };
    }

    if (!rawTo) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'ไม่พบรหัส LINE User ID (to หรือ userId) ของผู้รับ',
        }),
      };
    }

    // Format LINE messages array
    let messages: any[];
    if (Array.isArray(rawMessage)) {
      messages = rawMessage;
    } else if (typeof rawMessage === 'object' && rawMessage !== null && rawMessage.type) {
      messages = [rawMessage];
    } else {
      const textContent =
        rawMessage !== undefined && rawMessage !== null && String(rawMessage).trim() !== ''
          ? String(rawMessage)
          : '🐶 [BojoiDuty] คุณมีแจ้งเตือนเวรใหม่';
      messages = [{ type: 'text', text: textContent }];
    }

    console.log(`[Netlify Line Push] Dispatching to: ${rawTo}`);

    // Call LINE Messaging API directly using global fetch
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: rawTo,
        messages,
      }),
    });

    const resText = await response.text().catch(() => '');
    let resData: any = {};
    try {
      resData = resText ? JSON.parse(resText) : {};
    } catch {
      resData = { message: resText };
    }

    if (!response.ok) {
      console.error(`[Netlify Line Push Error ${response.status}]:`, resText);
      const lineError =
        resData.message || resData.error || resText || `LINE API responded with status ${response.status}`;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          error: `เกิดข้อผิดพลาดจาก LINE Messaging API (${response.status}): ${lineError}`,
          details: resData,
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'ส่งการแจ้งเตือนเข้า LINE สำเร็จ! (Netlify Function)',
        data: resData,
        targetUserId: rawTo,
      }),
    };
  } catch (err: any) {
    console.error('[Netlify Line Push Exception]:', err);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: false,
        error: err?.message || String(err) || 'Internal Server Error in Netlify Function',
        details: String(err?.stack || err),
      }),
    };
  }
};
