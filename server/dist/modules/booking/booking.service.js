"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingService = void 0;
const http_status_1 = __importDefault(require("http-status"));
const uuid_1 = require("uuid");
const qrcode_1 = __importDefault(require("qrcode"));
const prisma_1 = __importDefault(require("../../lib/prisma"));
const AppError_1 = __importDefault(require("../../helpers/AppError"));
const enums_1 = require("../../generated/enums");
const email_service_1 = require("../../services/email.service");
/**
 * Create a new booking for a student.
 */
const createBooking = async (userId, payload) => {
    // 1. Verify seat exists, belongs to active zone, and is active
    const seat = await prisma_1.default.seat.findUnique({
        where: { id: payload.seatId },
        include: { zone: true },
    });
    if (!seat) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "Seat not found");
    }
    if (!seat.isActive) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "This seat is currently inactive");
    }
    if (!seat.zone.isActive) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "The study zone of this seat is currently inactive");
    }
    // 2. Verify schedule exists and is open
    const schedule = await prisma_1.default.schedule.findUnique({
        where: { id: payload.scheduleId },
    });
    if (!schedule) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "Schedule slot not found");
    }
    if (!schedule.isOpen) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "This schedule slot is closed");
    }
    // 3. Validate booking date (today up to 7 days in advance)
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const maxDate = new Date(now);
    maxDate.setDate(now.getDate() + 7);
    const maxDateStr = maxDate.toISOString().split("T")[0];
    const scheduleDateStr = new Date(schedule.date).toISOString().split("T")[0];
    if (scheduleDateStr < todayStr) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "Cannot book a schedule slot in the past");
    }
    if (scheduleDateStr > maxDateStr) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "Reservations can only be made up to 7 days in advance");
    }
    // 4. Enforce 1-active-booking rule: (pending, confirmed, or checked_in)
    const activeBooking = await prisma_1.default.booking.findFirst({
        where: {
            userId,
            status: {
                in: [enums_1.BookingStatus.pending, enums_1.BookingStatus.confirmed, enums_1.BookingStatus.checked_in],
            },
        },
    });
    if (activeBooking) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "You already have an active reservation. Students are allowed only one active reservation at a time.");
    }
    // 5. Enforce double-booking check: (seat is already booked for this schedule)
    const seatBooked = await prisma_1.default.booking.findFirst({
        where: {
            seatId: payload.seatId,
            scheduleId: payload.scheduleId,
            status: {
                in: [enums_1.BookingStatus.pending, enums_1.BookingStatus.confirmed, enums_1.BookingStatus.checked_in],
            },
        },
    });
    if (seatBooked) {
        throw new AppError_1.default(http_status_1.default.CONFLICT, "This seat is already reserved by another student for this slot");
    }
    // 6. Determine initial status: pending (future date) or confirmed (today)
    const initialStatus = scheduleDateStr === todayStr ? enums_1.BookingStatus.confirmed : enums_1.BookingStatus.pending;
    const qrToken = (0, uuid_1.v4)();
    // 7. Create booking
    const booking = await prisma_1.default.booking.create({
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
    const qrCodeImage = await qrcode_1.default.toDataURL(qrToken);
    // 9. Asynchronously dispatch confirmation email with Resend
    if (booking.user?.email) {
        const formattedDate = new Date(booking.schedule.date).toLocaleDateString();
        email_service_1.emailService.sendBookingConfirmationEmail({
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
const getMyBookings = async (userId) => {
    const bookings = await prisma_1.default.booking.findMany({
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
    const mappedBookings = await Promise.all(bookings.map(async (booking) => {
        let qrCodeImage = null;
        if (booking.status === enums_1.BookingStatus.pending ||
            booking.status === enums_1.BookingStatus.confirmed ||
            booking.status === enums_1.BookingStatus.checked_in) {
            try {
                qrCodeImage = await qrcode_1.default.toDataURL(booking.qrToken);
            }
            catch (err) {
                console.error(`Failed to generate QR code for booking ${booking.id}:`, err);
            }
        }
        return {
            ...booking,
            qrCodeImage,
        };
    }));
    return mappedBookings;
};
/**
 * List all bookings for librarians / admins with query filters.
 */
const getAllBookings = async (filters) => {
    const whereCondition = {};
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
    const bookings = await prisma_1.default.booking.findMany({
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
    return bookings;
};
/**
 * Cancel a booking.
 */
const cancelBooking = async (id, userId, role) => {
    const booking = await prisma_1.default.booking.findUnique({
        where: { id },
        include: { seat: true },
    });
    if (!booking) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "Booking not found");
    }
    // If student, check ownership and restrict cancellation
    if (role === enums_1.Role.student) {
        if (booking.userId !== userId) {
            throw new AppError_1.default(http_status_1.default.FORBIDDEN, "Forbidden: You can only cancel your own bookings");
        }
        if (booking.status !== enums_1.BookingStatus.pending &&
            booking.status !== enums_1.BookingStatus.confirmed) {
            throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "Cannot cancel a reservation that has already started or finished");
        }
    }
    else {
        // Librarian / Admin check
        if (booking.status === enums_1.BookingStatus.completed ||
            booking.status === enums_1.BookingStatus.cancelled ||
            booking.status === enums_1.BookingStatus.no_show) {
            throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "This booking is already completed or inactive");
        }
    }
    // Perform status update and seat occupant reset atomically
    const cancelledBooking = await prisma_1.default.$transaction(async (tx) => {
        const updated = await tx.booking.update({
            where: { id },
            data: {
                status: enums_1.BookingStatus.cancelled,
                cancelledAt: new Date(),
            },
        });
        // If booking was checked in, free the seat occupancy status
        if (booking.status === enums_1.BookingStatus.checked_in) {
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
    const schedules = await prisma_1.default.schedule.findMany({
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
exports.BookingService = {
    createBooking,
    getMyBookings,
    getAllBookings,
    cancelBooking,
    getSchedules,
};
