import { handleLineTriggerScheduledReminders } from '../_shared';

export default async function handler(req: any, res: any) {
  return handleLineTriggerScheduledReminders(req, res);
}
