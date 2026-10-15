import { getApiUrl, safeFetchJson } from './apiUtils';

export const LINE_OA_INFO = {
  basicId: '@090puwgd',
  displayName: 'BojoiDuty',
  addFriendUrl: 'https://line.me/R/ti/p/@090puwgd',
  qrCodeUrl: 'https://qr-official.line.me/gs/M_090puwgd_GW.png',
};

/**
 * Returns the exact LINE OAuth Callback URL registered in LINE Developers Console:
 * https://bojoiduty.vercel.app/api/auth/line/callback
 */
export const getActiveLineCallbackUrl = (_customOrigin?: string): string => {
  return 'https://bojoiduty.vercel.app/api/auth/line/callback';
};

/**
 * Triggers LINE OAuth Login using window.open(authUrl, '_blank') on desktop,
 * and direct window.location.href on mobile to allow native LINE App auto-login
 * and prevent popup blockers.
 */
export const loginWithLinePopup = async (_arg1?: any, _arg2?: any) => {
  try {
    const clientOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://bojoiduty.vercel.app';
    const redirectUri = 'https://bojoiduty.vercel.app/api/auth/line/callback';
    const endpoint = getApiUrl(`/api/line/login-url?client_origin=${encodeURIComponent(clientOrigin)}`);
    
    const { ok, data } = await safeFetchJson(endpoint);

    let loginUrl = data?.loginUrl;

    // If backend is unavailable, generate client-side fallback LINE login URL with exact registered redirect_uri
    if (!ok || !loginUrl) {
      const channelId = '2011986358'; // BojoiDuty LINE Channel ID
      const stateObj = {
        origin: clientOrigin,
        redirectUri,
        t: Date.now(),
      };
      let state = '';
      try {
        state = btoa(unescape(encodeURIComponent(JSON.stringify(stateObj))))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');
      } catch {
        state = encodeURIComponent(JSON.stringify(stateObj));
      }

      const params = new URLSearchParams({
        response_type: 'code',
        client_id: channelId,
        redirect_uri: redirectUri,
        state,
        scope: 'profile openid',
        bot_prompt: 'aggressive',
      });
      loginUrl = `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`;
    }

    if (loginUrl) {
      const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        window.location.href = loginUrl;
      } else {
        const popup = window.open(loginUrl, '_blank', 'width=500,height=650');
        if (!popup || popup.closed || typeof popup.closed === 'undefined') {
          window.location.href = loginUrl;
        }
      }
    }
  } catch (err: any) {
    console.error('Failed to trigger LINE login popup:', err);
  }
};

/**
 * Direct trigger alias for backwards compatibility
 */
export const triggerLineLogin = async (customRedirectUriOrGuide?: any, onOpenAuthFallback?: any) => {
  return loginWithLinePopup(customRedirectUriOrGuide, onOpenAuthFallback);
};
