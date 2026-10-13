import { getApiUrl, getExpressBackendOrigin } from './apiUtils';

/**
 * Returns the active LINE OAuth Callback URL pointing strictly to Express server container.
 */
export const getActiveLineCallbackUrl = (): string => {
  return 'https://ais-dev-olsgx3yczrx7ghc5qkwxao-603131036827.asia-southeast1.run.app/api/auth/line/callback';
};

/**
 * Triggers LINE OAuth Login using window.open(authUrl, '_blank')
 * to avoid X-Frame-Options restrictions when running inside an iframe.
 */
export const loginWithLinePopup = async (_arg1?: any, _arg2?: any) => {
  try {
    const clientOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    const endpoint = getApiUrl(`/api/line/login-url?client_origin=${encodeURIComponent(clientOrigin)}`);
    
    const res = await fetch(endpoint);
    const data = await res.json();

    if (data?.loginUrl) {
      // Open in a new window/tab to prevent X-Frame-Options iframe errors
      window.open(data.loginUrl, '_blank');
    } else if (data?.error) {
      alert(`LINE Login Error: ${data.error}`);
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
