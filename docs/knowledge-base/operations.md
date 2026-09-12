# Operations

## Local setup

```bash
docker compose up -d postgres     # Postgres 16, host :5433, db smart_library, user/pass postgres/postgrespassword

cd server
pnpm install
cp .env.example .env              # if absent, create from the table below
pnpm db:generate
pnpm db:migrate                   # or pnpm db:push
pnpm db:seed                      # admin user
pnpm dev                          # :5000

cd ../client
pnpm install
pnpm dev                          # :3000, proxies /api/* to API_URL
```

## Environment

Server (`server/src/config/envVars.ts`, loaded with dotenv; missing required vars throw at boot).

Required: `PORT`, `DATABASE_URL`, `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`.

Optional with defaults: `NODE_ENV` (development), `ACCESS_TOKEN_EXPIRES_IN` (86400 s),
`REFRESH_TOKEN_EXPIRES_IN` (604800 s), `BCRYPT_SALT_ROUNDS` (12), `SUPER_ADMIN_NAME`,
`SUPER_ADMIN_EMAIL` (admin@library.com), `SUPER_ADMIN_PASSWORD` (admin123),
`FRONTEND_URL` (http://localhost:3000), `CORS_ORIGINS` (empty),
`SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`,
`CLOUDINARY_CLOUD_NAME`/`CLOUDINARY_API_KEY`/`CLOUDINARY_API_SECRET`.

### CORS

`app.ts` builds an allowlist from `FRONTEND_URL` plus `CORS_ORIGINS` (comma-separated;
trailing slashes are stripped on both sides). In `NODE_ENV=development` it also allows
`http://localhost:3000` and `http://127.0.0.1:3000`. Requests with no `Origin` header
(same-origin, server-to-server, curl) pass. Any other origin gets
`403 Not allowed by CORS`. `credentials: true` is required for the auth cookies, which is
exactly why a `*` origin is not usable here.

```bash
CORS_ORIGINS=https://library.example.com,https://staff.library.example.com
```

Note: token expiry values are seconds. `envVars.ts` contains hardcoded Cloudinary fallback
credentials — treat them as leaked, move to env, and never reproduce that pattern.

Local `DATABASE_URL` for the compose database:
`postgresql://postgres:postgrespassword@localhost:5433/smart_library`

Client: `API_URL` (default `http://localhost:5000`) used by the `next.config.ts` rewrite.

## Scripts

Server (`server/src/scripts/`, run with `tsx`):

- `seed-admin.ts` — `pnpm db:seed`; creates the super admin from env, idempotent.
- `seed-librarian.ts`, `seed-student.ts` — demo staff/student accounts.
- `seed-books.ts` — book catalog.
- `seed-zone-rules.ts` — zone rule text / capabilities.
- `extract-spec.ts` / `extract-spec.js` / `extract-spec-full.js` — spec extraction helpers.

Run any of them with `pnpm exec tsx ./src/scripts/<name>.ts` from `server/`.

## Migrations

`server/prisma/migrations/` — `20260717152200_init`, `20260826174135_init`.
Change the schema, then `pnpm db:migrate` (dev) and `pnpm db:generate`; commit the regenerated
`server/src/generated` output, which the code imports directly.

## Deployment notes

- `pnpm build` in `server/` emits `dist/` (committed in this repo); `pnpm start` runs it.
- Cron workers live inside the API process, so running more than one API instance duplicates
  no-show cancellations, fine accrual, and emails. Run a single instance or extract the scheduler.
- Set `FRONTEND_URL` (and `CORS_ORIGINS` for any extra browser origin) in production; unlisted
  origins are rejected with 403.

## Other artifacts

- `report/` — LaTeX thesis; `python compile.py` builds `main.pdf` from `chapters/*.tex`. `template/`
  holds the template copy.
- `system-diagram.drawio` / `.png` — architecture diagram.
- `library-seat-system-docs.docx`, `latest-requirement.txt` (empty) — requirement documents.
