# EmberKids Chess Academy

Production-oriented monorepo containing:

- `frontend`: Next.js website, student portal, and protected admin/staff portals.
- `backend`: Express, MongoDB, Redis-compatible caching, authentication, RBAC, payments, classes, attendance, reports, notifications, and scheduled jobs.

## Requirements

- Node.js 20.9 or newer
- MongoDB replica set (transactions are used for payment, class, student, and attendance consistency)
- Redis is recommended in production
- SMTP credentials are required in production

## Local setup

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
cd backend && npm ci
cd ../frontend && npm ci
```

Generate four different JWT secrets (32+ characters each) and set them in `backend/.env`. Configure `MONGODB_URI`, `FRONTEND_URL`, SMTP, and any enabled Cloudinary/Twilio integrations.

Run the applications in separate terminals:

```bash
cd backend && npm run dev
cd frontend && npm run dev
```

Create the first administrator with:

```bash
cd backend && npm run create:admin
```

## Production configuration

- Set `NODE_ENV=production`.
- Set `FRONTEND_URL` to the exact frontend origin. Multiple allowed origins may be comma-separated.
- Use `COOKIE_SAME_SITE=none` only when frontend and backend are cross-site HTTPS deployments; otherwise use `lax`.
- Set the server-only frontend variable `INTERNAL_PORTAL_ENTRY_PATH` to an unguessable path. Production admin/staff routes fail closed with 404 when it is missing.
- Never deploy `.env` or `.env.local`; inject secrets through the hosting platform.
- Run only one scheduler instance, or use a dedicated worker/leader strategy when horizontally scaling the backend.

Build and start:

```bash
cd backend && npm ci && npm run build && npm start
cd frontend && npm ci && npm run build && npm start
```

The backend health endpoint is `GET /health`.

## Verification

```bash
cd backend && npm run lint && npm test && npm audit --omit=dev
cd frontend && npm run lint && npm run typecheck && npm run build && npm audit --omit=dev
```
