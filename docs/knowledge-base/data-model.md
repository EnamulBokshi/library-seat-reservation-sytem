# Data model

Source of truth: `server/prisma/schema.prisma` (PostgreSQL, snake_case table names via `@@map`).
Prisma client is generated to `server/src/generated`.

## Enums

- `Role`: admin | librarian | student | faculty
- `ZoneType`: silent_desk | group_study | computer_lab | open_reading | conference_room
- `TableType`: individual_cubicle | circle_table | meeting_table | booth_pod | workstation_bench
- `SlotType`: morning | noon | afternoon | evening
- `BookingStatus`: pending | confirmed | checked_in | completed | cancelled | no_show
- `LoanStatus`: requested | issued | returned | overdue | cancelled | rejected
- `FineStatus`: none | unpaid | paid | waived
- `PaymentMethod`: cash | chalan | online
- `OtpPurpose`: email_change | password_change | registration
- `ApprovalStatus`: pending | approved | rejected
- `WaiverRequestStatus`: pending | approved | rejected
- `AnnouncementAudience`: all | students | faculty | staff
- `AnnouncementPriority`: info | important | urgent
- `ReportCategory`: bug | service | facilities | environment | book | other
- `ReportStatus`: open | in_review | resolved | dismissed
- `ReportPriority`: low | normal | high

`client/lib/types.ts` mirrors these as string unions — update both together.

## Models

**User** (`users`) — id, name, email (unique), studentId (unique, nullable), passwordHash,
role (default student), isActive. Faculty fields: `facultyId` (unique, nullable), `department`,
`designation`. Signup gating: `emailVerifiedAt` (null until the registration OTP is consumed),
`approvalStatus` (default `approved`; faculty signups start `pending`), `approvedById`,
`approvedAt`, `rejectionReason`. Relations: bookings, loans, otps, waiverRequestsMade,
waiverRequestsReceived.

Migration `20260913130000_backfill_email_verified_at` set `emailVerifiedAt = createdAt` on rows
that predate verification, so existing accounts are not locked out by the login gate.

**FineWaiverRequest** (`fine_waiver_requests`) — requestedById (faculty), targetUserId (student),
exactly one of bookingId / loanId, `amount` (snapshot at request time), reason, status
(`WaiverRequestStatus`), decidedById, decidedAt, decisionNote. Indexes on status, requestedById,
targetUserId, bookingId, loanId. Approval waives the referenced fine through `FineService.waiveFine`,
so the booking / loan row stays the single source of truth for fine state.

**OtpVerification** (`otp_verifications`) — userId, purpose (`OtpPurpose`), `codeHash` (bcrypt —
the plaintext code is never stored), `newEmail` (target address for an `email_change`, else null),
attempts, expiresAt, consumedAt. Indexes `[userId, purpose]`, `[expiresAt]`. Rows are deleted on
use, on expiry, and when the attempt ceiling is hit, so the table stays a short-lived queue.

**Zone** (`zones`) — name (unique), description, color, zoneType, `allowMultiSeat`,
`maxSeatsPerBooking` (default 1), `defaultTableType`, `rules String[]`, isActive. Has seats.
Zone capability fields drive multi-seat booking permission.

**Seat** (`seats`) — seatNumber, zoneId, tableNumber, tableType, tableCapacity, seatPosition,
isActive, `isOccupied`. Unique `[zoneId, seatNumber]`; index `[zoneId, tableNumber]`.
Seats are grouped into table clusters by `tableNumber`; `isOccupied` is live physical occupancy,
set on check-in and cleared on check-out/slot expiry.

**Schedule** (`schedules`) — date (`@db.Date`), slot, isOpen. Unique `[date, slot]`.
Generated ahead by `BookingService.ensureUpcomingSchedules(advanceDays)`.

**Booking** (`bookings`) — userId, seatId (nullable, `SetNull`), scheduleId, guestCount, status,
`qrToken` (unique uuid), bookedAt, checkedInAt, checkedOutAt, cancelledAt, cancelReason,
`slotWarningEmailSent`; fine block mirroring `BookLoan`: fineAmount, fineStatus, paymentMethod,
chalanNumber, finePaidAt, fineReceivedById. Indexes `[userId, status]`, `[qrToken]`,
`[userId, fineStatus]`.

**BookingSeat** (`booking_seats`) — join table for multi-seat/group bookings. Unique
`[bookingId, seatId]`. Note: a booking may carry both `seatId` (primary seat) and `bookingSeats`
rows; seat-availability logic must union both.

**Setting** (`settings`) — key (unique), value (string), description. Runtime configuration.

**Book** (`books`) — title, author, isbn (unique), barcode (unique), category, publisher,
publicationYear, edition, description, coverImage, pdfUrl, totalCopies, availableCopies,
plus spatial index: `block`, `shelfNumber`, `rowNumber`, `callNumber`. Indexes on category,
`[block, shelfNumber]`, barcode.

**BookLoan** (`book_loans`) — bookId, userId, borrowDate, dueDate, returnDate, renewCount,
status, notes, approvedById; fine block: fineAmount, fineStatus, paymentMethod, chalanNumber,
finePaidAt, fineReceivedById; email flags: warningEmailSent, overdueEmailSent.
Indexes `[userId, status]`, `[bookId, status]`, `[fineStatus]`.

## Invariants

- One active booking per student (`pending | confirmed | checked_in`).
- All seats in one booking belong to the same zone.
- `availableCopies` decrements on issue and increments on return; never below 0.
- A student with any `fineStatus = unpaid` and `fineAmount > 0` on a **loan** cannot borrow or renew.
- Seat reservations are refused once unpaid seat fines **plus** unpaid loan fines reach
  `BOOKING_MAX_UNPAID_FINE_LIMIT`. Loan borrowing does not count seat fines.
- `datasource db` has no inline `url`; it comes from `DATABASE_URL`.

**Announcement** (`announcements`) — title, `content` (the notice text), audience, priority,
isPinned, isActive, publishedAt (a future value schedules the notice), expiresAt (null stands
until retired by hand), createdById. Indexes `[isActive, audience, publishedAt]`, `[isPinned]`.

The text column is `content`, not `body`, on purpose: `requestValidator` treats a Zod schema
carrying a top-level `body` key as the wrap-the-request convention (`{body, query, params}`), so a
payload field named `body` silently fails validation. Migration
`20260914100000_rename_announcement_body_to_content` renamed it.

**Report** (`reports`) — reporterId, category, priority, status, subject, description, location
(free text, optional), staffNote (the reply the reporter sees), handledById, handledAt. Indexes
`[status, createdAt]`, `[reporterId, status]`, `[category]`. Reaching `resolved` or `dismissed`
stamps who handled it; moving back to an open state clears that stamp.
