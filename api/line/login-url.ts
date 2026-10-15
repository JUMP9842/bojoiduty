import { handleLineLoginUrl } from '../_shared.js';

export default async function handler(req: any, res: any) {
  return handleLineLoginUrl(req, res);
}
