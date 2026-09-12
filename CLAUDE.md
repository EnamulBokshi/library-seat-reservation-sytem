# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

Smart Library Management — seat reservation + book circulation system for a university library.
Monorepo with two independent apps (no workspace root package.json):

- `server/` — Express 5 + TypeScript REST API, Prisma 7 / PostgreSQL.
- `client/` — Next.js 16 (App Router) + React 19 + Tailwind v4 UI.
- `report/`, `template/` — LaTeX academic report (`compile.py` builds `main.pdf`).
- `system-diagram.drawio(.png)` — architecture diagram.

Detailed knowledge base lives in `docs/knowledge-base/`. Read the relevant file before
non-trivial work:

| File | Contents |
|---|---|
| `docs/knowledge-base/architecture.md` | Runtime topology, request flow, layering conventions |
| `docs/knowledge-base/data-model.md` | Prisma models, enums, invariants |
| `docs/knowledge-base/api-reference.md` | Every route, method, role guard |
| `docs/knowledge-base/domain-rules.md` | Booking, check-in, loan, fine, cron business rules |
| `docs/knowledge-base/frontend.md` | Next.js routes, components, services, auth flow |
| `docs/knowledge-base/operations.md` | Env vars, scripts, seeding, local setup |

## Commands

Backend (`cd server`, pnpm):

```bash
pnpm dev            # nodemon + tsx, src/server.ts
pnpm build          # tsc -> dist/
pnpm start          # node dist/server.js
pnpm db:generate    # prisma generate (output: src/generated — checked in)
pnpm db:migrate     # prisma migrate dev
pnpm db:push        # prisma db push
pnpm db:studio
pnpm db:seed        # seed admin; see also seed-books/librarian/student/zone-rules via tsx
```

Frontend (`cd client`, pnpm):

```bash
pnpm dev
pnpm build
pnpm typecheck      # tsc --noEmit — run this after client edits
pnpm lint
pnpm format
```

Database: `docker compose up -d postgres` (Postgres 16, host port **5433**, db `smart_library`).

There is no test suite. `server` has `"test": exit 1`. Verify changes with `pnpm typecheck`
(client), `pnpm build` (server), and manual API calls.

## Conventions

Server module layout — every domain under `server/src/modules/<name>/`:

```
<name>.route.ts | <name>.router.ts   Express router, authCheck(...roles) + requestValidator(zodSchema)
<name>.controller.ts                 catchAsync wrapper, calls service, replies via sendResponse
<name>.service.ts                    all business logic + Prisma access; throws AppError(status, message)
<name>.validation.ts                 Zod schemas
<name>.interface.ts                  payload types
```

Follow this layering strictly: no Prisma calls in controllers, no `res` handling in services.

- Errors: `throw new AppError(httpStatus, userFacingMessage)`; `GlobalErrorHandler` formats
  responses and hides internals on 500. Zod errors become 400 with field details.
- Responses: always `sendResponse(res, { httpStatusCode, success, data, message, meta })` —
  JSON shape `{ success, data, message, meta }`.
- Prisma client is generated into `server/src/generated` (custom output, committed). Import
  enums from `../../generated/enums`, client from `../../lib/prisma`.
- Auth: JWT access/refresh tokens in **httpOnly cookies**, not headers. Guard with
  `authCheck()` (any authenticated) or `authCheck("admin", "librarian")`.
- Config is read from the `settings` table at runtime (slot times, fine rates, borrow limits),
  with hardcoded fallbacks in `utils/time.ts` and `setting.service.ts`. Prefer adding a setting
  key over a new constant.

Client:

- Server Components in `app/**/page.tsx` stay thin; the interactive UI lives in
  `components/pages/**` as `"use client"` views.
- All HTTP goes through `services/*-service.ts` → `services/api-client.ts` (axios, `baseURL
  "/api/v1"`, `withCredentials`, auto refresh-on-401 with request queue).
- `next.config.ts` rewrites `/api/:path*` to `API_URL` (default `http://localhost:5000`) in
  `beforeFiles`, so the browser never talks to the API host directly.
- `proxy.ts` does cookie-presence route gating; real authorization is server-side.
- Types live in `client/lib/types.ts` — strict, no `any`. Keep them in sync with Prisma enums.
- Import alias `@/*` → client root.

Next.js note: `client/AGENTS.md` warns this Next.js version differs from training data — check
`client/node_modules/next/dist/docs/` before using unfamiliar App Router APIs.

## Gotchas

- `server/dist/` is committed build output — never edit it by hand.
- `server/src/modules/student/student.route.ts` is an empty placeholder.
- `envVars.ts` currently ships hardcoded Cloudinary fallback credentials; do not copy that
  pattern, and do not print secrets.
- CORS is an explicit allowlist (`FRONTEND_URL` + `CORS_ORIGINS`) because auth cookies forbid a
  `*` origin. A new browser origin must be added to `CORS_ORIGINS` or it gets 403.
- Cron workers run every minute inside the API process (`initCronJobs`), so a long-running
  local server mutates booking/loan state over time.
