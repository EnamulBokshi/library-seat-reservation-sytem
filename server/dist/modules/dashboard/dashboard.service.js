"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
const prisma_1 = __importDefault(require("../../lib/prisma"));
const enums_1 = require("../../generated/enums");
const EMPTY_COUNTS = {
    pendingApprovals: 0,
    pendingWaivers: 0,
    activeBookings: 0,
    unpaidFines: 0,
    myPendingWaivers: 0,
    pendingBorrowRequests: 0,
    myUnpaidFines: 0,
    openReports: 0,
    myOpenReports: 0,
    liveAnnouncements: 0,
    newAnnouncements: 0,
};
/** Reports that still need someone to act. */
const OPEN_REPORT_STATUSES = [enums_1.ReportStatus.open, enums_1.ReportStatus.in_review];
/** Audience buckets a role reads: its own bucket plus the catch-all. */
const audiencesForRole = (role) => {
    if (role === enums_1.Role.student)
        return [enums_1.AnnouncementAudience.all, enums_1.AnnouncementAudience.students];
    if (role === enums_1.Role.faculty)
        return [enums_1.AnnouncementAudience.all, enums_1.AnnouncementAudience.faculty];
    return [enums_1.AnnouncementAudience.all, enums_1.AnnouncementAudience.staff];
};
/** Midnight UTC of the current day, matching how schedules store their date. */
const todayDate = () => {
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
const getNavBadgeCounts = async (userId, role, options = {}) => {
    const isAdmin = role === enums_1.Role.admin || role === "super_admin";
    const isStaff = isAdmin || role === enums_1.Role.librarian;
    const isFaculty = role === enums_1.Role.faculty;
    const settle = async (enabled, query) => {
        if (!enabled) {
            return 0;
        }
        try {
            return await query();
        }
        catch (error) {
            console.error("[Nav Badges] Counter failed, reporting 0:", error);
            return 0;
        }
    };
    const [pendingApprovals, pendingWaivers, activeBookings, pendingBorrowRequests, unpaidSeatFines, unpaidLoanFines, myPendingWaivers, myUnpaidSeatFines, myUnpaidLoanFines, openReports, myOpenReports, liveAnnouncements, newAnnouncements,] = await Promise.all([
        settle(isAdmin, () => prisma_1.default.user.count({
            where: {
                approvalStatus: enums_1.ApprovalStatus.pending,
                emailVerifiedAt: { not: null },
                role: { in: [enums_1.Role.faculty, enums_1.Role.student] },
            },
        })),
        settle(isStaff, () => prisma_1.default.fineWaiverRequest.count({ where: { status: enums_1.WaiverRequestStatus.pending } })),
        settle(isStaff, () => prisma_1.default.booking.count({
            where: {
                status: { in: [enums_1.BookingStatus.confirmed, enums_1.BookingStatus.checked_in] },
                schedule: { date: todayDate() },
            },
        })),
        settle(isStaff, () => prisma_1.default.bookLoan.count({
            where: {
                status: enums_1.LoanStatus.requested,
            },
        })),
        settle(isStaff, () => prisma_1.default.booking.count({
            where: { fineStatus: enums_1.FineStatus.unpaid, fineAmount: { gt: 0 } },
        })),
        settle(isStaff, () => prisma_1.default.bookLoan.count({
            where: { fineStatus: enums_1.FineStatus.unpaid, fineAmount: { gt: 0 } },
        })),
        settle(isFaculty, () => prisma_1.default.fineWaiverRequest.count({
            where: { requestedById: userId, status: enums_1.WaiverRequestStatus.pending },
        })),
        settle(!isFaculty, () => prisma_1.default.booking.count({
            where: { userId, fineStatus: enums_1.FineStatus.unpaid, fineAmount: { gt: 0 } },
        })),
        settle(!isFaculty, () => prisma_1.default.bookLoan.count({
            where: { userId, fineStatus: enums_1.FineStatus.unpaid, fineAmount: { gt: 0 } },
        })),
        settle(isStaff, () => prisma_1.default.report.count({ where: { status: { in: OPEN_REPORT_STATUSES } } })),
        settle(true, () => prisma_1.default.report.count({
            where: { reporterId: userId, status: { in: OPEN_REPORT_STATUSES } },
        })),
        settle(true, () => {
            const now = new Date();
            return prisma_1.default.announcement.count({
                where: {
                    isActive: true,
                    publishedAt: { lte: now },
                    audience: { in: audiencesForRole(role) },
                    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
                },
            });
        }),
        // Unseen notices. With no `noticesSince` the caller has never opened the
        // notice page, so every live notice still counts as new.
        settle(true, () => {
            const now = new Date();
            return prisma_1.default.announcement.count({
                where: {
                    isActive: true,
                    publishedAt: options.noticesSince
                        ? { lte: now, gt: options.noticesSince }
                        : { lte: now },
                    audience: { in: audiencesForRole(role) },
                    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
                },
            });
        }),
    ]);
    return {
        ...EMPTY_COUNTS,
        pendingApprovals,
        pendingWaivers,
        activeBookings,
        pendingBorrowRequests,
        unpaidFines: unpaidSeatFines + unpaidLoanFines,
        myPendingWaivers,
        myUnpaidFines: myUnpaidSeatFines + myUnpaidLoanFines,
        openReports,
        myOpenReports,
        liveAnnouncements,
        newAnnouncements,
    };
};
exports.DashboardService = {
    getNavBadgeCounts,
};
