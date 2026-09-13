# Domain rules

## Settings (runtime config, `settings` table)

| Key | Default | Used by |
|---|---|---|
| `SLOT_CONFIG` | 4 slots below | `utils/time.ts` |
| `ADVANCE_BOOKING_DAYS` | 7 | booking window, schedule generation |
| `CHECKIN_GRACE_PERIOD_MINUTES` | 15 | grace-period cron |
| `BOOKING_FREE_CANCEL_MINUTES` | 5 | free student cancellation window |
| `BOOKING_LATE_CANCEL_FINE` | 5 (BDT) | late cancellation fee |
| `BOOKING_LATE_CANCEL_LEAD_MINUTES` | 120 | how close to the slot a cancel becomes fineable |
| `BOOKING_NO_SHOW_FINE` | 5 (BDT) | auto-cancel no-show fee |
| `BOOKING_MAX_UNPAID_FINE_LIMIT` | 10 (BDT) | total dues at which seat booking locks |
| `MAX_BORROW_LIMIT` | 3 | loan quota |
| `BORROW_PERIOD_DAYS` | 10 | due date |
| `MAX_RENEWAL_LIMIT` | 3 | renewals |
| `FINE_RATE_PER_DAY` | 5 (BDT) | fine calc |
| `FINE_TIERS` | `[]` JSON `[{minDays, rate}]` | tiered fine calc |
| `WARNING_REMINDER_DAYS_BEFORE` | 2 | pre-due reminder mail |
| `FACULTY_LOAN_PERIOD_DAYS` | 365 | due date for a faculty loan |
| `FACULTY_MAX_BORROW_LIMIT` | 50 | faculty loan quota |
| `FACULTY_EXEMPT_SEAT_FINES` | `true` | faculty seat fines + dues lock off |
| `FACULTY_EXEMPT_NO_SHOW_CANCEL` | `true` | grace-period cron skips faculty |
| `FACULTY_EXEMPT_LOAN_FINES` | `true` | faculty loans never accrue an overdue fine |

Default slots (`DEFAULT_SLOT_CONFIG`): morning 08:00–12:00, noon 12:00–14:00,
afternoon 14:00–18:00, evening 18:00–21:00. Each has `label`, `icon`, `enabled`.
A stored `SLOT_CONFIG` is merged over the defaults.

## Seat booking (`booking.service.ts: createBooking`)

1. At least one seat required (`seatIds[]` or `seatId`); duplicates deduped.
2. Every seat must exist, be active, and belong to the same active zone.
3. Zone rules: `silent_desk` is single-seat only; multi-seat needs `zone.allowMultiSeat` and
   count ≤ `zone.maxSeatsPerBooking`.
4. Schedule must exist and be `isOpen`.
5. Date must not be in the past, not beyond `ADVANCE_BOOKING_DAYS`, and the slot must not be
   expired today (`isSlotExpired`).
6. One active booking per student (`pending | confirmed | checked_in`) — otherwise 409/400.
7. On success: booking created with a `qrToken`, QR PNG generated (`qrcode`), confirmation email
   dispatched.

## Seat cancellation fines (`lib/booking-fines.ts`, `booking.service.ts: cancelBooking`)

Staff cancellations never fine the student — only `role === student` is evaluated.

A student cancellation is fineable only when **both** hold:

1. `now - bookedAt` exceeds `BOOKING_FREE_CANCEL_MINUTES`, and
2. the slot is already running, or starts within `BOOKING_LATE_CANCEL_LEAD_MINUTES`.

The second condition exists because dropping a reservation days ahead of its slot leaves ample
time for another student to take the seat, so it causes none of the harm the fee exists to deter.
A fineable cancellation sets `fineAmount = BOOKING_LATE_CANCEL_FINE`, `fineStatus = unpaid`, writes
the elapsed time into `cancelReason`, and emails the student.

`evaluateCancellationFine()` is pure and mirrored on the client in `client/lib/booking-policy.ts`
so the confirmation modal can warn before the request; the server remains the authority.

## Seat booking eligibility (`assertSeatBookingEligibility`)

`createBooking` first sums the student's unpaid seat fines and unpaid loan fines. When the total
reaches `BOOKING_MAX_UNPAID_FINE_LIMIT` (`>=`, so two 5 BDT offences lock at the default 10), the
booking is refused with 403. `GET /booking/eligibility` returns the same summary for the UI banner.
Book borrowing keeps its own separate rule (any unpaid loan fine blocks) and ignores seat fines.

## No-show fines (`cron.service.ts: applyNoShowFines`)

Three workers can mark a booking `no_show`, and **all three** charge `BOOKING_NO_SHOW_FINE`
through the shared helper: the grace-period worker, the slot-expiry worker, and the slot boundary
cleanup. Fining only the first would let a student book a slot near its end, never show, and pay
nothing — cheaper than cancelling. The helper only touches rows with `fineStatus = none`, so a
settled or waived fine is never overwritten.

## Student fine statement (`user.service.ts: getMyFines`)

`GET /user/me/fines` returns the caller's seat fines and loan fines as two separate lists plus a
summary (`seatUnpaidTotal`, `loanUnpaidTotal`, `totalUnpaid`, `maxUnpaidFineLimit`,
`isBookingBlocked`, `remainingBalance`). Unlike `getUserUnpaidFinesSummary` it keeps settled and
waived rows, because the dashboard shows a statement rather than only what is owed. Students cannot
settle a fine themselves — payment stays a staff action at the desk.

## Profile changes with OTP (`user.service.ts`)

Name changes commit directly. Email and password changes are two-step and both require the current
password:

- Email: the code is mailed to the **new** address, which is what proves the student owns it. The
  address is re-checked for uniqueness at commit time, since another account may have claimed it
  while the code sat unused.
- Password: the code is mailed to the **current** address, so holding a stolen session is not
  enough to take over the account. The new password must differ from the old one.

Codes are 6 digits from `crypto.randomInt`, stored only as a bcrypt hash, valid 10 minutes and
single-use. Issuing a new code for a purpose deletes the previous one. Five wrong submissions burn
the code, which is what keeps six-digit space out of brute-force range.

## Seat fine settlement

`paySeatFine` records `paymentMethod`, `chalanNumber` (required for `chalan`), `finePaidAt` and
`fineReceivedById`, sets `fineStatus = paid`, and emails a receipt. `waiveSeatFine` sets
`waived` and appends the reason to `cancelReason`. Both refuse anything that is not currently
`unpaid` with a positive amount.

## FCFS quick assign (`getFCFSQuickAssign`)

Loads active zone seats ordered by `tableNumber`, `seatPosition`, `seatNumber`; subtracts seats
booked for that schedule (union of `bookingSeats` and direct `booking.seatId`) and `isOccupied`
seats. For `partySize > 1` it prefers one table cluster with enough free seats, else falls back to
the first N free seats. Errors: 409 when free seats < party size; 400 on zone-capability violations.

## Check-in / check-out (`checkin.service.ts: scanQR`)

- Looks up the booking by `qrToken`.
- Rejects `pending`, `completed`, `cancelled`, `no_show`.
- `confirmed` → entry scan: requires `isSlotActive(date, slot)`; in one transaction sets
  `checked_in` + `checkedInAt`, and `isOccupied = true` on all seats (primary + bookingSeats).
- `checked_in` → exit scan: completes the booking and releases seats.
- Returns `{ booking, action: "check_in" | "check_out", message }`.

## Cron workers (`services/cron.service.ts`, started by `initCronJobs` in `server.ts`)

| Schedule | Job |
|---|---|
| `* * * * *` | grace-period no-show cancel (+ fine); 10-minute slot-ending warning mail; slot-expiry seat release (+ fine) |
| `*/15 * * * *` | circulation: pre-due reminders, overdue detection, fine accrual, overdue mail |
| `0 12/14/18/21 * * *` | per-slot boundary cleanup (no-show + force checkout + seat release) |
| `0 0 * * *` | roll schedules forward `ADVANCE_BOOKING_DAYS` |

On startup it also ensures upcoming schedules and runs the circulation and slot-expiry checks once.

Grace period: a confirmed booking is auto-marked `no_show` once now ≥
`max(slotStart, bookedAt) + CHECKIN_GRACE_PERIOD_MINUTES`. The later-of rule exists so bookings
made mid-slot still get a full grace window.

Slot expiry: at slot end, `checked_in` → `completed` (+ `checkedOutAt`), `confirmed` → `no_show`;
all involved seats get `isOccupied = false`.

Email flags `slotWarningEmailSent`, `warningEmailSent`, `overdueEmailSent` are set before/with
sending to guarantee a single dispatch.

## Loans and fines (`loan.service.ts`, `setting.service.ts`)

- Eligibility (`checkStudentBorrowEligibility`): any loan with `fineStatus = unpaid` and
  `fineAmount > 0` blocks borrowing and renewal (403 with the amount and titles).
- `requestLoan`: book must be active with `availableCopies >= 1`; a student cannot hold two
  active loans (`requested | issued | overdue`) of the same book.
- `directIssueLoan` (desk flow): resolves book by barcode/ISBN/call number/uuid and student by
  identifier; blocks on unpaid fines or on `availableQuota < 1` (`MAX_BORROW_LIMIT`).
- Due date = `borrowDate + BORROW_PERIOD_DAYS` unless a custom due date is supplied.
- `renewLoan` (student): requires no unpaid fines, own loan, status `issued`, and not yet overdue —
  overdue books must be handled at the desk. `adminRenewLoan` is the staff override.
- `calculateLoanFine(dueDate, now)`: `daysOverdue = ceil(diff / 1 day)`. With `FINE_TIERS`, each
  overdue day is charged at the highest tier whose `minDays <= day`; otherwise
  `daysOverdue * FINE_RATE_PER_DAY`. Currency is BDT.
- `payLoanFine`: records `paymentMethod` (cash | chalan | online), `chalanNumber`, `finePaidAt`,
  `fineReceivedById`, sets `fineStatus = paid`, and emails a receipt.

## Emails (`services/email.service.ts`)

`sendBookingConfirmationEmail`, `sendLoanConfirmationEmail`, `sendLoanDueDateWarningEmail`,
`sendLoanOverdueAlertEmail`, `sendFinePaidReceiptEmail`, `sendSeatNoShowCancellationEmail`
(carries the no-show fee and running dues), `sendBookingCancelledByAdminEmail`,
`sendSeatSlotEndingWarningEmail`, `sendSeatLateCancellationEmail`, `sendSeatFinePaidReceiptEmail`,
`sendProfileOtpEmail` (verification code for an email or password change)
— all inline-HTML templates sent through `sendHtmlEmail` (SMTP config in `envVars.SMTP`).

## Faculty role

A faculty account is a self-service borrower like a student, with the exemptions below.
Every exemption is resolved through `lib/privileges.ts` (`getUserPrivileges(userId)` /
`getPrivilegesForRole(role)`), which reads the `FACULTY_*` settings — no scattered
`role === "faculty"` checks. Turning a `FACULTY_EXEMPT_*` setting to `false` makes faculty
behave exactly like a student for that rule.

| Rule | Student | Faculty |
|---|---|---|
| Unpaid dues lock seat booking | yes, at `BOOKING_MAX_UNPAID_FINE_LIMIT` | never (`isBookingBlocked` is false) |
| Late-cancellation fee | yes | none |
| Grace-period auto-cancel + no-show fee | yes | reservation is never auto-cancelled |
| Reservation left unscanned at slot end | `no_show` + fee | closed as `completed`, seat released, no fee |
| Loan due date | `BORROW_PERIOD_DAYS` (10) | `FACULTY_LOAN_PERIOD_DAYS` (365) |
| Borrow quota | `MAX_BORROW_LIMIT` (3) | `FACULTY_MAX_BORROW_LIMIT` (50) |
| Overdue fine + `overdue` status | yes | never while `FACULTY_EXEMPT_LOAN_FINES` is on |
| Unpaid dues block borrowing | yes | no |
| Request a fine waiver for a student | no | yes |

The seat is always released at slot end, faculty included — only the penalty is waived, never
the seat itself, or a faculty booking would hold a seat indefinitely.

## Registration, email verification and approval (`auth.service.ts`)

1. `POST /auth/register` accepts `role: student | faculty` only. Faculty must also send
   `facultyId` and `department`. The account is created `isActive: false`,
   `emailVerifiedAt: null`, and `approvalStatus` `pending` for faculty / `approved` for students.
   A 6-digit code is mailed (shared helpers in `lib/otp.ts`, 10-minute TTL, 5 attempts,
   60-second resend cooldown).
2. `POST /auth/verify-email` consumes the code. A student is activated and receives cookies;
   a faculty account records `emailVerifiedAt`, stays inactive, and every admin is emailed.
3. `PATCH /user/:id/approve` (admin) activates the faculty account and mails the applicant;
   `PATCH /user/:id/reject` records a reason shown at the applicant's next login attempt.
4. `POST /auth/login` refuses, after the password check, when the email is unverified
   (403), when approval is `pending` (403), when it is `rejected` (403, with the reason),
   and finally when the account is deactivated (401).

## Fine waiver petitions (`modules/waiver`)

A faculty member looks a student up (`GET /waiver/lookup?identifier=`), which lists only
`unpaid` fines and flags the ones with a petition already open. `POST /waiver` records the
petition with a snapshot of the amount; one open petition per fine. An admin decides it with
`PATCH /waiver/:id/decide`. Approval calls `FineService.waiveFine` first and only marks the
petition approved if that succeeds, so a fine that was paid in the meantime aborts the decision
instead of leaving the two records disagreeing.
