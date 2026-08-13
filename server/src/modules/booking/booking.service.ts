import status from "http-status";
import { v4 as uuidv4 } from "uuid";
import QRCode from "qrcode";
import prisma from "../../lib/prisma";
import AppError from "../../helpers/AppError";
import { ICreateBookingPayload } from "./booking.interface";
import { BookingStatus, Role } from "../../generated/enums";

import { emailService } from "../../services/email.service";

/**
 * Create a new booking for a student.
 */
const createBooking = async (userId: string, payload: ICreateBookingPayload) => {
    // 1. Verify seat exists, belongs to active zone, and is active
    const seat = await prisma.seat.findUnique({
        where: { id: payload.seatId },
        include: { zone: true },
    });

    if (!seat) {
        throw new AppError(status.NOT_FOUND, "Seat not found");
    }

    if (!seat.isActive) {
        throw new AppError(status.BAD_REQUEST, "This seat is currently inactive");
    }

    if (!seat.zone.isActive) {
        throw new AppError(status.BAD_REQUEST, "The study zone of this seat is currently inactive");
    }

    // 2. Verify schedule exists and is open
    const schedule = await prisma.schedule.findUnique({
        where: { id: payload.scheduleId },
    });

    if (!schedule) {
        throw new AppError(status.NOT_FOUND, "Schedule slot not found");
    }

    if (!schedule.isOpen) {
        throw new AppError(status.BAD_REQUEST, "This schedule slot is closed");
    }

    // 3. Validate booking date (today up to 7 days in advance)
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    const maxDate = new Date(now);
    maxDate.setDate(now.getDate() + 7);
    const maxDateStr = maxDate.toISOString().split("T")[0];

    const scheduleDateStr = new Date(schedule.date).toISOString().split("T")[0];

    if (scheduleDateStr < todayStr) {
        throw new AppError(status.BAD_REQUEST, "Cannot book a schedule slot in the past");
    }

    if (scheduleDateStr > maxDateStr) {
        throw new AppError(status.BAD_REQUEST, "Reservations can only be made up to 7 days in advance");
    }

    // 4. Enforce 1-active-booking rule: (pending, confirmed, or checked_in)
    const activeBooking = await prisma.booking.findFirst({
        where: {
            userId,
            status: {
                in: [BookingStatus.pending, BookingStatus.confirmed, BookingStatus.checked_in],
            },
        },
    });

    if (activeBooking) {
        throw new AppError(
            status.BAD_REQUEST,
            "You already have an active reservation. Students are allowed only one active reservation at a time."
        );
    }

    // 5. Enforce double-booking check: (seat is already booked for this schedule)
    const seatBooked = await prisma.booking.findFirst({
        where: {
            seatId: payload.seatId,
            scheduleId: payload.scheduleId,
            status: {
                in: [BookingStatus.pending, BookingStatus.confirmed, BookingStatus.checked_in],
            },
        },
    });

    if (seatBooked) {
        throw new AppError(status.CONFLICT, "This seat is already reserved by another student for this slot");
    }

    // 6. Determine initial status: pending (future date) or confirmed (today)
    const initialStatus =
        scheduleDateStr === todayStr ? BookingStatus.confirmed : BookingStatus.pending;

    const qrToken = uuidv4();

    // 7. Create booking
    const booking = await prisma.booking.create({
        data: {
            userId,
            seatId: payload.seatId,
            scheduleId: payload.scheduleId,
            status: initialStatus,
            qrToken,
        },
        include: {
            user: true,
            seat: {
                include: {
                    zone: true,
                },
            },
            schedule: true,
        },
    });

    // 8. Generate QR code image as base64 string
    const qrCodeImage = await QRCode.toDataURL(qrToken);

    // 9. Asynchronously dispatch confirmation email with Resend
    if (booking.user?.email) {
      const formattedDate = new Date(booking.schedule.date).toLocaleDateString();
      emailService.sendBookingConfirmationEmail({
        toEmail: booking.user.email,
        studentName: booking.user.name,
        seatNumber: booking.seat.seatNumber,
        zoneName: booking.seat.zone.name,
        dateStr: formattedDate,
        slotName: booking.schedule.slot,
        qrToken,
        qrCodeBase64: qrCodeImage,
      }).catch((err) => console.error("Error sending confirmation email:", err));
    }

    return {
        booking,
        qrCodeImage,
    };
};

/**
 * List own bookings for student.
 */
const getMyBookings = async (userId: string) => {
    const bookings = await prisma.booking.findMany({
        where: { userId },
        include: {
            seat: {
                include: {
                    zone: true,
                },
            },
            schedule: true,
        },
        orderBy: {
            bookedAt: "desc",
        },
    });

    // Map bookings and dynamically attach QR code base64 image for active ones
    const mappedBookings = await Promise.all(
        bookings.map(async (booking) => {
            let qrCodeImage = null;
            if (
                booking.status === BookingStatus.pending ||
                booking.status === BookingStatus.confirmed ||
                booking.status === BookingStatus.checked_in
            ) {
                try {
                    qrCodeImage = await QRCode.toDataURL(booking.qrToken);
                } catch (err) {
                    console.error(`Failed to generate QR code for booking ${booking.id}:`, err);
                }
            }
            return {
                ...booking,
                qrCodeImage,
            };
        })
    );

    return mappedBookings;
};

/**
 * List all bookings for librarians / admins with query filters.
 */
const getAllBookings = async (filters: {
    status?: BookingStatus;
    userId?: string;
    date?: string;
    zoneId?: string;
}) => {
    const whereCondition: any = {};

    if (filters.status) {
        whereCondition.status = filters.status;
    }
    if (filters.userId) {
        whereCondition.userId = filters.userId;
    }
    if (filters.date || filters.zoneId) {
        whereCondition.schedule = {};
        if (filters.date) {
            whereCondition.schedule.date = new Date(filters.date);
        }
    }
    if (filters.zoneId) {
        whereCondition.seat = {
            zoneId: filters.zoneId,
        };
    }

    const bookings = await prisma.booking.findMany({
        where: whereCondition,
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    studentId: true,
                },
            },
            seat: {
                include: {
                    zone: true,
                },
            },
            schedule: true,
        },
        orderBy: {
            bookedAt: "desc",
        },
    });

    const mappedBookings = await Promise.all(
        bookings.map(async (b) => {
            let qrCodeImage = null;
            try {
                qrCodeImage = await QRCode.toDataURL(b.qrToken);
            } catch (err) {
                console.error(`Failed to generate QR code for booking ${b.id}:`, err);
            }
            return {
                ...b,
                qrCodeImage,
            };
        })
    );

    return mappedBookings;
};

/**
 * Get single booking by ID.
 */
const getBookingById = async (id: string, userId: string, role: Role) => {
    const booking = await prisma.booking.findUnique({
        where: { id },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    studentId: true,
                },
            },
            seat: {
                include: {
                    zone: true,
                },
            },
            schedule: true,
        },
    });

    if (!booking) {
        throw new AppError(status.NOT_FOUND, "Booking not found");
    }

    if (role === Role.student && booking.userId !== userId) {
        throw new AppError(status.FORBIDDEN, "Access denied");
    }

    let qrCodeImage = null;
    try {
        qrCodeImage = await QRCode.toDataURL(booking.qrToken);
    } catch (err) {
        console.error(`Failed to generate QR code for booking ${booking.id}:`, err);
    }

    return {
        ...booking,
        qrCodeImage,
    };
};

/**
 * Cancel a booking.
 */
const cancelBooking = async (id: string, userId: string, role: Role) => {
    const booking = await prisma.booking.findUnique({
        where: { id },
        include: { seat: true },
    });

    if (!booking) {
        throw new AppError(status.NOT_FOUND, "Booking not found");
    }

    // If student, check ownership and restrict cancellation
    if (role === Role.student) {
        if (booking.userId !== userId) {
            throw new AppError(status.FORBIDDEN, "Forbidden: You can only cancel your own bookings");
        }

        if (
            booking.status !== BookingStatus.pending &&
            booking.status !== BookingStatus.confirmed
        ) {
            throw new AppError(
                status.BAD_REQUEST,
                "Cannot cancel a reservation that has already started or finished"
            );
        }
    } else {
        // Librarian / Admin check
        if (
            booking.status === BookingStatus.completed ||
            booking.status === BookingStatus.cancelled ||
            booking.status === BookingStatus.no_show
        ) {
            throw new AppError(status.BAD_REQUEST, "This booking is already completed or inactive");
        }
    }

    // Perform status update and seat occupant reset atomically
    const cancelledBooking = await prisma.$transaction(async (tx) => {
        const updated = await tx.booking.update({
            where: { id },
            data: {
                status: BookingStatus.cancelled,
                cancelledAt: new Date(),
            },
        });

        // If booking was checked in, free the seat occupancy status
        if (booking.status === BookingStatus.checked_in) {
            await tx.seat.update({
                where: { id: booking.seatId },
                data: { isOccupied: false },
            });
        }

        return updated;
    });

    return cancelledBooking;
};

const getSchedules = async () => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const todayDate = new Date(`${todayStr}T00:00:00.000Z`);

    const schedules = await prisma.schedule.findMany({
        where: {
            isOpen: true,
            date: {
                gte: todayDate,
            },
        },
        orderBy: [
            { date: "asc" },
            { slot: "asc" },
        ],
    });

    // Filter to ensure no past date is returned
    return schedules.filter((s) => {
        const sDateStr = new Date(s.date).toISOString().split("T")[0];
        return sDateStr >= todayStr;
    });
};

export const BookingService = {
    createBooking,
    getMyBookings,
    getAllBookings,
    getBookingById,
    cancelBooking,
    getSchedules,
};

