import { handleLineAnnouncementNotify } from '../_shared.js';

export default async function handler(req: any, res: any) {
  return handleLineAnnouncementNotify(req, res);
}
