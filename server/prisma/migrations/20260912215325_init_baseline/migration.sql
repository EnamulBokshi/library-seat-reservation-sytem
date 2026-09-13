-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ZoneType" AS ENUM ('silent_desk', 'group_study', 'computer_lab', 'open_reading', 'conference_room');

-- CreateEnum
CREATE TYPE "TableType" AS ENUM ('individual_cubicle', 'circle_table', 'meeting_table', 'booth_pod', 'workstation_bench');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'librarian', 'student');

-- CreateEnum
CREATE TYPE "SlotType" AS ENUM ('morning', 'noon', 'afternoon', 'evening');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('requested', 'issued', 'returned', 'overdue', 'cancelled', 'rejected');

-- CreateEnum
CREATE TYPE "FineStatus" AS ENUM ('none', 'unpaid', 'paid', 'waived');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'chalan', 'online');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "studentId" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'student',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zones" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#4F46E5',
    "zoneType" "ZoneType" NOT NULL DEFAULT 'silent_desk',
    "allowMultiSeat" BOOLEAN NOT NULL DEFAULT false,
    "maxSeatsPerBooking" INTEGER NOT NULL DEFAULT 1,
    "defaultTableType" "TableType" NOT NULL DEFAULT 'individual_cubicle',
    "rules" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seats" (
    "id" TEXT NOT NULL,
    "seatNumber" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "tableNumber" TEXT,
    "tableType" "TableType" NOT NULL DEFAULT 'individual_cubicle',
    "tableCapacity" INTEGER,
    "seatPosition" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isOccupied" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedules" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "slot" "SlotType" NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_seats" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "seatId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_seats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seatId" TEXT,
    "scheduleId" TEXT NOT NULL,
    "guestCount" INTEGER NOT NULL DEFAULT 1,
    "status" "BookingStatus" NOT NULL DEFAULT 'confirmed',
    "qrToken" TEXT NOT NULL,
    "bookedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkedInAt" TIMESTAMP(3),
    "checkedOutAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "slotWarningEmailSent" BOOLEAN NOT NULL DEFAULT false,
    "fineAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fineStatus" "FineStatus" NOT NULL DEFAULT 'none',
    "paymentMethod" "PaymentMethod",
    "chalanNumber" TEXT,
    "finePaidAt" TIMESTAMP(3),
    "fineReceivedById" TEXT,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "books" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "isbn" TEXT,
    "barcode" TEXT,
    "category" TEXT NOT NULL DEFAULT 'General',
    "publisher" TEXT,
    "publicationYear" INTEGER,
    "edition" TEXT,
    "description" TEXT,
    "coverImage" TEXT,
    "pdfUrl" TEXT,
    "totalCopies" INTEGER NOT NULL DEFAULT 1,
    "availableCopies" INTEGER NOT NULL DEFAULT 1,
    "block" TEXT NOT NULL,
    "shelfNumber" TEXT NOT NULL,
    "rowNumber" TEXT,
    "callNumber" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_loans" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "borrowDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "returnDate" TIMESTAMP(3),
    "renewCount" INTEGER NOT NULL DEFAULT 0,
    "status" "LoanStatus" NOT NULL DEFAULT 'requested',
    "notes" TEXT,
    "approvedById" TEXT,
    "fineAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fineStatus" "FineStatus" NOT NULL DEFAULT 'none',
    "paymentMethod" "PaymentMethod",
    "chalanNumber" TEXT,
    "finePaidAt" TIMESTAMP(3),
    "fineReceivedById" TEXT,
    "warningEmailSent" BOOLEAN NOT NULL DEFAULT false,
    "overdueEmailSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_loans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_studentId_key" ON "users"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "zones_name_key" ON "zones"("name");

-- CreateIndex
CREATE INDEX "seats_zoneId_tableNumber_idx" ON "seats"("zoneId", "tableNumber");

-- CreateIndex
CREATE UNIQUE INDEX "seats_zoneId_seatNumber_key" ON "seats"("zoneId", "seatNumber");

-- CreateIndex
CREATE UNIQUE INDEX "schedules_date_slot_key" ON "schedules"("date", "slot");

-- CreateIndex
CREATE INDEX "booking_seats_seatId_idx" ON "booking_seats"("seatId");

-- CreateIndex
CREATE UNIQUE INDEX "booking_seats_bookingId_seatId_key" ON "booking_seats"("bookingId", "seatId");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_qrToken_key" ON "bookings"("qrToken");

-- CreateIndex
CREATE INDEX "bookings_userId_status_idx" ON "bookings"("userId", "status");

-- CreateIndex
CREATE INDEX "bookings_qrToken_idx" ON "bookings"("qrToken");

-- CreateIndex
CREATE INDEX "bookings_userId_fineStatus_idx" ON "bookings"("userId", "fineStatus");

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "books_isbn_key" ON "books"("isbn");

-- CreateIndex
CREATE UNIQUE INDEX "books_barcode_key" ON "books"("barcode");

-- CreateIndex
CREATE INDEX "books_category_idx" ON "books"("category");

-- CreateIndex
CREATE INDEX "books_block_shelfNumber_idx" ON "books"("block", "shelfNumber");

-- CreateIndex
CREATE INDEX "books_barcode_idx" ON "books"("barcode");

-- CreateIndex
CREATE INDEX "book_loans_userId_status_idx" ON "book_loans"("userId", "status");

-- CreateIndex
CREATE INDEX "book_loans_bookId_status_idx" ON "book_loans"("bookId", "status");

-- CreateIndex
CREATE INDEX "book_loans_fineStatus_idx" ON "book_loans"("fineStatus");

-- AddForeignKey
ALTER TABLE "seats" ADD CONSTRAINT "seats_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_seats" ADD CONSTRAINT "booking_seats_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_seats" ADD CONSTRAINT "booking_seats_seatId_fkey" FOREIGN KEY ("seatId") REFERENCES "seats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_seatId_fkey" FOREIGN KEY ("seatId") REFERENCES "seats"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_loans" ADD CONSTRAINT "book_loans_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_loans" ADD CONSTRAINT "book_loans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
