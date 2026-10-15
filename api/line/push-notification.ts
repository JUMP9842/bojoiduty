import { handleLinePushNotification } from '../_shared';

export default async function handler(req: any, res: any) {
  return handleLinePushNotification(req, res);
}
