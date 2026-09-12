# Architecture

## Topology

```
Browser ──> Next.js 16 (client, :3000)
              │  app/** RSC pages -> components/pages/** client views
              │  services/api-client.ts (axios, baseURL "/api/v1", withCredentials)
              │  next.config.ts rewrite: /api/:path* -> ${API_URL}/api/:path*
              ▼
            Express 5 API (server, :5000)
              │  routes/index.ts -> modules/<domain>/<domain>.route.ts
              │  middleware: cors, json, urlencoded, cookieParser, requestLogger
              │  authCheck(JWT cookie) -> requestValidator(zod) -> controller -> service
              ▼
            Prisma 7 (@prisma/adapter-pg) -> PostgreSQL 16 (docker, host :5433)

            node-cron workers run in-process (services/cron.service.ts)
            Email via nodemailer/SMTP (services/email.service.ts), images via Cloudinary
```

The browser never calls the API origin directly; all traffic is same-origin through the Next.js
rewrite, which keeps httpOnly auth cookies first-party.

## Server layering

`server/src/`

- `server.ts` — boots `app`, listens on `envVars.PORT`, calls `initCronJobs()`.
- `app.ts` — CORS allowlist (`FRONTEND_URL` + `CORS_ORIGINS`, credentials enabled), middleware
  chain, health check `GET /`, mounts `/api/v1`, then `NotFoundMiddleware`, then
  `GlobalErrorHandler` (order matters).
- `routes/index.ts` — mounts 10 domain routers: auth, student, zone, seat, booking, checkin,
  setting, schedule, book, loan.
- `modules/<domain>/` — route → controller → service → Prisma. Validation and interfaces beside them.
- `middleware/` — `authCheck` (JWT + role), `requestValidator` (zod), `requestLogger`, `404`.
- `helpers/` — `AppError`, `CatchAsync`, `GlobarErrorHandler` (sic), `SendResponse`.
- `lib/` — `prisma` client singleton, `cloudinary`, `auth`, `checkin`.
- `utils/` — `jwt`, `cookie`, `token`, `time` (slot config/expiry), `QueryBuilders`, `email`.
- `services/` — `cron.service.ts` (schedulers), `email.service.ts` (HTML mail templates).
- `generated/` — Prisma client output (committed); import enums from `generated/enums`.
- `scripts/` — seeders and spec extractors.
- `dist/` — committed compiled output; do not edit.

## Request pipeline

1. `authCheck(...roles)` reads `accessToken` cookie, verifies with `ACCESS_TOKEN_SECRET`,
   re-loads the user from the DB, rejects inactive users, enforces roles, attaches
   `req.user = { userId, email, role }`.
2. `requestValidator(schema)` parses with Zod. If the schema has a `body` key it parses
   `{ body, query, params }`; otherwise it parses `req.body` directly.
3. Controller wraps the call in `catchAsync` and replies with `sendResponse`.
4. Service holds all business rules and Prisma access; failures are `AppError`.
5. `GlobalErrorHandler` maps `AppError` → its status, `ZodError` → 400 with field details,
   anything else → 500 with a generic message (stack only in development).

## Client layering

- `app/**/page.tsx` — React Server Components, thin; render a client view.
- `components/pages/**` — `"use client"` feature views holding state and data fetching.
- `components/shared/**`, `components/admin/**`, `components/ui/**` — reusable pieces.
- `context/auth-context.tsx` — session bootstrap via `authService.getMe()`, exposes
  `user`, `isLoading`, login/logout; listens for the `auth:unauthorized` window event.
- `services/*` — one module per API domain, all through `api-client`.
- `proxy.ts` — Next request proxy: redirects authenticated users away from `/auth/*` and
  unauthenticated visitors away from `/admin/*` (cookie presence only, not a security boundary).
