import { getApiUrl, safeFetchJson } from './apiUtils';

/**
 * Returns the active LINE OAuth Callback URL dynamically.
 * Prioritizes the current domain (e.g. Vercel public domain https://xxx.vercel.app/api/auth/line/callback)
 * or local/preview development containers.
 */
export const getActiveLineCallbackUrl = (customOrigin?: string): string => {
  if (customOrigin) {
    return `${customOrigin.replace(/\/$/, '')}/api/auth/line/callback`;
  }
  if (typeof window !== 'undefined' && window.location.origin) {
    const origin = window.location.origin;
    // If running in Google AI Studio static preview, map to the backend dev container
    if (origin.includes('ais-pre-')) {
      return origin.replace('ais-pre-', 'ais-dev-') + '/api/auth/line/callback';
    }
    // On Vercel, production, or custom domain, use the active domain!
    return `${origin}/api/auth/line/callback`;
  }
  return 'https://ais-dev-olsgx3yczrx7ghc5qkwxao-603131036827.asia-southeast1.run.app/api/auth/line/callback';
};

/**
 * Triggers LINE OAuth Login using window.open(authUrl, '_blank')
 * to avoid X-Frame-Options restrictions when running inside an iframe.
 * Uses dynamic client origin so Vercel public sites redirect back to Vercel, not the dev site.
 */
export const loginWithLinePopup = async (_arg1?: any, _arg2?: any) => {
  try {
    const clientOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    const endpoint = getApiUrl(`/api/line/login-url?client_origin=${encodeURIComponent(clientOrigin)}`);
    
    const { ok, data } = await safeFetchJson(endpoint);

    let loginUrl = data?.loginUrl;

    // If backend is unavailable (e.g. static hosting fallback), generate client-side fallback LINE login URL
    if (!ok || !loginUrl) {
      const channelId = '2011986358'; // Default BojoiDuty LINE Channel ID
      const redirectUri = getActiveLineCallbackUrl(clientOrigin);
      const stateObj = {
        origin: clientOrigin,
        redirectUri,
        t: Date.now(),
      };
      const state = encodeURIComponent(JSON.stringify(stateObj));

      const params = new URLSearchParams({
        response_type: 'code',
        client_id: channelId,
        redirect_uri: redirectUri,
        state,
        scope: 'profile openid',
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
