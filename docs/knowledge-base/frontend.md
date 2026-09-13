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

- `components/pages/auth/auth-shell.tsx`: split-screen shell shared by login, register and
  verify-email. Left is a date-due pocket card — aged paper, mono stamps, one blank rule left
  for the next borrower — built in markup, no image asset. Right is the form. The card
  collapses below `lg`. Pages pass `kicker`, `heading`, `subheading` and `footer`.
  `Navbar` returns null on `/auth/*`, so the auth group is full-bleed. `--font-mono` is
  registered in `globals.css` `@theme inline` so `font-mono` resolves to JetBrains Mono.
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
- `/admin/approvals` → `components/pages/admin/approvals-view.tsx` (admin only): status tabs with
  live tallies from `meta.counts`, debounced search, account-type filter, sort field + direction,
  page size and pager — all server-side through `userService.getPendingApprovals(params)`. And
  `/admin/waivers` → `components/pages/admin/waivers-view.tsx` (admin + librarian view, admin
  decides).
- `services/waiver-service.ts` and the admin calls added to `services/user-service.ts`.

## Navigation badges

`hooks/use-nav-badges.ts` polls `GET /dashboard/badges` (on mount, every 60s, on route change and
on window focus) and feeds `dashboard-sidebar.tsx`. A nav item opts in with `badgeKey` on its
`NavTabItem`, plus `badgeTone: "alert"` for queues that want attention rather than a neutral
tally. `formatBadgeCount` hides zero and caps at `99+`.

Failures are deliberately silent: a rejected request keeps the previous numbers and never renders
an error, because a badge must not be able to break the navigation. The badge replaces the
active-row dot when a count is present.

## Notices and reports

- `/admin/announcements` → `components/pages/admin/announcements-view.tsx`: publish, schedule, pin,
  edit, retire and republish, with state tabs, audience and priority filters, debounced search and
  paging.
- `/notice` → `components/pages/notices/notices-view.tsx`: the public notice board, inside the site
  navbar rather than the dashboard shell. The API only returns live notices for the account's role,
  so the view never filters after the fact. Opening it calls `markNoticesSeen`, which clears the
  navbar badge. `/dashboard/notices` redirects here so old links keep working.
- `/admin/reports` → `components/pages/admin/reports-view.tsx`: triage queue with status tabs and
  tallies, category/priority filters, search, sort and paging. The note in the triage modal is the
  email the reporter receives.
- `components/shared/report-issue-modal.tsx` is the only place a report is written. Every entry
  point opens it: the corner link on the home page and the "New report" button on
  `/dashboard/reports`. A signed-out visitor sees the modal explain that reporting needs an account
  and link to sign-in, rather than failing on submit.
- `components/pages/home/report-link.tsx` pins a quiet, link-styled `report` control to the bottom
  corner of the home page for every visitor. It sits above the mobile bottom navigation so it never
  covers those controls.
- `/dashboard/reports` → `components/pages/dashboard/my-reports-view.tsx` is now history only:
  status filter, the library's replies, and a button that opens the shared modal.
- `components/pages/home/notice-board.tsx` puts the three newest notices on the library home page,
  with "All notices" and "Report an issue" beside the heading. It renders only for a signed-in
  reader (the feed endpoint needs a session) and returns null when the feed is empty or the request
  fails, so the home page never shows an empty or broken card.
- `lib/notice-seen.ts` keeps a per-account "last opened the notice page" stamp in localStorage and
  fires `notices:seen`; `useNavBadges` sends it as `noticesSince` so `newAnnouncements` is an
  unseen count, and re-counts on that event. A blocked or cleared store just means every live
  notice reads as new once more.
- `Navbar` carries Notices and Report links (desktop pills; the mobile bar shows Report only for
  self-service roles, since staff already carry Scan QR and Admin there), and `UserMenu` lists both.
- `lib/announcement-labels.ts` holds the shared label and badge-style maps plus `formatNoticeDate`
  (relative inside a week, absolute beyond).
