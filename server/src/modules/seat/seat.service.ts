import status from "http-status";
import prisma from "../../lib/prisma";
import AppError from "../../helpers/AppError";
import { BookingStatus } from "../../generated/enums";
import { ICreateSeatPayload, IUpdateSeatPayload } from "./seat.interface";

/**
 * Add a seat to a zone.
 */
const createSeat = async (payload: ICreateSeatPayload) => {
    // Check if zone exists
    const zone = await prisma.zone.findUnique({
        where: { id: payload.zoneId },
    });

    if (!zone) {
        throw new AppError(status.NOT_FOUND, "Zone not found");
    }

    // Check for duplicate seat number within this zone
    const existingSeat = await prisma.seat.findUnique({
        where: {
            zoneId_seatNumber: {
                zoneId: payload.zoneId,
                seatNumber: payload.seatNumber,
            },
        },
    });

    if (existingSeat) {
        throw new AppError(status.CONFLICT, "A seat with this number already exists in the selected zone");
    }

    const seat = await prisma.seat.create({
        data: {
            seatNumber: payload.seatNumber,
            zoneId: payload.zoneId,
            isActive: true,
            isOccupied: false,
        },
    });

    return seat;
};

/**
 * List seats in a zone with live occupancy, active status, and optional schedule-specific booking info.
 */
const getSeatsByZone = async (
    zoneId: string,
    showInactive = false,
    scheduleId?: string,
    currentUserId?: string
) => {
    // Check if zone exists
    const zone = await prisma.zone.findUnique({
        where: { id: zoneId },
    });

    if (!zone) {
        throw new AppError(status.NOT_FOUND, "Zone not found");
    }

    const whereCondition = showInactive
        ? { zoneId }
        : { zoneId, isActive: true };

    const seats = await prisma.seat.findMany({
        where: whereCondition,
        orderBy: {
            seatNumber: "asc",
        },
    });

    if (!scheduleId) {
        return seats;
    }

    // Find all active bookings for this schedule in this zone
    const bookings = await prisma.booking.findMany({
        where: {
            scheduleId,
            seatId: { in: seats.map((s) => s.id) },
            status: {
                in: [BookingStatus.pending, BookingStatus.confirmed, BookingStatus.checked_in],
            },
        },
        select: {
            id: true,
            seatId: true,
            userId: true,
            status: true,
            user: {
                select: {
                    id: true,
                    name: true,
                    studentId: true,
                },
            },
        },
    });

    const bookingMap = new Map(bookings.map((b) => [b.seatId, b]));

    return seats.map((seat) => {
        const booking = bookingMap.get(seat.id);
        const isBooked = !!booking;
        const isMyBooking = isBooked && currentUserId ? booking.userId === currentUserId : false;

        return {
            ...seat,
            isBooked,
            isMyBooking,
            booking: booking
                ? {
                      id: booking.id,
                      status: booking.status,
                      user: booking.user,
                  }
                : null,
        };
    });
};

/**
 * Update a seat.
 */
const updateSeat = async (id: string, payload: IUpdateSeatPayload) => {
    const seat = await prisma.seat.findUnique({
        where: { id },
    });

    if (!seat) {
        throw new AppError(status.NOT_FOUND, "Seat not found");
    }

    // If updating seat number, check for collision in the same zone
    if (payload.seatNumber && payload.seatNumber !== seat.seatNumber) {
        const existingSeat = await prisma.seat.findUnique({
            where: {
                zoneId_seatNumber: {
                    zoneId: seat.zoneId,
                    seatNumber: payload.seatNumber,
                },
            },
        });
        if (existingSeat) {
            throw new AppError(status.CONFLICT, "A seat with this number already exists in this zone");
        }
    }

    const updatedSeat = await prisma.seat.update({
        where: { id },
        data: payload,
    });

    return updatedSeat;
};

/**
 * Delete / Soft-disable seat.
 */
const deleteSeat = async (id: string) => {
    const seat = await prisma.seat.findUnique({
        where: { id },
    });

    if (!seat) {
        throw new AppError(status.NOT_FOUND, "Seat not found");
    }

    // Try hard delete first, fallback to soft disable if foreign key constraints are hit (e.g. seat has bookings)
    try {
        const deletedSeat = await prisma.seat.delete({
            where: { id },
        });
        return { deletedSeat, mode: "hard" };
    } catch (error: any) {
        // If it fails because of relationships, do a soft disable
        const softDisabledSeat = await prisma.seat.update({
            where: { id },
            data: { isActive: false },
        });
        return { deletedSeat: softDisabledSeat, mode: "soft" };
    }
};

export const SeatService = {
    createSeat,
    getSeatsByZone,
    updateSeat,
    deleteSeat,
};
