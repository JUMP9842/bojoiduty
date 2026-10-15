import { handleLineOAuthCallback } from '../../_shared';

export default async function handler(req: any, res: any) {
  return handleLineOAuthCallback(req, res);
}
