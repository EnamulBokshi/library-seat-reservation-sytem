# API reference

Base path `/api/v1`. All responses: `{ success, data, message, meta }`.
Auth is by httpOnly cookies (`accessToken`, `refreshToken`) — no Authorization header.
Guard notation: `public`, `auth` (any authenticated), or the allowed roles.

Health check: `GET /` (root, outside `/api/v1`).

## auth — `modules/auth/auth.router.ts`

| Method | Path | Guard | Notes |
|---|---|---|---|
| POST | `/auth/register` | public | zod `registerSchema` |
| POST | `/auth/login` | public | sets access + refresh cookies |
| POST | `/auth/refresh` | public | reads refresh cookie |
| GET | `/auth/me` | auth | current user |
| POST | `/auth/logout` | public | clears cookies |

## zone — `modules/zone/zone.route.ts`

| Method | Path | Guard |
|---|---|---|
| POST | `/zone` | admin |
| GET | `/zone` | auth |
| GET | `/zone/:id` | auth |
| PATCH | `/zone/:id` | admin |
| DELETE | `/zone/:id` | admin |
| POST | `/zone/:id/seats` | admin, librarian |
| POST | `/zone/:id/tables` | admin, librarian (create one table cluster) |
| POST | `/zone/:id/tables/bulk` | admin, librarian |
| DELETE | `/zone/:id/tables/:tableNumber` | admin, librarian |
| GET | `/zone/:id/seats` | auth (availability-aware seat map) |

## seat — `modules/seat/seat.route.ts`

| Method | Path | Guard |
|---|---|---|
| PATCH | `/seat/:id` | admin, librarian |
| DELETE | `/seat/:id` | admin, librarian |

## booking — `modules/booking/bookings.router.ts`

| Method | Path | Guard | Notes |
|---|---|---|---|
| POST | `/booking` | student, admin, librarian | single or multi-seat; returns QR image |
| GET | `/booking/my` | student, admin, librarian | |
| GET | `/booking` | admin, librarian | paginated/filterable |
| GET | `/booking/fcfs-suggest` | student, admin, librarian | 1-click auto-assign |
| GET | `/booking/schedules` | auth | open upcoming slots |
| GET | `/booking/stats` | auth | dashboard analytics |
| GET | `/booking/eligibility` | student, admin, librarian | unpaid dues + reservation lock state; registered before `/:id` |
| GET | `/booking/:id` | auth | |
| DELETE | `/booking/:id` | student, admin, librarian | cancel; student cancels may incur a late fee |
| POST | `/booking/:id/pay-fine` | admin, librarian | settle a seat fine (cash / chalan / online) |
| POST | `/booking/:id/waive-fine` | admin, librarian | waive a seat fine |

## checkin — `modules/checkin/checkin.route.ts`

| Method | Path | Guard |
|---|---|---|
| POST | `/checkin` | admin, librarian (QR token scan; toggles entry/exit) |

## schedule — `modules/schedule/schedule.router.ts`

| Method | Path | Guard |
|---|---|---|
| GET | `/schedule` | admin, librarian (date range + booking stats) |
| PATCH | `/schedule/:id` | admin, librarian (toggle open/closed) |
| POST | `/schedule/bulk-toggle` | admin |
| POST | `/schedule/generate` | admin (roll schedules N days ahead) |

## book — `modules/book/book.route.ts`

| Method | Path | Guard | Notes |
|---|---|---|---|
| GET | `/book/categories` | public | |
| GET | `/book/spatial-index` | public | block/shelf index |
| GET | `/book` | public | search + pagination |
| GET | `/book/:id` | public | |
| POST | `/book/upload-image` | admin, librarian | multer `image` → Cloudinary |
| POST | `/book` | admin, librarian | multer + zod |
| PATCH | `/book/:id` | admin, librarian | |
| DELETE | `/book/:id` | admin, librarian | |

## loan — `modules/loan/loan.route.ts`

| Method | Path | Guard | Notes |
|---|---|---|---|
| POST | `/loan/request` | student, admin, librarian | student-initiated request |
| GET | `/loan/my-loans` | student, admin, librarian | |
| POST | `/loan/:id/renew` | student, admin, librarian | self renew |
| GET | `/loan/lookup-book/:identifier` | admin, librarian | barcode / ISBN / call number / uuid |
| GET | `/loan/lookup-student/:identifier` | admin, librarian | returns student, unpaid fines, quota |
| GET | `/loan/stats` | admin, librarian | circulation stats |
| GET | `/loan` | admin, librarian | all loans, filterable |
| POST | `/loan/direct-issue` | admin, librarian | desk barcode issue |
| PATCH | `/loan/:id/status` | admin, librarian | approve/reject/issue |
| POST | `/loan/:id/return` | admin, librarian | |
| POST | `/loan/:id/pay-fine` | admin, librarian | cash / chalan / online |
| POST | `/loan/:id/admin-renew` | admin, librarian | |

## user — `modules/user/user.route.ts`

Student self-service profile and dues. All routes act on the caller's own record.

| Method | Path | Guard | Notes |
|---|---|---|---|
| GET | `/user/me` | auth | own profile (adds `isActive` over `/auth/me`) |
| PATCH | `/user/me` | auth | change display name; no verification step |
| GET | `/user/me/fines` | auth | seat + loan fine statement with dues summary |
| POST | `/user/me/email/request-otp` | auth | needs current password; mails a code to the NEW address |
| POST | `/user/me/email/verify` | auth | commits the email change |
| POST | `/user/me/password/request-otp` | auth | needs current password; mails a code to the CURRENT address |
| POST | `/user/me/password/verify` | auth | current password + new password + code |

## setting — `modules/setting/setting.route.ts`

| Method | Path | Guard |
|---|---|---|
| GET | `/setting/public/config` | public (slot config + advance booking days) |
| GET | `/setting` | admin, librarian |
| GET | `/setting/:key` | auth |
| PATCH | `/setting/:key` | admin (upsert) |

## student — `modules/student/student.route.ts`

Empty placeholder router mounted at `/student`.
