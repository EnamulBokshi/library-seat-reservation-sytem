# Domain rules

## Settings (runtime config, `settings` table)

| Key | Default | Used by |
|---|---|---|
| `SLOT_CONFIG` | 4 slots below | `utils/time.ts` |
| `ADVANCE_BOOKING_DAYS` | 7 | booking window, schedule generation |
| `CHECKIN_GRACE_PERIOD_MINUTES` | 15 | grace-period cron |
| `MAX_BORROW_LIMIT` | 3 | loan quota |
| `BORROW_PERIOD_DAYS` | 10 | due date |
| `MAX_RENEWAL_LIMIT` | 3 | renewals |
| `FINE_RATE_PER_DAY` | 5 (BDT) | fine calc |
| `FINE_TIERS` | `[]` JSON `[{minDays, rate}]` | tiered fine calc |
| `WARNING_REMINDER_DAYS_BEFORE` | 2 | pre-due reminder mail |

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
| `* * * * *` | grace-period no-show cancel; 10-minute slot-ending warning mail; slot-expiry seat release |
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
`sendLoanOverdueAlertEmail`, `sendFinePaidReceiptEmail`, `sendSeatNoShowCancellationEmail`,
`sendBookingCancelledByAdminEmail`, `sendSeatSlotEndingWarningEmail` — all inline-HTML templates
sent through `sendHtmlEmail` (SMTP config in `envVars.SMTP`).
