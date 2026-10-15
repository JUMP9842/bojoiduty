import type { VercelRequest, VercelResponse } from '@vercel/node';

const DEFAULT_LINE_ACCESS_TOKEN =
  'KuXbOznb4aCQvDid2OyJ8F4+k3o221q6owdzubhHzw0hNexdEEw+3bYMMY4EhgjA/UQ6WvBR5/Zyy1WgjZwITGugy5rnBqMnkBBpqJY4NGVHmd1wfImEstyXPUV3blruSEEwn+ywp8PHBBIk0smvYgdB04t89/1O/w1cDnyilFU=';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

    const to = (body.to || body.userId || body.lineUserId || body.targetUserId || '').trim();
    const messageText = body.messages?.[0]?.text || body.message || body.messageText || body.text || 'คุณมีแจ้งเตือนเวรใหม่';

    const token = (
      process.env.LINE_CHANNEL_ACCESS_TOKEN ||
      process.env.VITE_LINE_CHANNEL_ACCESS_TOKEN ||
      body.token ||
      DEFAULT_LINE_ACCESS_TOKEN
    ).trim();

    if (!token) {
      return res.status(200).json({
        success: false,
        error: 'ยังไม่ได้ตั้งค่า LINE_CHANNEL_ACCESS_TOKEN บน Vercel Environment Variables'
      });
    }

    if (!to) {
      return res.status(200).json({
        success: false,
        error: 'ไม่พบ LINE User ID ของผู้รับ'
      });
    }

    const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        to: to,
        messages: [{ type: 'text', text: messageText }]
      })
    });

    const data: any = await lineRes.json().catch(() => ({}));

    if (!lineRes.ok) {
      return res.status(200).json({
        success: false,
        error: `LINE API Error: ${data.message || lineRes.statusText || 'Unknown error'}`
      });
    }

    return res.status(200).json({
      success: true,
      message: 'ส่ง LINE สำเร็จ'
    });
  } catch (err: any) {
    return res.status(200).json({
      success: false,
      error: `Server Crash: ${err?.message || String(err)}`
    });
  }
}
