import logger from './logger';

const REQUIRED_ENV_VARS = [
  'MONGODB_URI',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'JWT_CLIENT_ACCESS_SECRET',
  'JWT_CLIENT_REFRESH_SECRET',
  'FRONTEND_URL',
];

const OPTIONAL_ENV_VARS = [
  'PORT',
  'NODE_ENV',
  'LOG_LEVEL',
  'COOKIE_SAME_SITE',
  'REDIS_URL',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'EMAIL_HOST',
  'EMAIL_PORT',
  'EMAIL_USER',
  'EMAIL_PASS',
  'EMAIL_FROM',
  'EMAIL_SECURE',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_WHATSAPP_FROM',
  'WISE_BUSINESS_NAME',
  'WISE_RECIPIENT_NAME',
  'WISE_RECIPIENT_EMAIL',
  'WISE_PAYMENT_LINK',
  'PUBLIC_CONTACT_EMAIL',
  'PUBLIC_CONTACT_PHONE',
  'PUBLIC_CONTACT_PHONE_HREF',
  'PUBLIC_WHATSAPP_URL',
  'PUBLIC_INSTAGRAM_URL',
];

export function validateEnvVarsOnStart(): void {
  const productionRequired = process.env.NODE_ENV === 'production'
    ? ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASS', 'EMAIL_FROM']
    : [];
  const missing = [...REQUIRED_ENV_VARS, ...productionRequired].filter((v) => !process.env[v]);

  if (missing.length > 0) {
    logger.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  const origins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const invalidOrigins = origins.filter((origin) => {
    try {
      const url = new URL(origin);
      return !['http:', 'https:'].includes(url.protocol) || url.origin !== origin.replace(/\/$/, '');
    } catch {
      return true;
    }
  });
  if (origins.length === 0 || invalidOrigins.length > 0) {
    logger.error('FRONTEND_URL must contain one or more comma-separated HTTP(S) origins without paths');
    process.exit(1);
  }

  const sameSite = process.env.COOKIE_SAME_SITE?.toLowerCase();
  if (sameSite && !['strict', 'lax', 'none'].includes(sameSite)) {
    logger.error('COOKIE_SAME_SITE must be one of: strict, lax, none');
    process.exit(1);
  }

  const optionalMissing = OPTIONAL_ENV_VARS.filter((v) => !process.env[v]);
  if (optionalMissing.length > 0) {
    logger.warn(`Optional environment variables not set: ${optionalMissing.join(', ')}`);
  }

  logger.info('Environment variables validated successfully');
}
