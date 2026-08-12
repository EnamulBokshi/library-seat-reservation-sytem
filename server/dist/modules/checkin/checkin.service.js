"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckInService = void 0;
const http_status_1 = __importDefault(require("http-status"));
const prisma_1 = __importDefault(require("../../lib/prisma"));
const AppError_1 = __importDefault(require("../../helpers/AppError"));
const time_1 = require("../../utils/time");
const enums_1 = require("../../generated/enums");
/**
 * Handle entry/exit check-in via QR scan.
 */
const scanQR = async (qrToken) => {
    // 1. Fetch booking with seat and schedule info
    const booking = await prisma_1.default.booking.findUnique({
        where: { qrToken },
        include: {
            seat: true,
            schedule: true,
        },
    });
    if (!booking) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "No reservation found for the provided QR code");
    }
    // 2. Perform state checks
    if (booking.status === enums_1.BookingStatus.pending) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "This is an upcoming reservation. You can only check in during the reserved slot time.");
    }
    if (booking.status === enums_1.BookingStatus.completed) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "This reservation has already been completed.");
    }
    if (booking.status === enums_1.BookingStatus.cancelled) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "This reservation has been cancelled.");
    }
    if (booking.status === enums_1.BookingStatus.no_show) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "This reservation has been marked as a no-show.");
    }
    // 3. Entry Scan (Status is confirmed)
    if (booking.status === enums_1.BookingStatus.confirmed) {
        // Validate scan timing
        const active = (0, time_1.isSlotActive)(booking.schedule.date, booking.schedule.slot);
        if (!active) {
            throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "Cannot check in: the reserved schedule slot is not currently active.");
        }
        // Atomically check-in student and set seat occupancy
        const updated = await prisma_1.default.$transaction(async (tx) => {
            const b = await tx.booking.update({
                where: { id: booking.id },
                data: {
                    status: enums_1.BookingStatus.checked_in,
                    checkedInAt: new Date(),
                },
                include: {
                    seat: {
                        include: {
                            zone: true,
                        },
                    },
                    schedule: true,
                },
            });
            await tx.seat.update({
                where: { id: booking.seatId },
                data: { isOccupied: true },
            });
            return b;
        });
        return {
            booking: updated,
            action: "check_in",
            message: `Check-in successful! Student is assigned to seat ${updated.seat.seatNumber} in ${updated.seat.zone.name}.`,
        };
    }
    // 4. Exit Scan (Status is checked_in)
    if (booking.status === enums_1.BookingStatus.checked_in) {
        // Atomically complete booking and release seat occupancy
        const updated = await prisma_1.default.$transaction(async (tx) => {
            const b = await tx.booking.update({
                where: { id: booking.id },
                data: {
                    status: enums_1.BookingStatus.completed,
                    checkedOutAt: new Date(),
                },
                include: {
                    seat: {
                        include: {
                            zone: true,
                        },
                    },
                    schedule: true,
                },
            });
            await tx.seat.update({
                where: { id: booking.seatId },
                data: { isOccupied: false },
            });
            return b;
        });
        return {
            booking: updated,
            action: "check_out",
            message: `Check-out successful! Seat ${updated.seat.seatNumber} in ${updated.seat.zone.name} is now available.`,
        };
    }
    throw new AppError_1.default(http_status_1.default.INTERNAL_SERVER_ERROR, "Invalid booking state encountered");
};
exports.CheckInService = {
    scanQR,
};
