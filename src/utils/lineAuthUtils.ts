/**
 * Triggers direct redirect to LINE's official OAuth Login authorization page.
 * Uses a popup or top window to avoid X-Frame-Options: DENY restriction inside iframe.
 */
export const triggerLineLogin = async (
  onOpenLineGuide?: () => void,
  onOpenAuthFallback?: () => void
) => {
  try {
    const redirectUri = `${window.location.origin}/auth/line/callback`;
    const res = await fetch(`/api/line/login-url?redirect_uri=${encodeURIComponent(redirectUri)}`);
    const data = await res.json();

    if (res.ok && data.loginUrl) {
      // Calculate popup dimensions & center screen position
      const width = 520;
      const height = 680;
      const left = window.screenX + Math.max(0, (window.innerWidth - width) / 2);
      const top = window.screenY + Math.max(0, (window.innerHeight - height) / 2);

      // Open popup window to bypass iframe X-Frame-Options blocking
      const popup = window.open(
        data.loginUrl,
        'LineLoginPopup',
        `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,status=no,toolbar=no,menubar=no`
      );

      // If browser popup blocker blocked popup window, open in new tab
      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        window.open(data.loginUrl, '_blank');
      }
    } else {
      if (data.error && data.error.includes('Channel ID')) {
        if (onOpenLineGuide) {
          onOpenLineGuide();
        } else if (onOpenAuthFallback) {
          onOpenAuthFallback();
        }
      } else {
        if (onOpenAuthFallback) onOpenAuthFallback();
      }
    }
  } catch (err: any) {
    console.warn('LINE Login Redirect Notice:', err);
    if (onOpenAuthFallback) onOpenAuthFallback();
  }
};
