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

## Academy AI chatbot

The public marketing site includes a Gemini 2.5 Flash assistant backed by a
MongoDB knowledge index. The index combines curated public website content with
current public course, roadmap, coach, batch, event, site-config, and testimonial
records. Private student data, internal notes, class links, coach contact details,
and payment records are never indexed.

Set these server-side backend variables before deployment:

```bash
GEMINI_API_KEY=your_google_ai_studio_key
GEMINI_CHAT_MODEL=gemini-2.5-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
RAG_TOP_K=4
RAG_REFRESH_MINUTES=15
```

The backend refreshes changed knowledge in the background on startup and on
demand. To build the full index explicitly after configuring the key:

```bash
cd backend && npm run rag:index
```

Keep `GEMINI_API_KEY` on the backend only; never expose it through a
`NEXT_PUBLIC_*` variable.

## Verification

```bash
cd backend && npm run lint && npm test && npm audit --omit=dev
cd frontend && npm run lint && npm run typecheck && npm run build && npm audit --omit=dev
```
