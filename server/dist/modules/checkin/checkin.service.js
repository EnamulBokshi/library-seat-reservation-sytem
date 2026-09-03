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
    // 1. Fetch booking with seat, bookingSeats, and schedule info
    const booking = await prisma_1.default.booking.findUnique({
        where: { qrToken },
        include: {
            seat: {
                include: { zone: true },
            },
            bookingSeats: {
                include: {
                    seat: {
                        include: { zone: true },
                    },
                },
            },
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
    const allSeatIds = [];
    if (booking.seatId)
        allSeatIds.push(booking.seatId);
    if (booking.bookingSeats) {
        booking.bookingSeats.forEach((bs) => allSeatIds.push(bs.seatId));
    }
    const uniqueSeatIds = Array.from(new Set(allSeatIds));
    const seatDisplayList = booking.bookingSeats && booking.bookingSeats.length > 0
        ? booking.bookingSeats.map((bs) => bs.seat.seatNumber).join(", ")
        : booking.seat?.seatNumber ?? "Seat";
    const zoneName = booking.bookingSeats && booking.bookingSeats.length > 0
        ? booking.bookingSeats[0].seat.zone.name
        : booking.seat?.zone.name ?? "Library Hall";
    // 3. Entry Scan (Status is confirmed)
    if (booking.status === enums_1.BookingStatus.confirmed) {
        // Validate scan timing
        const active = (0, time_1.isSlotActive)(booking.schedule.date, booking.schedule.slot);
        if (!active) {
            throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "Cannot check in: the reserved schedule slot is not currently active.");
        }
        // Atomically check-in student and set occupancy for all seats in pass
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
                    bookingSeats: {
                        include: {
                            seat: {
                                include: {
                                    zone: true,
                                },
                            },
                        },
                    },
                    schedule: true,
                },
            });
            if (uniqueSeatIds.length > 0) {
                await tx.seat.updateMany({
                    where: { id: { in: uniqueSeatIds } },
                    data: { isOccupied: true },
                });
            }
            return b;
        });
        return {
            booking: updated,
            action: "check_in",
            message: `Check-in successful! Pass validated for ${seatDisplayList} in ${zoneName}.`,
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
                    bookingSeats: {
                        include: {
                            seat: {
                                include: {
                                    zone: true,
                                },
                            },
                        },
                    },
                    schedule: true,
                },
            });
            if (uniqueSeatIds.length > 0) {
                await tx.seat.updateMany({
                    where: { id: { in: uniqueSeatIds } },
                    data: { isOccupied: false },
                });
            }
            return b;
        });
        return {
            booking: updated,
            action: "check_out",
            message: `Check-out successful! ${seatDisplayList} in ${zoneName} is now freed and available.`,
        };
    }
    throw new AppError_1.default(http_status_1.default.INTERNAL_SERVER_ERROR, "Invalid booking state encountered");
};
exports.CheckInService = {
    scanQR,
};
