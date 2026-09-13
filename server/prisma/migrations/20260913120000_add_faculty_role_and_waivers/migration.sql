-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "WaiverRequestStatus" AS ENUM ('pending', 'approved', 'rejected');

-- AlterEnum
ALTER TYPE "OtpPurpose" ADD VALUE 'registration';

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'faculty';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'approved',
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "department" TEXT,
ADD COLUMN     "designation" TEXT,
ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "facultyId" TEXT,
ADD COLUMN     "rejectionReason" TEXT;

-- CreateTable
CREATE TABLE "fine_waiver_requests" (
    "id" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "bookingId" TEXT,
    "loanId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "WaiverRequestStatus" NOT NULL DEFAULT 'pending',
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fine_waiver_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fine_waiver_requests_status_idx" ON "fine_waiver_requests"("status");

-- CreateIndex
CREATE INDEX "fine_waiver_requests_requestedById_idx" ON "fine_waiver_requests"("requestedById");

-- CreateIndex
CREATE INDEX "fine_waiver_requests_targetUserId_idx" ON "fine_waiver_requests"("targetUserId");

-- CreateIndex
CREATE INDEX "fine_waiver_requests_bookingId_idx" ON "fine_waiver_requests"("bookingId");

-- CreateIndex
CREATE INDEX "fine_waiver_requests_loanId_idx" ON "fine_waiver_requests"("loanId");

-- CreateIndex
CREATE UNIQUE INDEX "users_facultyId_key" ON "users"("facultyId");

-- AddForeignKey
ALTER TABLE "fine_waiver_requests" ADD CONSTRAINT "fine_waiver_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fine_waiver_requests" ADD CONSTRAINT "fine_waiver_requests_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

