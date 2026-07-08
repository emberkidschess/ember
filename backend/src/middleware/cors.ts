import { Request, Response, NextFunction } from 'express';

function allowedOrigins(): Set<string> {
  const origins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);

  if (process.env.NODE_ENV !== 'production') {
    origins.push('http://localhost:3000', 'http://127.0.0.1:3000');
  }
  return new Set(origins);
}

function isAllowedOrigin(origin: string | undefined, allowed: Set<string>): boolean {
  if (!origin) return false;
  if (allowed.has(origin)) return true;

  if (process.env.NODE_ENV !== 'production') {
    try {
      const url = new URL(origin);
      return ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
    } catch {
      return false;
    }
  }

  return false;
}

export const corsHandler = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin?.replace(/\/$/, '');
  const allowed = allowedOrigins();
  const originAllowed = isAllowedOrigin(origin, allowed);

  // Reject browser requests from unknown origins at the server boundary.
  // Relying only on the browser hiding a CORS response can still allow a
  // state-changing request to execute when cross-site cookies are enabled.
  if (origin && !originAllowed) {
    return res.status(403).json({ success: false, error: 'Origin is not allowed' });
  }

  if (origin && originAllowed) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }

  res.header('Vary', 'Origin');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Request-ID, X-Auth-Portal'
  );
  res.header('Access-Control-Expose-Headers', 'X-Request-ID');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
};
