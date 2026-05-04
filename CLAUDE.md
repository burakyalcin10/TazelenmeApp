# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo layout

Two independent npm workspaces, no root `package.json`. Always run commands from inside one of these:

- `backend/` — Express 5 + TypeScript + Prisma 7 (PostgreSQL)
- `frontend/` — Next.js 16 (App Router) + React 19 + Tailwind 4 + shadcn/ui

## Commands

### Backend (`cd backend`)

| Task | Command |
|------|---------|
| Dev server (ts-node-dev, watch) | `npm run dev` |
| Compile to `dist/` | `npm run build` |
| Run compiled server | `npm start` |
| Generate Prisma client | `npm run prisma:generate` |
| Create+apply dev migration | `npm run prisma:migrate` |
| Run seed (idempotent) | `npm run prisma:seed` |
| Prisma Studio | `npm run prisma:studio` |

### Frontend (`cd frontend`)

| Task | Command |
|------|---------|
| Dev server | `npm run dev` |
| Production build | `npm run build` |
| Lint (bare `eslint`, no path arg) | `npm run lint` |

No test framework is wired up in either workspace — there is no `npm test`. Don't fabricate one.

### Docker

- Full stack: `docker compose up --build -d` (frontend :3000, backend :4000, db **:5433** on host → 5432 in container).
- DB only (for local backend/frontend dev): `docker compose up -d db`.
- Inspect backend container: `docker exec -it tazelenme-backend npx prisma migrate status`.
- Reseed: `docker exec -it tazelenme-backend npm run prisma:seed`.

The backend container `CMD` runs `prisma migrate deploy && node dist/prisma/seed.js && node dist/server.js` on every start, so **the seed must remain idempotent** (see commit `2cdba1c`).

## Architecture

### Request flow (frontend)

This is the most non-obvious thing in the repo:

1. Client components call **`/api/v1/*` on Next**, not the backend directly.
2. `frontend/src/app/api/v1/[...path]/route.ts` is a catch-all proxy. It reads the session cookie server-side, injects `Authorization: Bearer <accessToken>`, and forwards to `INTERNAL_API_URL` (or falls back to `NEXT_PUBLIC_API_URL`).
3. Server components / server actions can call the backend directly via `apiRequest` in `frontend/src/lib/api.ts`.

**Proxy is binary-safe**: request and response bodies are passed as `ReadableStream` (no `.text()` / `.blob()` in the proxy). This is required for multipart upload (PDF materials) and stream download. The route exports `runtime = "nodejs"` because edge fetch doesn't support `duplex: "half"`. Do NOT add `await req.text()` or similar — it will corrupt PDFs and multipart boundaries.

Session storage is a **non-httpOnly** cookie named `tazelenme-session` containing JSON `{ accessToken, refreshToken, user }`. The non-httpOnly is intentional — `apiRequest` reads it client-side. Don't "harden" to httpOnly without rewiring the proxy assumption.

Token refresh: 401 responses trigger a single in-flight `refreshSession()` (deduped via the `refreshPromise` module-level promise in `lib/api.ts`), then the original request retries once.

Route protection lives in `frontend/src/middleware.ts`:
- `/admin/*` → ADMIN only (STUDENT redirected to `/student`)
- `/student/*` → STUDENT only (ADMIN redirected to `/admin`)
- `/login` → authenticated users redirected by role

The `matcher` only covers those three prefixes — middleware does **not** run on other routes.

### Backend routing

All routes mount under `/api/v1/*` from `backend/src/server.ts`. Health check is `/api/health` (no version prefix). Sprint groupings in `server.ts` are meaningful:

- Sprint 1 — `auth`
- Sprint 2 — `students`, `attendance`, `cards`
- Sprint 3 — `notifications`, `courses`, `classrooms`, `sessions`, `enrollments`, `materials`, `reports`, `student` (portal)
- Admin-only manual trigger: `GET /api/v1/admin/run-isolation-check`

Errors throw `AppError(message, statusCode)` from `backend/src/middlewares/errorHandler.ts`. The handler emits `{ success: false, error }`; success responses follow `{ success: true, data }`. Match this shape in new endpoints.

### Auth model

Login is **TC No (Turkish national ID) + 4-digit PIN**, not email/password.

- TC stored in two columns on `User`: `tcNoEncrypted` (AES-256-GCM, see `backend/src/utils/encryption.ts`) and `tcNoHash` (SHA-256, the unique lookup key). KVKK requirement.
- PIN is argon2-hashed.
- JWT pair (access + refresh) issued at `/auth/login`, refreshed at `/auth/refresh`.
- Roles: `ADMIN`, `STUDENT` (Prisma `Role` enum).
- Use `authenticate` then `authorize('ADMIN')` from `backend/src/middlewares/auth.ts` to gate routes.
- IoT endpoints use a separate `authenticateDevice` middleware that checks `x-api-key` against `IOT_API_KEY`.

### Prisma setup (v7 quirks)

- Uses `@prisma/adapter-pg` driver adapter, not the default engine. `backend/src/utils/prisma.ts` builds a `pg.Pool` and wraps it.
- **Production sets `ssl: { rejectUnauthorized: false }`** for Render PostgreSQL (commit `33754a0`). Anyone swapping providers needs to know this.
- Configuration is in `backend/prisma.config.ts` (Prisma v7 config file). The `datasource` block in `schema.prisma` has no `url` — it comes from the config file. CLI commands need `prisma.config.ts` present (the Dockerfile copies it explicitly).
- One migration so far: `20260408000000_sprint3_kvkk_encryption`.

### Cron

`backend/src/jobs/isolationCheck.ts` runs every Friday 18:00 Europe/Istanbul via `node-cron`. It scans the last 21 days, flips `StudentProfile.isAtRisk`, and creates an `ISOLATION_RISK` notification for students who attended zero sessions in their enrolled courses. Manual trigger: `GET /api/v1/admin/run-isolation-check` (ADMIN-only).

### Material storage and access control

PDFs land on disk under `backend/uploads/materials/{courseId}/{ts}-{rand}.pdf`. `material.url` in the DB stores the URL-shaped path `/uploads/{...}`, **not** a disk path. To read or delete the file on disk, always go through `resolveMaterialFilePath()` in `material.controller.ts` — it maps the URL to an absolute path under `UPLOAD_ROOT` and rejects path traversal. Never `path.join(__dirname, '..', '..', material.url)` directly; the leading `/` in `material.url` makes that fragile and Windows-broken.

Multer (`material.routes.ts`) requires `courseId` as a multipart text field **before** the file field. The frontend's `FormData.set("courseId", ...)` ordering already guarantees this; the destination callback throws if it's missing or non-alphanumeric.

Access control:
- `getMaterialById` and `downloadMaterial` both check enrollment when the caller is a STUDENT. ADMIN bypasses the check. Don't add new material endpoints without the same guard.
- `student-portal.controller.ts:getMyCourses` deliberately **does not spread** the raw material row (`...m`) to the response — it would leak the on-disk URL. It returns a fixed shape with `downloadUrl` (the API endpoint, not the disk path) and sets `url: null` for PDFs.

`uploads/` is **not** inside the Docker image (`Dockerfile` only copies `dist/`). docker-compose mounts a named volume `tazelenme-uploads` for local persistence. **On Render's free/starter tiers the filesystem is ephemeral** — uploaded PDFs vanish on container restart while the DB rows persist, leading to "Dosya sunucuda bulunamadı" 404s. For production beyond demo, swap to S3/R2 (not yet implemented).

### Frontend build mode toggle

`frontend/next.config.ts` only emits `output: "standalone"` when `DOCKER_BUILD=1`. The Docker build sets it; Vercel deploys do not. **Don't unconditionally enable standalone** — it breaks the Vercel deploy.

## Required env vars

Backend (see `docker-compose.yml`):
- `DATABASE_URL`
- `JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`
- `IOT_API_KEY`
- `FRONTEND_URL` — comma-separated CORS allowlist (parsed in `server.ts`)
- `ENCRYPTION_KEY` — **must be exactly 64 hex chars (32 bytes)**; `encryption.ts` throws otherwise. Generate with `openssl rand -hex 32`.

Frontend:
- `NEXT_PUBLIC_API_URL` — browser-facing backend URL
- `INTERNAL_API_URL` — server-side URL used by the `/api/v1/*` proxy route (e.g. `http://backend:4000` inside Docker)

## Conventions

- **User-facing strings (errors, logs, notification text) are in Turkish.** Code identifiers are English. Match existing language when adding new copy.
- Use the `pino` logger from `backend/src/utils/logger.ts`, not `console.*`.
- Database access goes through the singleton in `backend/src/utils/prisma.ts` — don't instantiate `PrismaClient` directly.
