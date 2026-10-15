import { handleLineOAuthCallback, handleLineLoginUrl, handleLineConfig, sendJson } from './_shared.js';

export default async function handler(req: any, res: any) {
  const url = req.url || '';

  if (url.includes('/auth/line/callback') || url.includes('/line/callback')) {
    return handleLineOAuthCallback(req, res);
  }

  if (url.includes('/line/login-url')) {
    return handleLineLoginUrl(req, res);
  }

  if (url.includes('/line/config')) {
    return handleLineConfig(req, res);
  }

  if (url.includes('/line/webhook')) {
    if (req.method === 'GET') {
      if (typeof res.status === 'function') {
        return res.status(200).send('BojoiDuty LINE Webhook endpoint is active and ready.');
      }
      res.statusCode = 200;
      return res.end('BojoiDuty LINE Webhook endpoint is active and ready.');
    }
    return sendJson(res, 200, { success: true, message: 'OK' });
  }

  return sendJson(res, 200, {
    status: 'online',
    service: 'BojoiDuty LINE API',
    path: url,
    timestamp: new Date().toISOString(),
  });
}
