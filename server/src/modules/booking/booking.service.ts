import status from "http-status";
import { v4 as uuidv4 } from "uuid";
import QRCode from "qrcode";
import prisma from "../../lib/prisma";
import AppError from "../../helpers/AppError";
import { ICreateBookingPayload } from "./booking.interface";
import { BookingStatus, Role, SlotType } from "../../generated/enums";
import { isSlotExpired, getAdvanceBookingDays, getActiveSlotConfig } from "../../utils/time";

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

    // 3. Validate booking date (today up to dynamic advance days) & slot timing
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    const advanceDays = await getAdvanceBookingDays();
    const maxDate = new Date(now);
    maxDate.setDate(now.getDate() + advanceDays);
    const maxDateStr = maxDate.toISOString().split("T")[0];

    const scheduleDateStr = new Date(schedule.date).toISOString().split("T")[0];

    if (scheduleDateStr < todayStr) {
        throw new AppError(status.BAD_REQUEST, "Cannot book a schedule slot in the past");
    }

    if (scheduleDateStr > maxDateStr) {
        throw new AppError(status.BAD_REQUEST, `Reservations can only be made up to ${advanceDays} days in advance`);
    }

    const slotConfig = await getActiveSlotConfig();
    if (isSlotExpired(schedule.date, schedule.slot as SlotType, slotConfig)) {
        throw new AppError(status.BAD_REQUEST, "This time slot has already ended for today");
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
 * List all bookings for librarians / admins with server-side pagination & query filters.
 */
const getAllBookings = async (filters: {
    status?: BookingStatus;
    userId?: string;
    date?: string;
    slot?: SlotType;
    zoneId?: string;
    search?: string;
    page?: number | string;
    limit?: number | string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
}) => {
    const whereCondition: any = {};

    if (filters.status) {
        whereCondition.status = filters.status;
    }
    if (filters.userId) {
        whereCondition.userId = filters.userId;
    }
    if (filters.date || filters.slot) {
        whereCondition.schedule = whereCondition.schedule || {};
        if (filters.date) {
            whereCondition.schedule.date = new Date(`${filters.date}T00:00:00.000Z`);
        }
        if (filters.slot) {
            whereCondition.schedule.slot = filters.slot;
        }
    }
    if (filters.zoneId) {
        whereCondition.seat = {
            ...(whereCondition.seat || {}),
            zoneId: filters.zoneId,
        };
    }
    if (filters.search && filters.search.trim() !== "") {
        const query = filters.search.trim();
        whereCondition.OR = [
            { user: { name: { contains: query, mode: "insensitive" } } },
            { user: { email: { contains: query, mode: "insensitive" } } },
            { user: { studentId: { contains: query, mode: "insensitive" } } },
            { seat: { seatNumber: { contains: query, mode: "insensitive" } } },
            { seat: { zone: { name: { contains: query, mode: "insensitive" } } } },
        ];
    }

    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 10));
    const skip = (page - 1) * limit;

    const sortBy = filters.sortBy || "bookedAt";
    const sortOrder = filters.sortOrder === "asc" ? "asc" : "desc";
    const orderBy: any = {};

    if (sortBy === "date") {
        orderBy.schedule = { date: sortOrder };
    } else if (sortBy === "seatNumber") {
        orderBy.seat = { seatNumber: sortOrder };
    } else if (sortBy === "studentName") {
        orderBy.user = { name: sortOrder };
    } else {
        orderBy[sortBy] = sortOrder;
    }

    const [total, bookings] = await Promise.all([
        prisma.booking.count({ where: whereCondition }),
        prisma.booking.findMany({
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
            orderBy,
            skip,
            take: limit,
        }),
    ]);

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

    const totalPages = Math.ceil(total / limit);

    return {
        bookings: mappedBookings,
        meta: {
            total,
            page,
            limit,
            totalPages,
        },
    };
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

/**
 * Ensure schedule slots exist for today and the upcoming days (default 7 days).
 * Auto-creates open slots if they do not already exist.
 */
const ensureUpcomingSchedules = async (daysAhead: number = 7) => {
    const slots: SlotType[] = [
        SlotType.morning,
        SlotType.noon,
        SlotType.afternoon,
        SlotType.evening,
    ];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let dayOffset = 0; dayOffset <= daysAhead; dayOffset++) {
        const d = new Date(today);
        d.setDate(today.getDate() + dayOffset);
        const dateStr = d.toISOString().split("T")[0];
        const dateOnly = new Date(`${dateStr}T00:00:00.000Z`);

        for (const slot of slots) {
            await prisma.schedule.upsert({
                where: {
                    date_slot: {
                        date: dateOnly,
                        slot,
                    },
                },
                update: {},
                create: {
                    date: dateOnly,
                    slot,
                    isOpen: true,
                },
            });
        }
    }
};

const getSchedules = async () => {
    const advanceDays = await getAdvanceBookingDays();
    // Auto-generate upcoming schedules if missing
    await ensureUpcomingSchedules(advanceDays);

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const todayDate = new Date(`${todayStr}T00:00:00.000Z`);

    const maxDate = new Date(now);
    maxDate.setDate(now.getDate() + advanceDays);
    const maxDateStr = maxDate.toISOString().split("T")[0];
    const maxDateObj = new Date(`${maxDateStr}T23:59:59.999Z`);

    const schedules = await prisma.schedule.findMany({
        where: {
            isOpen: true,
            date: {
                gte: todayDate,
                lte: maxDateObj,
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

/**
 * Calculate dynamic real-time stats for home dashboard (for admins, librarians, and students).
 */
const getDashboardStats = async (userId: string, role: string) => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const todayDate = new Date(`${todayStr}T00:00:00.000Z`);

    // 1. Expected Today count
    const expectedToday = await prisma.booking.count({
        where: {
            schedule: {
                date: todayDate,
            },
            status: {
                in: [BookingStatus.pending, BookingStatus.confirmed, BookingStatus.checked_in, BookingStatus.completed],
            },
        },
    });

    // 2. Currently Checked In count
    const checkedIn = await prisma.booking.count({
        where: {
            status: BookingStatus.checked_in,
        },
    });

    // 3. No Shows for today
    const noShows = await prisma.booking.count({
        where: {
            schedule: {
                date: todayDate,
            },
            status: BookingStatus.no_show,
        },
    });

    // 4. Seats & Availability
    const totalActiveSeats = await prisma.seat.count({
        where: {
            isActive: true,
            zone: {
                isActive: true,
            },
        },
    });

    const occupiedSeatsCount = await prisma.seat.count({
        where: {
            isActive: true,
            isOccupied: true,
            zone: {
                isActive: true,
            },
        },
    });

    const availableSeats = Math.max(0, totalActiveSeats - occupiedSeatsCount);

    // 5. Zone Status List
    const zones = await prisma.zone.findMany({
        orderBy: { name: "asc" },
        include: {
            seats: {
                where: { isActive: true },
            },
        },
    });

    const liveZones = zones.map((z) => {
        const total = z.seats.length;
        const occupied = z.seats.filter((s) => s.isOccupied).length;
        const available = Math.max(0, total - occupied);
        const occupancyPercent = total > 0 ? Math.round((occupied / total) * 100) : 0;

        let statusLabel = "Available";
        let statusBadgeClass = "bg-emerald-50 border-emerald-100 text-emerald-700";

        if (!z.isActive) {
            statusLabel = "Closed";
            statusBadgeClass = "bg-rose-50 border-rose-100 text-rose-700";
        } else if (occupancyPercent >= 85) {
            statusLabel = `Busy (${occupancyPercent}%)`;
            statusBadgeClass = "bg-amber-50 border-amber-100 text-amber-800";
        } else if (occupancyPercent > 0) {
            statusLabel = "Active";
            statusBadgeClass = "bg-indigo-50 border-indigo-100 text-indigo-700";
        }

        return {
            id: z.id,
            name: z.name,
            description: z.description,
            isActive: z.isActive,
            totalSeats: total,
            occupiedSeats: occupied,
            availableSeats: available,
            occupancyPercent,
            statusLabel,
            statusBadgeClass,
        };
    });

    // 6. Student specific stats (if student)
    let studentStats = null;
    if (role === "student") {
        const myActivePasses = await prisma.booking.count({
            where: {
                userId,
                status: {
                    in: [BookingStatus.pending, BookingStatus.confirmed, BookingStatus.checked_in],
                },
            },
        });

        const myCompletedSessions = await prisma.booking.count({
            where: {
                userId,
                status: BookingStatus.completed,
            },
        });

        const myTotalBookings = await prisma.booking.count({
            where: { userId },
        });

        studentStats = {
            myActivePasses,
            myCompletedSessions,
            myTotalBookings,
        };
    }

    return {
        expectedToday,
        checkedIn,
        noShows,
        availableSeats,
        totalActiveSeats,
        liveZones,
        studentStats,
    };
};

export const BookingService = {
    createBooking,
    getMyBookings,
    getAllBookings,
    getBookingById,
    cancelBooking,
    getSchedules,
    getDashboardStats,
    ensureUpcomingSchedules,
};


