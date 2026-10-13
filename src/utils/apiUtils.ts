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
