import prisma from "../../lib/prisma";
import AppError from "../../helpers/AppError";
import status from "http-status";
import { FineStatus, PaymentMethod } from "../../generated/enums";
import { Prisma } from "../../generated/client";
import {
  IFineFilterOptions,
  IFineRecord,
  IFineStats,
} from "./fine.interface";
import { BookingService } from "../booking/booking.service";
import { LoanService } from "../loan/loan.service";
import { SettingService } from "../setting/setting.service";

const roundBDT = (amount: number): number =>
  Math.round((amount + Number.EPSILON) * 100) / 100;

/**
 * Aggregates live fine metrics across seat reservations and book loans.
 */
const getFineStats = async (): Promise<IFineStats> => {
  const policy = await SettingService.getBookingPolicyConfig();

  const [
    seatUnpaidAgg,
    seatPaidAgg,
    seatWaivedAgg,
    loanUnpaidAgg,
    loanPaidAgg,
    loanWaivedAgg,
    seatCashAgg,
    seatChalanAgg,
    seatOnlineAgg,
    loanCashAgg,
    loanChalanAgg,
    loanOnlineAgg,
    unpaidSeatUsers,
    unpaidLoanUsers,
  ] = await Promise.all([
    // Seat aggregations
    prisma.booking.aggregate({
      where: { fineAmount: { gt: 0 }, fineStatus: FineStatus.unpaid },
      _sum: { fineAmount: true },
      _count: { id: true },
    }),
    prisma.booking.aggregate({
      where: { fineAmount: { gt: 0 }, fineStatus: FineStatus.paid },
      _sum: { fineAmount: true },
      _count: { id: true },
    }),
    prisma.booking.aggregate({
      where: { fineAmount: { gt: 0 }, fineStatus: FineStatus.waived },
      _sum: { fineAmount: true },
      _count: { id: true },
    }),

    // Loan aggregations
    prisma.bookLoan.aggregate({
      where: { fineAmount: { gt: 0 }, fineStatus: FineStatus.unpaid },
      _sum: { fineAmount: true },
      _count: { id: true },
    }),
    prisma.bookLoan.aggregate({
      where: { fineAmount: { gt: 0 }, fineStatus: FineStatus.paid },
      _sum: { fineAmount: true },
      _count: { id: true },
    }),
    prisma.bookLoan.aggregate({
      where: { fineAmount: { gt: 0 }, fineStatus: FineStatus.waived },
      _sum: { fineAmount: true },
      _count: { id: true },
    }),

    // Payment method breakdowns (Paid only)
    prisma.booking.aggregate({
      where: { fineStatus: FineStatus.paid, paymentMethod: PaymentMethod.cash },
      _sum: { fineAmount: true },
    }),
    prisma.booking.aggregate({
      where: { fineStatus: FineStatus.paid, paymentMethod: PaymentMethod.chalan },
      _sum: { fineAmount: true },
    }),
    prisma.booking.aggregate({
      where: { fineStatus: FineStatus.paid, paymentMethod: PaymentMethod.online },
      _sum: { fineAmount: true },
    }),
    prisma.bookLoan.aggregate({
      where: { fineStatus: FineStatus.paid, paymentMethod: PaymentMethod.cash },
      _sum: { fineAmount: true },
    }),
    prisma.bookLoan.aggregate({
      where: { fineStatus: FineStatus.paid, paymentMethod: PaymentMethod.chalan },
      _sum: { fineAmount: true },
    }),
    prisma.bookLoan.aggregate({
      where: { fineStatus: FineStatus.paid, paymentMethod: PaymentMethod.online },
      _sum: { fineAmount: true },
    }),

    // Students with unpaid dues
    prisma.booking.findMany({
      where: { fineAmount: { gt: 0 }, fineStatus: FineStatus.unpaid },
      select: { userId: true, fineAmount: true },
    }),
    prisma.bookLoan.findMany({
      where: { fineAmount: { gt: 0 }, fineStatus: FineStatus.unpaid },
      select: { userId: true, fineAmount: true },
    }),
  ]);

  const seatUnpaid = roundBDT(seatUnpaidAgg._sum.fineAmount ?? 0);
  const seatUnpaidCount = seatUnpaidAgg._count.id;

  const loanUnpaid = roundBDT(loanUnpaidAgg._sum.fineAmount ?? 0);
  const loanUnpaidCount = loanUnpaidAgg._count.id;

  const totalOutstanding = roundBDT(seatUnpaid + loanUnpaid);
  const outstandingCount = seatUnpaidCount + loanUnpaidCount;

  const seatCollected = roundBDT(seatPaidAgg._sum.fineAmount ?? 0);
  const loanCollected = roundBDT(loanPaidAgg._sum.fineAmount ?? 0);
  const totalCollected = roundBDT(seatCollected + loanCollected);
  const collectedCount = seatPaidAgg._count.id + loanPaidAgg._count.id;

  const seatWaived = roundBDT(seatWaivedAgg._sum.fineAmount ?? 0);
  const loanWaived = roundBDT(loanWaivedAgg._sum.fineAmount ?? 0);
  const totalWaived = roundBDT(seatWaived + loanWaived);
  const waivedCount = seatWaivedAgg._count.id + loanWaivedAgg._count.id;

  const cashCollected = roundBDT(
    (seatCashAgg._sum.fineAmount ?? 0) + (loanCashAgg._sum.fineAmount ?? 0)
  );
  const chalanCollected = roundBDT(
    (seatChalanAgg._sum.fineAmount ?? 0) + (loanChalanAgg._sum.fineAmount ?? 0)
  );
  const onlineCollected = roundBDT(
    (seatOnlineAgg._sum.fineAmount ?? 0) + (loanOnlineAgg._sum.fineAmount ?? 0)
  );

  // Group unpaid balances per student to find who is blocked
  const studentDuesMap = new Map<string, number>();
  unpaidSeatUsers.forEach((b) => {
    studentDuesMap.set(b.userId, (studentDuesMap.get(b.userId) ?? 0) + b.fineAmount);
  });
  unpaidLoanUsers.forEach((l) => {
    studentDuesMap.set(l.userId, (studentDuesMap.get(l.userId) ?? 0) + l.fineAmount);
  });

  const impactedStudentsCount = studentDuesMap.size;
  let blockedStudentsCount = 0;
  for (const totalDues of studentDuesMap.values()) {
    if (totalDues >= policy.maxUnpaidFineLimit) {
      blockedStudentsCount++;
    }
  }

  return {
    totalOutstanding,
    outstandingCount,
    totalCollected,
    collectedCount,
    totalWaived,
    waivedCount,
    seatUnpaid,
    seatUnpaidCount,
    loanUnpaid,
    loanUnpaidCount,
    cashCollected,
    chalanCollected,
    onlineCollected,
    impactedStudentsCount,
    blockedStudentsCount,
    maxUnpaidFineLimit: policy.maxUnpaidFineLimit,
  };
};

/**
 * Formats a Booking entity into a normalized IFineRecord.
 */
const formatBookingFine = (b: any): IFineRecord => {
  const seatLabel = b.seat
    ? `Seat ${b.seat.seatNumber}${b.seat.zone ? ` · ${b.seat.zone.name}` : ""}`
    : "Seat reservation";
  const slotLabel = b.schedule
    ? ` · ${new Date(b.schedule.date).toISOString().slice(0, 10)} ${b.schedule.slot}`
    : "";

  return {
    id: b.id,
    source: "seat",
    amount: b.fineAmount,
    status: b.fineStatus,
    reason: b.cancelReason ?? (b.status === "no_show" ? "Marked as no-show" : null),
    subject: `${seatLabel}${slotLabel}`,
    incurredAt: b.cancelledAt ?? b.bookedAt,
    paidAt: b.finePaidAt,
    paymentMethod: b.paymentMethod,
    chalanNumber: b.chalanNumber,
    receivedBy: b.fineReceivedById,
    student: {
      id: b.user.id,
      name: b.user.name,
      email: b.user.email,
      studentId: b.user.studentId,
    },
    details: {
      bookingId: b.id,
      seatNumber: b.seat?.seatNumber,
      zoneName: b.seat?.zone?.name,
      scheduleDate: b.schedule ? new Date(b.schedule.date).toISOString().slice(0, 10) : undefined,
      slot: b.schedule?.slot,
      bookingStatus: b.status,
    },
  };
};

/**
 * Formats a BookLoan entity into a normalized IFineRecord.
 */
const formatLoanFine = (l: any): IFineRecord => {
  return {
    id: l.id,
    source: "loan",
    amount: l.fineAmount,
    status: l.fineStatus,
    reason: l.returnDate
      ? `Returned late (due ${new Date(l.dueDate).toISOString().slice(0, 10)})`
      : `Overdue since ${new Date(l.dueDate).toISOString().slice(0, 10)}`,
    subject: `${l.book.title} — ${l.book.author}`,
    incurredAt: l.dueDate,
    paidAt: l.finePaidAt,
    paymentMethod: l.paymentMethod,
    chalanNumber: l.chalanNumber,
    receivedBy: l.fineReceivedById,
    student: {
      id: l.user.id,
      name: l.user.name,
      email: l.user.email,
      studentId: l.user.studentId,
    },
    details: {
      loanId: l.id,
      bookTitle: l.book.title,
      bookAuthor: l.book.author,
      barcode: l.book.barcode,
      isbn: l.book.isbn,
      dueDate: l.dueDate,
      returnDate: l.returnDate,
    },
  };
};

/**
 * Retrieves paginated, searchable, filterable, and sorted fine records across both ledgers.
 */
const getAllFines = async (options: IFineFilterOptions) => {
  const {
    source = "all",
    status: filterStatus,
    paymentMethod,
    searchTerm,
    startDate,
    endDate,
    page = 1,
    limit = 20,
    sortBy = "incurredAt",
    sortOrder = "desc",
  } = options;

  const q = searchTerm?.trim();

  // Booking where clause
  const bookingWhere: Prisma.BookingWhereInput = {
    fineAmount: { gt: 0 },
    fineStatus:
      filterStatus && filterStatus !== "all"
        ? filterStatus
        : { not: FineStatus.none },
  };

  if (paymentMethod && paymentMethod !== "all") {
    bookingWhere.paymentMethod = paymentMethod;
  }

  if (startDate || endDate) {
    bookingWhere.OR = [
      {
        cancelledAt: {
          ...(startDate ? { gte: new Date(startDate) } : {}),
          ...(endDate ? { lte: new Date(endDate) } : {}),
        },
      },
      {
        bookedAt: {
          ...(startDate ? { gte: new Date(startDate) } : {}),
          ...(endDate ? { lte: new Date(endDate) } : {}),
        },
      },
    ];
  }

  if (q) {
    bookingWhere.AND = [
      {
        OR: [
          { user: { name: { contains: q, mode: "insensitive" } } },
          { user: { email: { contains: q, mode: "insensitive" } } },
          { user: { studentId: { contains: q, mode: "insensitive" } } },
          { chalanNumber: { contains: q, mode: "insensitive" } },
          { cancelReason: { contains: q, mode: "insensitive" } },
          { seat: { seatNumber: { contains: q, mode: "insensitive" } } },
          { seat: { zone: { name: { contains: q, mode: "insensitive" } } } },
        ],
      },
    ];
  }

  // Loan where clause
  const loanWhere: Prisma.BookLoanWhereInput = {
    fineAmount: { gt: 0 },
    fineStatus:
      filterStatus && filterStatus !== "all"
        ? filterStatus
        : { not: FineStatus.none },
  };

  if (paymentMethod && paymentMethod !== "all") {
    loanWhere.paymentMethod = paymentMethod;
  }

  if (startDate || endDate) {
    loanWhere.dueDate = {
      ...(startDate ? { gte: new Date(startDate) } : {}),
      ...(endDate ? { lte: new Date(endDate) } : {}),
    };
  }

  if (q) {
    loanWhere.AND = [
      {
        OR: [
          { user: { name: { contains: q, mode: "insensitive" } } },
          { user: { email: { contains: q, mode: "insensitive" } } },
          { user: { studentId: { contains: q, mode: "insensitive" } } },
          { chalanNumber: { contains: q, mode: "insensitive" } },
          { notes: { contains: q, mode: "insensitive" } },
          { book: { title: { contains: q, mode: "insensitive" } } },
          { book: { author: { contains: q, mode: "insensitive" } } },
          { book: { barcode: { contains: q, mode: "insensitive" } } },
        ],
      },
    ];
  }

  const querySeat = source === "all" || source === "seat";
  const queryLoan = source === "all" || source === "loan";

  const [bookingList, loanList] = await Promise.all([
    querySeat
      ? prisma.booking.findMany({
          where: bookingWhere,
          include: {
            user: {
              select: { id: true, name: true, email: true, studentId: true },
            },
            seat: { include: { zone: { select: { name: true } } } },
            schedule: { select: { date: true, slot: true } },
          },
        })
      : Promise.resolve([]),
    queryLoan
      ? prisma.bookLoan.findMany({
          where: loanWhere,
          include: {
            user: {
              select: { id: true, name: true, email: true, studentId: true },
            },
            book: {
              select: {
                title: true,
                author: true,
                barcode: true,
                isbn: true,
              },
            },
          },
        })
      : Promise.resolve([]),
  ]);

  const allRecords: IFineRecord[] = [
    ...bookingList.map(formatBookingFine),
    ...loanList.map(formatLoanFine),
  ];

  // Sorting
  allRecords.sort((a, b) => {
    let cmp = 0;
    if (sortBy === "amount") {
      cmp = a.amount - b.amount;
    } else if (sortBy === "status") {
      cmp = a.status.localeCompare(b.status);
    } else if (sortBy === "studentName") {
      cmp = a.student.name.localeCompare(b.student.name);
    } else if (sortBy === "paidAt") {
      const timeA = a.paidAt ? new Date(a.paidAt).getTime() : 0;
      const timeB = b.paidAt ? new Date(b.paidAt).getTime() : 0;
      cmp = timeA - timeB;
    } else {
      // default: incurredAt
      const timeA = new Date(a.incurredAt).getTime();
      const timeB = new Date(b.incurredAt).getTime();
      cmp = timeA - timeB;
    }
    return sortOrder === "asc" ? cmp : -cmp;
  });

  const total = allRecords.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const skip = (page - 1) * limit;
  const paginatedData = allRecords.slice(skip, skip + limit);

  return {
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
    data: paginatedData,
  };
};

/**
 * Settles a fine by delegating to BookingService or LoanService.
 */
const payFine = async (
  source: "seat" | "loan",
  id: string,
  payload: {
    paymentMethod: "cash" | "chalan" | "online";
    chalanNumber?: string | null;
    notes?: string | null;
  },
  librarianId: string
) => {
  if (source === "seat") {
    return BookingService.paySeatFine(
      id,
      {
        paymentMethod: payload.paymentMethod,
        chalanNumber: payload.chalanNumber || undefined,
      },
      librarianId
    );
  } else if (source === "loan") {
    return LoanService.payLoanFine(
      id,
      {
        paymentMethod: payload.paymentMethod,
        chalanNumber: payload.chalanNumber || undefined,
        notes: payload.notes || undefined,
      },
      librarianId
    );
  } else {
    throw new AppError(status.BAD_REQUEST, "Invalid fine source specified.");
  }
};

/**
 * Waives a fine by delegating to BookingService or LoanService.
 */
const waiveFine = async (
  source: "seat" | "loan",
  id: string,
  payload: { reason?: string | null },
  librarianId: string
) => {
  if (source === "seat") {
    return BookingService.waiveSeatFine(
      id,
      { reason: payload.reason || undefined },
      librarianId
    );
  } else if (source === "loan") {
    return LoanService.waiveLoanFine(
      id,
      { reason: payload.reason || undefined },
      librarianId
    );
  } else {
    throw new AppError(status.BAD_REQUEST, "Invalid fine source specified.");
  }
};

export const FineService = {
  getFineStats,
  getAllFines,
  payFine,
  waiveFine,
};
