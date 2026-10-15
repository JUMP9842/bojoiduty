import type { VercelRequest, VercelResponse } from '@vercel/node';

const DEFAULT_LINE_ACCESS_TOKEN =
  'KuXbOznb4aCQvDid2OyJ8F4+k3o221q6owdzubhHzw0hNexdEEw+3bYMMY4EhgjA/UQ6WvBR5/Zyy1WgjZwITGugy5rnBqMnkBBpqJY4NGVHmd1wfImEstyXPUV3blruSEEwn+ywp8PHBBIk0smvYgdB04t89/1O/w1cDnyilFU=';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(200).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

    const to = (
      body.to ||
      body.userId ||
      body.lineUserId ||
      body.targetUserId ||
      ''
    ).trim();

    const rawMessage = body.messages ?? body.message ?? body.messageText ?? body.text;

    const token = (
      body.token ||
      body.channelAccessToken ||
      body.lineAccessToken ||
      process.env.LINE_CHANNEL_ACCESS_TOKEN ||
      process.env.VITE_LINE_CHANNEL_ACCESS_TOKEN ||
      DEFAULT_LINE_ACCESS_TOKEN
    ).trim();

    if (!token) {
      return res.status(200).json({
        success: false,
        error: 'ไม่พบ LINE Channel Access Token'
      });
    }

    if (!to) {
      return res.status(200).json({
        success: false,
        error: 'ไม่พบ LINE User ID ของผู้รับ (to หรือ userId)'
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

    const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        to: to,
        messages: messages
      })
    });

    const resText = await lineRes.text().catch(() => '');
    let resData: any = {};
    try {
      resData = resText ? JSON.parse(resText) : {};
    } catch {
      resData = { text: resText };
    }

    if (!lineRes.ok) {
      const errMsg = resData.message || resData.error || resText || `LINE API Error (${lineRes.status})`;
      return res.status(200).json({
        success: false,
        error: `เกิดข้อผิดพลาดจาก LINE Messaging API: ${errMsg}`,
        details: resData
      });
    }

    return res.status(200).json({
      success: true,
      message: 'ส่งการแจ้งเตือน LINE สำเร็จ',
      targetUserId: to,
      data: resData
    });
  } catch (err: any) {
    return res.status(200).json({
      success: false,
      error: `Server Handler Error: ${err?.message || String(err)}`
    });
  }
}
