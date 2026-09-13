"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatMinutes = exports.evaluateCancellationFine = exports.assertSeatBookingEligibility = exports.getUserUnpaidFinesSummary = void 0;
const http_status_1 = __importDefault(require("http-status"));
const prisma_1 = __importDefault(require("./prisma"));
const AppError_1 = __importDefault(require("../helpers/AppError"));
const enums_1 = require("../generated/enums");
const setting_service_1 = require("../modules/setting/setting.service");
const roundBDT = (amount) => Math.round(amount * 100) / 100;
/**
 * Total a student's outstanding library dues across BOTH seat reservation fines
 * and overdue book loan fines, and report whether seat booking is locked.
 */
const getUserUnpaidFinesSummary = async (userId) => {
    const policy = await setting_service_1.SettingService.getBookingPolicyConfig();
    const [unpaidBookings, unpaidLoans] = await Promise.all([
        prisma_1.default.booking.findMany({
            where: {
                userId,
                fineStatus: enums_1.FineStatus.unpaid,
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
        prisma_1.default.bookLoan.findMany({
            where: {
                userId,
                fineStatus: enums_1.FineStatus.unpaid,
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
        isBookingBlocked: totalUnpaid >= policy.maxUnpaidFineLimit,
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
exports.getUserUnpaidFinesSummary = getUserUnpaidFinesSummary;
/**
 * Block seat reservations once a student's total unpaid dues reach the configured limit.
 */
const assertSeatBookingEligibility = async (userId) => {
    const summary = await (0, exports.getUserUnpaidFinesSummary)(userId);
    if (summary.isBookingBlocked) {
        throw new AppError_1.default(http_status_1.default.FORBIDDEN, `Seat reservation locked: your unpaid library dues total ${summary.totalUnpaid} BDT, which has reached the ${summary.maxUnpaidFineLimit} BDT limit. Please settle your dues at the library circulation desk (Cash / Bank Chalan) to restore reservation privileges.`);
    }
    return summary;
};
exports.assertSeatBookingEligibility = assertSeatBookingEligibility;
const evaluateCancellationFine = (params) => {
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
exports.evaluateCancellationFine = evaluateCancellationFine;
const formatMinutes = (minutes) => {
    const total = Math.max(0, Math.round(minutes));
    if (total < 60) {
        return `${total}m`;
    }
    const hours = Math.floor(total / 60);
    const rest = total % 60;
    return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
};
exports.formatMinutes = formatMinutes;
