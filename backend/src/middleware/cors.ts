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

export const corsHandler = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin?.replace(/\/$/, '');
  const allowed = allowedOrigins();

  // Reject browser requests from unknown origins at the server boundary.
  // Relying only on the browser hiding a CORS response can still allow a
  // state-changing request to execute when cross-site cookies are enabled.
  if (origin && !allowed.has(origin)) {
    return res.status(403).json({ success: false, error: 'Origin is not allowed' });
  }

  if (origin && allowed.has(origin)) {
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
