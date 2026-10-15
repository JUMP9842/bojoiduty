import type { VercelRequest, VercelResponse } from '@vercel/node';

const DEFAULT_LINE_ACCESS_TOKEN =
  'KuXbOznb4aCQvDid2OyJ8F4+k3o221q6owdzubhHzw0hNexdEEw+3bYMMY4EhgjA/UQ6WvBR5/Zyy1WgjZwITGugy5rnBqMnkBBpqJY4NGVHmd1wfImEstyXPUV3blruSEEwn+ywp8PHBBIk0smvYgdB04t89/1O/w1cDnyilFU=';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ success: true, message: 'CORS OK' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Please use POST.' });
  }

  try {
    let body: any = req.body || {};
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        // ignore json parse error
      }
    }

    const token = (
      body.token ||
      process.env.LINE_CHANNEL_ACCESS_TOKEN ||
      process.env.VITE_LINE_CHANNEL_ACCESS_TOKEN ||
      DEFAULT_LINE_ACCESS_TOKEN
    ).trim();

    const to = body.to || body.lineUserId || body.userId || body.targetUserId;
    const rawMessage = body.messages || body.message || body.messageText || body.text;

    if (!to) {
      return res.status(400).json({
        error: 'Missing target user ID (to / lineUserId / userId / targetUserId)'
      });
    }

    const messages = Array.isArray(rawMessage)
      ? rawMessage
      : [
          {
            type: 'text',
            text: String(rawMessage || 'แจ้งเตือนจากระบบเวรปฏิบัติงาน')
          }
        ];

    const lineResponse = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        to,
        messages
      })
    });

    const responseData = await lineResponse.json().catch(() => ({}));

    if (!lineResponse.ok) {
      return res.status(lineResponse.status).json({
        error: `LINE API Error (${lineResponse.status})`,
        details: responseData
      });
    }

    return res.status(200).json({
      success: true,
      message: 'ส่งข้อความ LINE สำเร็จ',
      data: responseData
    });
  } catch (error: any) {
    console.error('[Vercel line-push error]:', error);
    return res.status(500).json({
      error: 'เกิดข้อผิดพลาดภายในระบบ Serverless Function',
      details: error?.message || String(error)
    });
  }
}
