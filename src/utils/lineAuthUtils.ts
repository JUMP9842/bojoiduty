import { getApiUrl, safeFetchJson } from './apiUtils';

/**
 * Returns the active LINE OAuth Callback URL pointing strictly to Express server container.
 */
export const getActiveLineCallbackUrl = (): string => {
  return 'https://ais-dev-olsgx3yczrx7ghc5qkwxao-603131036827.asia-southeast1.run.app/api/auth/line/callback';
};

/**
 * Triggers LINE OAuth Login using window.open(authUrl, '_blank')
 * to avoid X-Frame-Options restrictions when running inside an iframe.
 * Includes a client-side fallback for static hosting environments (like Vercel).
 */
export const loginWithLinePopup = async (_arg1?: any, _arg2?: any) => {
  try {
    const clientOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    const endpoint = getApiUrl(`/api/line/login-url?client_origin=${encodeURIComponent(clientOrigin)}`);
    
    const { ok, data } = await safeFetchJson(endpoint);

    let loginUrl = data?.loginUrl;

    // If backend is unavailable (e.g. Vercel static hosting mode), generate client-side fallback LINE login URL!
    if (!ok || !loginUrl) {
      const channelId = '2011986358'; // Default BojoiDuty LINE Channel ID
      const redirectUri = 'https://ais-dev-olsgx3yczrx7ghc5qkwxao-603131036827.asia-southeast1.run.app/api/auth/line/callback';
      const state = encodeURIComponent(clientOrigin);

      const params = new URLSearchParams({
        response_type: 'code',
        client_id: channelId,
        redirect_uri: redirectUri,
        state,
        scope: 'profile openid email',
      });
      loginUrl = `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`;
    }

    if (loginUrl) {
      // Open in a new window/tab to prevent X-Frame-Options iframe errors
      window.open(loginUrl, '_blank');
    } else {
      throw new Error('ไม่สามารถรับ URL สำหรับเข้าสู่ระบบ LINE ได้');
    }
  } catch (err: any) {
    console.error('Failed to trigger LINE login popup:', err);
    alert('เกิดข้อผิดพลาดในการเปิดหน้า LINE Login: ' + (err.message || String(err)));
  }
};

/**
 * Direct trigger alias for backwards compatibility
 */
export const triggerLineLogin = async (customRedirectUriOrGuide?: any, onOpenAuthFallback?: any) => {
  return loginWithLinePopup(customRedirectUriOrGuide, onOpenAuthFallback);
};
