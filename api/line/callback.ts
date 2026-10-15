import { handleLineOAuthCallback } from '../_shared.js';

export default async function handler(req: any, res: any) {
  return handleLineOAuthCallback(req, res);
}
