import { Request, Response, NextFunction } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function allowedOrigins(): Set<string> {
  const configured = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);

  if (process.env.NODE_ENV !== 'production') {
    configured.push('http://localhost:3000', 'http://127.0.0.1:3000');
  }
  return new Set(configured);
}

/**
 * Kept as a compatibility hook for the route registry. CSRF enforcement is
 * performed by validateCSRFToken only when a request is authenticated by a
 * cookie; bearer-token clients are not vulnerable to browser CSRF.
 */
export const csrfProtection = (_req: Request, _res: Response, next: NextFunction) => next();

export const validateCSRFToken = (req: Request, res: Response, next: NextFunction) => {
  if (SAFE_METHODS.has(req.method)) return next();
  if (req.headers.authorization?.startsWith('Bearer ')) return next();

  // Cookie names are scoped per portal so admin, staff, and student sessions
  // can coexist in one browser. Treat every supported access cookie (plus the
  // legacy name during upgrades) as cookie authentication; otherwise scoped
  // sessions would silently bypass the origin check.
  const hasAuthCookie = [
    'adminAccessToken',
    'adminRefreshToken',
    'staffAccessToken',
    'staffRefreshToken',
    'clientAccessToken',
    'clientRefreshToken',
    'accessToken',
    'refreshToken',
  ].some((name) => typeof req.cookies?.[name] === 'string' && req.cookies[name].length > 0);

  if (!hasAuthCookie) return next();

  const originHeader = req.headers.origin;
  const refererHeader = req.headers.referer;
  let requestOrigin = originHeader;

  if (!requestOrigin && refererHeader) {
    try {
      requestOrigin = new URL(refererHeader).origin;
    } catch {
      requestOrigin = undefined;
    }
  }

  if (!requestOrigin || !allowedOrigins().has(requestOrigin.replace(/\/$/, ''))) {
    return res.status(403).json({
      success: false,
      error: 'Request origin could not be verified',
    });
  }

  next();
};

export const invalidateCSRFToken = (_token: string) => undefined;
