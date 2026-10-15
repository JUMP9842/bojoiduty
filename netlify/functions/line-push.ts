const DEFAULT_LINE_ACCESS_TOKEN =
  process.env.LINE_CHANNEL_ACCESS_TOKEN ||
  'KuXbOznb4aCQvDid2OyJ8F4+k3o221q6owdzubhHzw0hNexdEEw+3bYMMY4EhgjA/UQ6WvBR5/Zyy1WgjZwITGugy5rnBqMnkBBpqJY4NGVHmd1wfImEstyXPUV3blruSEEwn+ywp8PHBBIk0smvYgdB04t89/1O/w1cDnyilFU=';

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: 'OK',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ success: false, error: 'Method Not Allowed' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const recipientLineUserId = body.to || body.targetUserId || body.lineUserId;
    const messageText = body.messageText;
    const customMessages = body.messages;

    if (!recipientLineUserId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: false, error: 'Missing target LINE User ID (to / targetUserId / lineUserId)' }),
      };
    }

    const messages = customMessages || [
      {
        type: 'text',
        text: messageText || '🐶 [BojoiDuty] คุณมีแจ้งเตือนเวรใหม่ที่ใกล้จะถึง',
      },
    ];

    console.log(`[Netlify Line Push] Dispatching to: ${recipientLineUserId}`);

    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DEFAULT_LINE_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: recipientLineUserId,
        messages,
      }),
    });

    const resData = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error(`[Netlify Line Push Error] Status: ${res.status}`, JSON.stringify(resData));
      return {
        statusCode: res.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          success: false,
          error: resData.message || `LINE API Error (${res.status})`,
          details: resData,
        }),
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: true,
        message: 'Push notification sent successfully via Netlify Function',
        targetUserId: recipientLineUserId,
      }),
    };
  } catch (err: any) {
    console.error('[Netlify Line Push Exception]:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: false, error: err.message || 'Internal Server Error' }),
    };
  }
};
