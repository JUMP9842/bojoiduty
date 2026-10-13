/**
 * Dual Domain Utility for AI Studio Environment:
 * - Express Server Container (`ais-dev-*.run.app` or `localhost:3000`)
 * - Static CDN Host (`ais-pre-*.run.app`)
 * 
 * If frontend is running on static CDN host (`ais-pre-*`), API calls to `/api/*`
 * are redirected to the corresponding Express server container (`ais-dev-*`) to prevent 404s.
 */

export const getExpressBackendOrigin = (): string => {
  if (typeof window === 'undefined') return '';
  const origin = window.location.origin;
  const hostname = window.location.hostname;

  // If running on static CDN (ais-pre-...), target the Express backend container (ais-dev-...)
  if (hostname.includes('ais-pre-')) {
    return origin.replace('ais-pre-', 'ais-dev-');
  }

  return origin;
};

export const getApiUrl = (path: string): string => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const backendOrigin = getExpressBackendOrigin();

  if (backendOrigin) {
    return `${backendOrigin}${cleanPath}`;
  }
  return cleanPath;
};

/**
 * Safely fetches an API endpoint and parses JSON, handling non-JSON responses (such as 404 HTML pages on Vercel static hosting).
 */
export const safeFetchJson = async (url: string, options?: RequestInit): Promise<{ ok: boolean; status: number; data: any }> => {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';

    if (!contentType.includes('application/json')) {
      return {
        ok: false,
        status: res.status,
        data: {
          success: false,
          error: 'ระบบทำงานในโหมด Static Hosting (เช่น Vercel) ซึ่งไม่มี Node.js Backend Server รองรับ API กรุณาใช้งานผ่าน AI Studio หรือรันในโหมด Full-Stack',
        },
      };
    }

    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch (err: any) {
    return {
      ok: false,
      status: 500,
      data: {
        success: false,
        error: err.message || 'Network error or invalid JSON response',
      },
    };
  }
};
