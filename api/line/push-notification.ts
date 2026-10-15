import { handleLinePushNotification, sendJson } from '../_shared';

export default async function handler(req: any, res: any) {
  try {
    return await handleLinePushNotification(req, res);
  } catch (err: any) {
    console.error('[LINE Push API Exception]:', err);
    return sendJson(res, 500, {
      error: err?.message || (typeof err === 'string' ? err : 'Internal Server Error in LINE Push Notification API'),
      details: String(err)
    });
  }
}
