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
- `/bookings/[id]` — single booking detail
- `/books`, `/books/[id]`
- `/dashboard` — student dashboard, one nested route per section, same sidebar shell as `/admin`:
  `/dashboard` overview, `/dashboard/bookings`, `/dashboard/loans`, `/dashboard/fines`,
  `/dashboard/profile`
- `/bookings` and `/loans` are `redirect()` stubs to their dashboard tabs — the old links stay alive
- `/seats`, `/check-in` (route folders)

Admin (`app/admin/(dashboardGroup)` with its own `layout.tsx`):

- `/admin` overview, `/admin/bookings`, `/admin/books`, `/admin/checkin`, `/admin/loans`,
  `/admin/schedules`, `/admin/settings`, `/admin/zones`, `/admin/zones/[id]`

## Dashboard shell (`components/shared/dashboard/`)

One sidebar + topbar shell serves both `/admin` and `/dashboard`; they differ only in the workspace
config handed to it, so the two consoles stay visually identical.

- `dashboard-nav.ts` — `WORKSPACES.admin` / `WORKSPACES.student` (portal label, home href, tabs,
  sidebar cross-link) plus `visibleTabs(workspace, role)`, which drops tabs a role may not open
  (System Settings is admin/super_admin only). `isStaffRole()` lives here too.
- `dashboard-layout.tsx` — the `h-screen` flex shell with an independently scrolling content column.
- `dashboard-sidebar.tsx` — branding, role-filtered tab list, cross-link, user menu.
- `dashboard-topbar.tsx` — breadcrumb + per-route title from the `routeTitles` map each layout owns,
  live clock, and an optional quick action (Scan QR for staff, Reserve a Seat for students).
- `user-menu.tsx` — the advance user menu: identity, role-aware shortcuts (My Dashboard, Profile,
  Admin Console for staff, Library Home) and **the only sign-out control in the app**. Rendered as a
  full-width card at the sidebar foot (`placement="top"`) and as a compact pill in the public navbar
  (`placement="bottom"`).

Route layouts (`app/admin/(dashboardGroup)/layout.tsx`, `app/dashboard/layout.tsx`) wrap the shell in
an `AuthGuard` — staff roles for `/admin`, any authenticated user for `/dashboard`.

The public navbar hides itself on `/admin/*` and `/dashboard/*`, since those render their own chrome.
It carries no My Seats / My Loans / logout controls; students reach them through the user menu.

## Data layer

`services/api-client.ts` — axios instance, `baseURL "/api/v1"`, `withCredentials: true`,
response interceptor returns `response.data`. On 401 (except `/auth/login` and `/auth/refresh`)
it calls `POST /auth/refresh` once, queues concurrent failures, replays them, and on failure
dispatches the `auth:unauthorized` window event. Server 5xx and Prisma-looking messages are
replaced with a generic message before reaching the UI. Errors surface as
`ApiError { message, status, data }`.

Domain services (one per API area): `auth-service`, `zone-service`, `seat-service`,
`booking-service`, `checkin-service`, `book-service`, `loan-service`, `schedule-service`,
`setting-service`, `user-service` (own profile, fine statement, OTP-gated email/password change). `lib/api.ts` and `lib/instance.ts` just re-export the client.

## Auth

`context/auth-context.tsx` bootstraps the session with `authService.getMe()`, clears legacy
`localStorage` / `library_user_session` entries, and exposes `user`, `isLoading`, login/register/
logout. `components/shared/auth-guard.tsx` gates client views. `proxy.ts` gates on cookie presence only:
`/admin/*` and `/dashboard/*` redirect to login with a `redirect` param when no token cookie is
present, and `/auth/login` + `/auth/register` redirect home when a live **accessToken** is present.
Only the access token counts for that second rule — a lone `refreshToken` cookie may be stale, and
bouncing on it used to lock students out of the auth pages entirely. A `?redirect=` parameter also
suppresses the bounce, because it means the app itself sent the user there after a 401.

### Profile changes (`/dashboard/profile`)

Name saves directly. Email and password changes are two-step: request a code, then verify it.
The email code goes to the **new** address (proving ownership); the password code goes to the
**current** address (so a stolen session alone cannot take the account). Both steps require the
current password. Codes are 6 digits, valid 10 minutes, single-use, 5 attempts.

## Seating UI

`components/shared/seating/` — `circle-table.tsx`, `cubicle-desk.tsx`, `meeting-table.tsx`,
`table-cluster-card.tsx`. They render seat clusters grouped by `tableNumber` and map `TableType`
to a layout. `booking-details-modal.tsx` shows QR + booking details and, for staff, the seat fine.

## Cancellation & fine UI

- `lib/booking-policy.ts` mirrors the server's fine rule so the UI can warn before the request.
- `shared/cancel-booking-modal.tsx` — live countdown inside the free window, explicit fee warning
  and resulting balance once it closes.
- `shared/settle-seat-fine-modal.tsx` — staff collect (cash / chalan / online) or waive.
- `shared/fine-lock-banner.tsx` — shown on `/book` and `/zones/[id]` when dues reach the limit;
  the reserve buttons are disabled alongside it.
- `pages/admin/settings-view.tsx` — "Seat Reservation Cancellation & Fine Policy" card.

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

## Faculty, verification and approvals

- `app/auth/verify-email/page.tsx` → `components/pages/auth/verify-email-form.tsx`: step two of
  signup. Students land on `/dashboard`; faculty get the "awaiting approval" panel because no
  session is issued. The route is in `proxy.ts` `PUBLIC_ROUTES`.
- `register-form.tsx` has a Student / Faculty account-type switch; faculty fields are
  `facultyId`, `department`, `designation`. `AuthContext.register` no longer auto-logs in —
  it returns `RegisterResult` and the form routes to `/auth/verify-email?email=`.
  `AuthContext.verifyEmail` sets the user only when no approval is pending.
- `lib/roles.ts` — `isSelfServiceRole(role)` (student or faculty) gates the seat-picking UI in
  `navbar`, `home-view`, `book-seat-view` and `zone-detail-view`; `canRequestFineWaiver(role)`.
- `/dashboard/waivers` → `components/pages/dashboard/faculty-waivers-view.tsx` (faculty-only nav
  tab): student lookup, petitionable fines, own petition history.
- `/admin/approvals` → `components/pages/admin/approvals-view.tsx` (admin only) and
  `/admin/waivers` → `components/pages/admin/waivers-view.tsx` (admin + librarian view, admin
  decides).
- `services/waiver-service.ts` and the admin calls added to `services/user-service.ts`.
