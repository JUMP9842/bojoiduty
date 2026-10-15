import { handleLinePushNotification, sendJson } from '../_shared';

export default async function handler(req: any, res: any) {
  try {
    return await handleLinePushNotification(req, res);
  } catch (err: any) {
    console.error('[LINE Push Serverless Handler Error]:', err);
    return sendJson(res, 500, {
      error: err?.message || String(err) || 'Internal Server Error in LINE Push Notification API',
    });
  }
}
