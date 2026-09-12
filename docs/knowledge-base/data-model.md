# Data model

Source of truth: `server/prisma/schema.prisma` (PostgreSQL, snake_case table names via `@@map`).
Prisma client is generated to `server/src/generated`.

## Enums

- `Role`: admin | librarian | student
- `ZoneType`: silent_desk | group_study | computer_lab | open_reading | conference_room
- `TableType`: individual_cubicle | circle_table | meeting_table | booth_pod | workstation_bench
- `SlotType`: morning | noon | afternoon | evening
- `BookingStatus`: pending | confirmed | checked_in | completed | cancelled | no_show
- `LoanStatus`: requested | issued | returned | overdue | cancelled | rejected
- `FineStatus`: none | unpaid | paid | waived
- `PaymentMethod`: cash | chalan | online

`client/lib/types.ts` mirrors these as string unions — update both together.

## Models

**User** (`users`) — id, name, email (unique), studentId (unique, nullable), passwordHash,
role (default student), isActive. Relations: bookings, loans.

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
`slotWarningEmailSent`. Indexes `[userId, status]`, `[qrToken]`.

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
- A student with any `fineStatus = unpaid` and `fineAmount > 0` cannot borrow or renew.
- `datasource db` has no inline `url`; it comes from `DATABASE_URL`.
