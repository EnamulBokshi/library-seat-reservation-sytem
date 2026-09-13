import prisma from "../../lib/prisma";
import { ApprovalStatus, BookingStatus, FineStatus, Role, WaiverRequestStatus } from "../../generated/enums";
import { INavBadgeCounts } from "./dashboard.interface";

const EMPTY_COUNTS: INavBadgeCounts = {
    pendingApprovals: 0,
    pendingWaivers: 0,
    activeBookings: 0,
    unpaidFines: 0,
    myPendingWaivers: 0,
    myUnpaidFines: 0,
};

/** Midnight UTC of the current day, matching how schedules store their date. */
const todayDate = (): Date => {
    const todayStr = new Date().toISOString().split("T")[0];
    return new Date(`${todayStr}T00:00:00.000Z`);
};

/**
 * Badge counters for the navigation, scoped to what the role may act on.
 *
 * Every counter is resolved independently and a failed one falls back to 0,
 * so a single slow or broken query degrades one badge instead of blanking the
 * whole navigation.
 */
const getNavBadgeCounts = async (userId: string, role: Role): Promise<INavBadgeCounts> => {
    const isAdmin = role === Role.admin;
    const isStaff = isAdmin || role === Role.librarian;

    const settle = async (enabled: boolean, query: () => Promise<number>): Promise<number> => {
        if (!enabled) {
            return 0;
        }
        try {
            return await query();
        } catch (error) {
            console.error("[Nav Badges] Counter failed, reporting 0:", error);
            return 0;
        }
    };

    const [
        pendingApprovals,
        pendingWaivers,
        activeBookings,
        unpaidSeatFines,
        unpaidLoanFines,
        myPendingWaivers,
        myUnpaidSeatFines,
        myUnpaidLoanFines,
    ] = await Promise.all([
        settle(isAdmin, () =>
            prisma.user.count({
                where: {
                    approvalStatus: ApprovalStatus.pending,
                    emailVerifiedAt: { not: null },
                    role: { in: [Role.faculty, Role.student] },
                },
            })
        ),
        settle(isStaff, () =>
            prisma.fineWaiverRequest.count({ where: { status: WaiverRequestStatus.pending } })
        ),
        settle(isStaff, () =>
            prisma.booking.count({
                where: {
                    status: { in: [BookingStatus.confirmed, BookingStatus.checked_in] },
                    schedule: { date: todayDate() },
                },
            })
        ),
        settle(isStaff, () =>
            prisma.booking.count({
                where: { fineStatus: FineStatus.unpaid, fineAmount: { gt: 0 } },
            })
        ),
        settle(isStaff, () =>
            prisma.bookLoan.count({
                where: { fineStatus: FineStatus.unpaid, fineAmount: { gt: 0 } },
            })
        ),
        settle(role === Role.faculty, () =>
            prisma.fineWaiverRequest.count({
                where: { requestedById: userId, status: WaiverRequestStatus.pending },
            })
        ),
        settle(true, () =>
            prisma.booking.count({
                where: { userId, fineStatus: FineStatus.unpaid, fineAmount: { gt: 0 } },
            })
        ),
        settle(true, () =>
            prisma.bookLoan.count({
                where: { userId, fineStatus: FineStatus.unpaid, fineAmount: { gt: 0 } },
            })
        ),
    ]);

    return {
        ...EMPTY_COUNTS,
        pendingApprovals,
        pendingWaivers,
        activeBookings,
        unpaidFines: unpaidSeatFines + unpaidLoanFines,
        myPendingWaivers,
        myUnpaidFines: myUnpaidSeatFines + myUnpaidLoanFines,
    };
};

export const DashboardService = {
    getNavBadgeCounts,
};
