import { handleLinePushNotification, sendJson } from '../_shared';

export default async function handler(req: any, res: any) {
  try {
    // Ensure LINE_CHANNEL_ACCESS_TOKEN from process.env is trimmed if set
    if (process.env.LINE_CHANNEL_ACCESS_TOKEN) {
      process.env.LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN.trim();
    }

    return await handleLinePushNotification(req, res);
  } catch (err: any) {
    console.error('[Push Notification Handler Error]:', err);
    return sendJson(res, 200, {
      success: false,
      error: err?.message || String(err) || 'Internal Server Error in LINE Push Notification API',
      details: String(err?.stack || err),
    });
  }
}
