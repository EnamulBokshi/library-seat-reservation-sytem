import status from "http-status";
import prisma from "./prisma";
import AppError from "../helpers/AppError";
import { FineStatus } from "../generated/enums";
import { SettingService } from "../modules/setting/setting.service";
import { getUserPrivileges } from "./privileges";

export interface IUnpaidFinesSummary {
    seatFineTotal: number;
    loanFineTotal: number;
    totalUnpaid: number;
    maxUnpaidFineLimit: number;
    isBookingBlocked: boolean;
    remainingBalance: number;
    unpaidSeatBookings: {
        bookingId: string;
        fineAmount: number;
        reason: string | null;
        cancelledAt: Date | null;
    }[];
    unpaidLoans: {
        loanId: string;
        bookTitle: string;
        fineAmount: number;
    }[];
}

const roundBDT = (amount: number): number => Math.round(amount * 100) / 100;

/**
 * Total a student's outstanding library dues across BOTH seat reservation fines
 * and overdue book loan fines, and report whether seat booking is locked.
 */
export const getUserUnpaidFinesSummary = async (userId: string): Promise<IUnpaidFinesSummary> => {
    const [policy, privileges] = await Promise.all([
        SettingService.getBookingPolicyConfig(),
        getUserPrivileges(userId),
    ]);

    const [unpaidBookings, unpaidLoans] = await Promise.all([
        prisma.booking.findMany({
            where: {
                userId,
                fineStatus: FineStatus.unpaid,
                fineAmount: { gt: 0 },
            },
            select: {
                id: true,
                fineAmount: true,
                cancelReason: true,
                cancelledAt: true,
            },
            orderBy: { cancelledAt: "desc" },
        }),
        prisma.bookLoan.findMany({
            where: {
                userId,
                fineStatus: FineStatus.unpaid,
                fineAmount: { gt: 0 },
            },
            select: {
                id: true,
                fineAmount: true,
                book: { select: { title: true } },
            },
        }),
    ]);

    const seatFineTotal = roundBDT(unpaidBookings.reduce((sum, b) => sum + b.fineAmount, 0));
    const loanFineTotal = roundBDT(unpaidLoans.reduce((sum, l) => sum + l.fineAmount, 0));
    const totalUnpaid = roundBDT(seatFineTotal + loanFineTotal);

    return {
        seatFineTotal,
        loanFineTotal,
        totalUnpaid,
        maxUnpaidFineLimit: policy.maxUnpaidFineLimit,
        // Faculty dues are still reported, but they never lock a reservation.
        isBookingBlocked: privileges.exemptSeatFines
            ? false
            : totalUnpaid >= policy.maxUnpaidFineLimit,
        remainingBalance: roundBDT(Math.max(0, policy.maxUnpaidFineLimit - totalUnpaid)),
        unpaidSeatBookings: unpaidBookings.map((b) => ({
            bookingId: b.id,
            fineAmount: b.fineAmount,
            reason: b.cancelReason,
            cancelledAt: b.cancelledAt,
        })),
        unpaidLoans: unpaidLoans.map((l) => ({
            loanId: l.id,
            bookTitle: l.book.title,
            fineAmount: l.fineAmount,
        })),
    };
};

/**
 * Block seat reservations once a student's total unpaid dues reach the configured limit.
 */
export const assertSeatBookingEligibility = async (userId: string): Promise<IUnpaidFinesSummary> => {
    const summary = await getUserUnpaidFinesSummary(userId);

    if (summary.isBookingBlocked) {
        throw new AppError(
            status.FORBIDDEN,
            `Seat reservation locked: your unpaid library dues total ${summary.totalUnpaid} BDT, which has reached the ${summary.maxUnpaidFineLimit} BDT limit. Please settle your dues at the library circulation desk (Cash / Bank Chalan) to restore reservation privileges.`
        );
    }

    return summary;
};

/**
 * Decide the fine for a student-initiated cancellation.
 *
 * A cancellation is only fineable when BOTH are true:
 *   1. The free cancellation window since booking has elapsed, and
 *   2. The reserved slot is already running or starts within the lead window.
 *
 * Dropping a reservation days ahead of its slot leaves ample time for another
 * student to take the seat, so it stays free however long ago it was booked.
 */
export interface ICancellationFineDecision {
    fineAmount: number;
    minutesSinceBooking: number;
    minutesUntilSlotStart: number;
    isWithinFreeWindow: boolean;
    isFineable: boolean;
}

export const evaluateCancellationFine = (params: {
    bookedAt: Date;
    slotStart: Date | null;
    freeCancelMinutes: number;
    lateCancelFine: number;
    lateCancelLeadMinutes: number;
    now?: Date;
}): ICancellationFineDecision => {
    const now = params.now ?? new Date();

    const minutesSinceBooking = (now.getTime() - new Date(params.bookedAt).getTime()) / (60 * 1000);
    const minutesUntilSlotStart = params.slotStart
        ? (new Date(params.slotStart).getTime() - now.getTime()) / (60 * 1000)
        : 0;

    const isWithinFreeWindow = minutesSinceBooking <= params.freeCancelMinutes;
    // The slot is imminent or already running.
    const isSlotImminent = minutesUntilSlotStart <= params.lateCancelLeadMinutes;
    const isFineable = !isWithinFreeWindow && isSlotImminent && params.lateCancelFine > 0;

    return {
        fineAmount: isFineable ? roundBDT(params.lateCancelFine) : 0,
        minutesSinceBooking,
        minutesUntilSlotStart,
        isWithinFreeWindow,
        isFineable,
    };
};

export const formatMinutes = (minutes: number): string => {
    const total = Math.max(0, Math.round(minutes));
    if (total < 60) {
        return `${total}m`;
    }
    const hours = Math.floor(total / 60);
    const rest = total % 60;
    return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
};
