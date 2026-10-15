import { sendJson } from '../_shared.js';

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    if (typeof res.status === 'function') {
      return res.status(200).send('BojoiDuty LINE Webhook endpoint is active and ready.');
    }
    res.statusCode = 200;
    return res.end('BojoiDuty LINE Webhook endpoint is active and ready.');
  }

  // Webhook POST verification or reply
  return sendJson(res, 200, { success: true, message: 'OK' });
}
