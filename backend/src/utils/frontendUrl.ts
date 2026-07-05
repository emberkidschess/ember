export function primaryFrontendUrl(): string {
  const configured = (process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .find(Boolean);

  return configured || 'http://localhost:3000';
}
