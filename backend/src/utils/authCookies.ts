import type { CookieOptions, Request, Response } from 'express';

const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000;
const REFRESH_TOKEN_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

export type AuthCookieScope = 'admin' | 'staff' | 'client';

const COOKIE_NAMES: Record<AuthCookieScope, { access: string; refresh: string }> = {
  admin: { access: 'adminAccessToken', refresh: 'adminRefreshToken' },
  staff: { access: 'staffAccessToken', refresh: 'staffRefreshToken' },
  client: { access: 'clientAccessToken', refresh: 'clientRefreshToken' },
};

function sameSitePolicy(): CookieOptions['sameSite'] {
  const configured = process.env.COOKIE_SAME_SITE?.toLowerCase();
  if (configured === 'strict' || configured === 'lax' || configured === 'none') {
    return configured;
  }
  return 'lax';
}

function cookieOptions(maxAge: number): CookieOptions {
  const sameSite = sameSitePolicy();
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite,
    maxAge,
    path: '/',
  };
}

function scopedCookieNames(scope: AuthCookieScope): { access: string; refresh: string } {
  return COOKIE_NAMES[scope];
}

export function authScopeFromRequest(req: Request): AuthCookieScope | null {
  const header = req.headers['x-auth-portal'];
  const value = Array.isArray(header) ? header[0] : header;

  if (value === 'admin' || value === 'staff' || value === 'client') {
    return value;
  }

  const path = `${req.baseUrl || ''}${req.path || ''}${req.originalUrl || ''}`;

  if (path.includes('/auth/admin')) return 'admin';
  if (path.includes('/auth/staff')) return 'staff';
  if (path.includes('/auth/client')) return 'client';

  return null;
}

export function setAuthCookies(
  res: Response,
  scope: AuthCookieScope,
  accessToken: string,
  refreshToken: string
): void {
  const names = scopedCookieNames(scope);
  const { maxAge: _maxAge, ...clearOptions } = cookieOptions(0);

  console.log('Setting cookies for scope:', scope);
  console.log('Cookie names:', names);
  console.log('Access token length:', accessToken.length);
  console.log('Refresh token length:', refreshToken.length);

  // Remove the legacy shared cookies so old deployments/sessions cannot keep
  // causing cross-portal overwrites after upgrading.
  res.clearCookie('accessToken', clearOptions);
  res.clearCookie('refreshToken', clearOptions);

  const accessOptions = cookieOptions(ACCESS_TOKEN_MAX_AGE);
  const refreshOptions = cookieOptions(REFRESH_TOKEN_MAX_AGE);
  console.log('Access cookie options:', accessOptions);
  console.log('Refresh cookie options:', refreshOptions);

  res.cookie(names.access, accessToken, accessOptions);
  res.cookie(names.refresh, refreshToken, refreshOptions);
  console.log('Cookies set successfully');
}

export function clearAuthCookies(res: Response, scope: AuthCookieScope): void {
  const { maxAge: _maxAge, ...options } = cookieOptions(0);
  const names = scopedCookieNames(scope);

  res.clearCookie(names.access, options);
  res.clearCookie(names.refresh, options);

  // Also clear legacy cookies for users upgrading from the old shared-cookie
  // implementation.
  res.clearCookie('accessToken', options);
  res.clearCookie('refreshToken', options);
}

export function accessTokenFromRequest(req: Request, scope?: AuthCookieScope): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  const requestedScope = scope || authScopeFromRequest(req);
  if (requestedScope) {
    const names = scopedCookieNames(requestedScope);
    return typeof req.cookies?.[names.access] === 'string' ? req.cookies[names.access] : null;
  }

  // Last-resort compatibility for non-browser/API clients that have not yet
  // started sending X-Auth-Portal. Browser requests should use the scoped
  // cookie path above to avoid admin/staff/client session collisions.
  return (
    req.cookies?.adminAccessToken ||
    req.cookies?.staffAccessToken ||
    req.cookies?.clientAccessToken ||
    req.cookies?.accessToken ||
    null
  );
}

export function refreshTokenFromRequest(req: Request, scope?: AuthCookieScope): string | null {
  const requestedScope = scope || authScopeFromRequest(req);

  if (requestedScope) {
    const names = scopedCookieNames(requestedScope);
    if (typeof req.cookies?.[names.refresh] === 'string') {
      return req.cookies[names.refresh];
    }
  }

  if (!requestedScope && typeof req.cookies?.refreshToken === 'string') {
    return req.cookies.refreshToken;
  }

  return typeof req.body?.refreshToken === 'string' ? req.body.refreshToken : null;
}
