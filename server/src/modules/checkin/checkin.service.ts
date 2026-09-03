import status from "http-status";
import prisma from "../../lib/prisma";
import AppError from "../../helpers/AppError";
import { isSlotActive } from "../../utils/time";
import { BookingStatus, SlotType } from "../../generated/enums";

/**
 * Handle entry/exit check-in via QR scan.
 */
const scanQR = async (qrToken: string) => {
    // 1. Fetch booking with seat and schedule info
    const booking = await prisma.booking.findUnique({
        where: { qrToken },
        include: {
            seat: true,
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

        // Atomically check-in student and set seat occupancy
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

    throw new AppError(status.INTERNAL_SERVER_ERROR, "Invalid booking state encountered");
};

export const CheckInService = {
    scanQR,
};
