import rateLimit from 'express-rate-limit';

// Environment-based rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_API_MAX = parseInt(process.env.RATE_LIMIT_API_MAX || '100', 10);
const RATE_LIMIT_STRICT_MAX = parseInt(process.env.RATE_LIMIT_STRICT_MAX || '25', 10);
const RATE_LIMIT_AUTH_MAX = parseInt(process.env.RATE_LIMIT_AUTH_MAX || '10', 10);
const RATE_LIMIT_CHAT_MAX = parseInt(process.env.RATE_LIMIT_CHAT_MAX || '30', 10);

export const apiLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_API_MAX,
  message: { success: false, error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// For admin/staff mutation endpoints (create/update/delete). Tighter than the
// general API limiter since these are lower-volume, higher-impact actions.
export const strictLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_STRICT_MAX,
  message: { success: false, error: 'Too many mutation requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// For authentication endpoints specifically (login, signup, refresh, password
// reset). These need to be tight enough to meaningfully slow down credential
// stuffing / brute-force attempts, since per-account lockout (see BaseAuth's
// failedLoginAttempts) only kicks in after a known email is targeted - this
// limiter protects against an attacker trying many different emails too.
export const authLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_AUTH_MAX,
  message: { success: false, error: 'Too many authentication attempts from this IP. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public AI requests are comparatively expensive, so they have their own
// budget without affecting ordinary public website API calls.
export const chatLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_CHAT_MAX,
  message: {
    success: false,
    error: 'You have sent several chat messages. Please wait a little and try again.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
