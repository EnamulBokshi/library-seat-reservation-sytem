import status from "http-status";
import prisma from "../../lib/prisma";
import AppError from "../../helpers/AppError";
import { isSlotActive } from "../../utils/time";
import { BookingStatus, SlotType } from "../../generated/enums";

/**
 * Handle entry/exit check-in via QR scan.
 */
const scanQR = async (qrToken: string) => {
    // 1. Fetch booking with seat, bookingSeats, and schedule info
    const booking = await prisma.booking.findUnique({
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
        throw new AppError(status.NOT_FOUND, "No reservation found for the provided QR code");
    }

    // 2. Perform state checks
    if (booking.status === BookingStatus.pending) {
        throw new AppError(
            status.BAD_REQUEST,
            "This is an upcoming reservation. You can only check in during the reserved slot time."
        );
    }

    if (booking.status === BookingStatus.completed) {
        throw new AppError(status.BAD_REQUEST, "This reservation has already been completed.");
    }

    if (booking.status === BookingStatus.cancelled) {
        throw new AppError(status.BAD_REQUEST, "This reservation has been cancelled.");
    }

    if (booking.status === BookingStatus.no_show) {
        throw new AppError(status.BAD_REQUEST, "This reservation has been marked as a no-show.");
    }

    const allSeatIds: string[] = [];
    if (booking.seatId) allSeatIds.push(booking.seatId);
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
    if (booking.status === BookingStatus.confirmed) {
        // Validate scan timing
        const active = isSlotActive(booking.schedule.date, booking.schedule.slot as SlotType);
        if (!active) {
            throw new AppError(
                status.BAD_REQUEST,
                "Cannot check in: the reserved schedule slot is not currently active."
            );
        }

        // Atomically check-in student and set occupancy for all seats in pass
        const updated = await prisma.$transaction(async (tx) => {
            const b = await tx.booking.update({
                where: { id: booking.id },
                data: {
                    status: BookingStatus.checked_in,
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
    if (booking.status === BookingStatus.checked_in) {
        // Atomically complete booking and release seat occupancy
        const updated = await prisma.$transaction(async (tx) => {
            const b = await tx.booking.update({
                where: { id: booking.id },
                data: {
                    status: BookingStatus.completed,
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

    throw new AppError(status.INTERNAL_SERVER_ERROR, "Invalid booking state encountered");
};

export const CheckInService = {
    scanQR,
};
