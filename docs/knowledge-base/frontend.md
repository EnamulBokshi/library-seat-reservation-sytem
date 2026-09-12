# Frontend

Next.js 16 App Router, React 19, Tailwind v4, `@base-ui/react` + shadcn-style `components/ui`,
lucide icons, `next-themes`, `html5-qrcode` for scanning. Package manager pnpm. Alias `@/*` → root.

## Routes (`client/app`)

Public / student:

- `/` — home (`components/pages/home-view.tsx` + `home/*`: hero, zones carousel, telemetry stats,
  amenities, staff on duty, student moments)
- `/auth/login`, `/auth/register`
- `/zones`, `/zones/[id]`
- `/book` — seat booking flow (`pages/booking/book-seat-view.tsx`)
- `/bookings`, `/bookings/[id]`
- `/books`, `/books/[id]`
- `/loans`
- `/seats`, `/check-in` (route folders)

Admin (`app/admin/(dashboardGroup)` with its own `layout.tsx`):

- `/admin` overview, `/admin/bookings`, `/admin/books`, `/admin/checkin`, `/admin/loans`,
  `/admin/schedules`, `/admin/settings`, `/admin/zones`, `/admin/zones/[id]`

Admin chrome: `components/admin/admin-sidebar.tsx`, `admin-topbar.tsx`, `admin-user-menu.tsx`.

## Data layer

`services/api-client.ts` — axios instance, `baseURL "/api/v1"`, `withCredentials: true`,
response interceptor returns `response.data`. On 401 (except `/auth/login` and `/auth/refresh`)
it calls `POST /auth/refresh` once, queues concurrent failures, replays them, and on failure
dispatches the `auth:unauthorized` window event. Server 5xx and Prisma-looking messages are
replaced with a generic message before reaching the UI. Errors surface as
`ApiError { message, status, data }`.

Domain services (one per API area): `auth-service`, `zone-service`, `seat-service`,
`booking-service`, `checkin-service`, `book-service`, `loan-service`, `schedule-service`,
`setting-service`. `lib/api.ts` and `lib/instance.ts` just re-export the client.

## Auth

`context/auth-context.tsx` bootstraps the session with `authService.getMe()`, clears legacy
`localStorage` / `library_user_session` entries, and exposes `user`, `isLoading`, login/register/
logout. `components/shared/auth-guard.tsx` gates client views. `proxy.ts` redirects on cookie
presence only — `/auth/*` away when logged in, `/admin/*` to login with a `redirect` param when not.

## Seating UI

`components/shared/seating/` — `circle-table.tsx`, `cubicle-desk.tsx`, `meeting-table.tsx`,
`table-cluster-card.tsx`. They render seat clusters grouped by `tableNumber` and map `TableType`
to a layout. `booking-details-modal.tsx` shows QR + booking details.

## Types

`lib/types.ts` is the single strict type surface (no `any`): Role, Zone/ZoneType/TableType, Seat,
TableCluster, SlotType/SlotConfig, Schedule, Booking/BookingSeat/BookingStatus, CheckIn*,
DashboardStats, Book, BookLoan/LoanStatus, FineStatus, PaymentMethod, plus payload and query
param interfaces. Keep aligned with `server/prisma/schema.prisma`.

## Notes

- `client/AGENTS.md`: this Next.js version has breaking changes vs. training data — consult
  `node_modules/next/dist/docs/` before using unfamiliar APIs.
- `client/build-state.md` is a historical phase checklist, not current truth.
- Verify UI changes with `pnpm typecheck` then `pnpm build`.
