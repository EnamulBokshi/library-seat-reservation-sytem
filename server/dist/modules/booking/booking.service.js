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
const time_1 = require("../../utils/time");
const email_service_1 = require("../../services/email.service");
/**
 * Create a new single or multi-seat (group) booking for a student.
 */
const createBooking = async (userId, payload) => {
    // 1. Gather all requested seat IDs
    const targetSeatIds = payload.seatIds && payload.seatIds.length > 0
        ? Array.from(new Set(payload.seatIds))
        : payload.seatId ? [payload.seatId] : [];
    if (targetSeatIds.length === 0) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "At least one seat must be selected for reservation");
    }
    // 2. Fetch all requested seats with zone info
    const seats = await prisma_1.default.seat.findMany({
        where: { id: { in: targetSeatIds } },
        include: { zone: true },
    });
    if (seats.length !== targetSeatIds.length) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "One or more selected seats could not be found");
    }
    // 3. Verify all seats belong to the same active zone & are active
    const firstZone = seats[0].zone;
    if (!firstZone.isActive) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, `The study zone "${firstZone.name}" is currently inactive`);
    }
    for (const s of seats) {
        if (!s.isActive) {
            throw new AppError_1.default(http_status_1.default.BAD_REQUEST, `Seat ${s.seatNumber} is currently disabled for maintenance`);
        }
        if (s.zoneId !== firstZone.id) {
            throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "All reserved seats in a group booking must belong to the same study zone");
        }
    }
    // 4. Enforce zone-type rules
    if (firstZone.zoneType === enums_1.ZoneType.silent_desk && targetSeatIds.length > 1) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "Silent Study Zones only permit individual single-desk bookings to maintain strict focus.");
    }
    if (targetSeatIds.length > 1) {
        if (!firstZone.allowMultiSeat) {
            throw new AppError_1.default(http_status_1.default.BAD_REQUEST, `Multi-seat group reservations are not enabled for "${firstZone.name}".`);
        }
        if (targetSeatIds.length > firstZone.maxSeatsPerBooking) {
            throw new AppError_1.default(http_status_1.default.BAD_REQUEST, `You cannot reserve more than ${firstZone.maxSeatsPerBooking} seats in one booking for this zone.`);
        }
    }
    // 5. Verify schedule exists and is open
    const schedule = await prisma_1.default.schedule.findUnique({
        where: { id: payload.scheduleId },
    });
    if (!schedule) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "Schedule slot not found");
    }
    if (!schedule.isOpen) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "This schedule slot is closed");
    }
    // 6. Validate booking date & slot timing
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const advanceDays = await (0, time_1.getAdvanceBookingDays)();
    const maxDate = new Date(now);
    maxDate.setDate(now.getDate() + advanceDays);
    const maxDateStr = maxDate.toISOString().split("T")[0];
    const scheduleDateStr = new Date(schedule.date).toISOString().split("T")[0];
    if (scheduleDateStr < todayStr) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "Cannot book a schedule slot in the past");
    }
    if (scheduleDateStr > maxDateStr) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, `Reservations can only be made up to ${advanceDays} days in advance`);
    }
    const slotConfig = await (0, time_1.getActiveSlotConfig)();
    if ((0, time_1.isSlotExpired)(schedule.date, schedule.slot, slotConfig)) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "This time slot has already ended for today");
    }
    // 7. Enforce 1-active-booking rule per student
    const activeBooking = await prisma_1.default.booking.findFirst({
        where: {
            userId,
            status: {
                in: [enums_1.BookingStatus.pending, enums_1.BookingStatus.confirmed, enums_1.BookingStatus.checked_in],
            },
        },
    });
    if (activeBooking) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "You already have an active reservation pass. Please complete or cancel your existing pass before booking another session.");
    }
    // 8. Atomic FCFS Conflict Check: ensure none of the requested seats are booked for this schedule
    const existingConflict = await prisma_1.default.bookingSeat.findFirst({
        where: {
            seatId: { in: targetSeatIds },
            booking: {
                scheduleId: payload.scheduleId,
                status: {
                    in: [enums_1.BookingStatus.pending, enums_1.BookingStatus.confirmed, enums_1.BookingStatus.checked_in],
                },
            },
        },
        include: { seat: true },
    });
    if (existingConflict) {
        throw new AppError_1.default(http_status_1.default.CONFLICT, `Seat "${existingConflict.seat.seatNumber}" was just reserved by another student. (First-Come-First-Serve)`);
    }
    // Also check direct seatId on Booking for legacy records
    const legacyConflict = await prisma_1.default.booking.findFirst({
        where: {
            seatId: { in: targetSeatIds },
            scheduleId: payload.scheduleId,
            status: {
                in: [enums_1.BookingStatus.pending, enums_1.BookingStatus.confirmed, enums_1.BookingStatus.checked_in],
            },
        },
        include: { seat: true },
    });
    if (legacyConflict && legacyConflict.seat) {
        throw new AppError_1.default(http_status_1.default.CONFLICT, `Seat "${legacyConflict.seat.seatNumber}" is already reserved for this slot.`);
    }
    // 9. Initial Status & Unique QR token
    const initialStatus = scheduleDateStr === todayStr ? enums_1.BookingStatus.confirmed : enums_1.BookingStatus.pending;
    const qrToken = (0, uuid_1.v4)();
    const guestCount = targetSeatIds.length;
    const primarySeatId = targetSeatIds[0];
    // 10. Execute Transaction: Create Booking & BookingSeats
    const booking = await prisma_1.default.$transaction(async (tx) => {
        const createdBooking = await tx.booking.create({
            data: {
                userId,
                seatId: primarySeatId,
                scheduleId: payload.scheduleId,
                guestCount,
                status: initialStatus,
                qrToken,
            },
        });
        await tx.bookingSeat.createMany({
            data: targetSeatIds.map((sId) => ({
                bookingId: createdBooking.id,
                seatId: sId,
            })),
        });
        return tx.booking.findUnique({
            where: { id: createdBooking.id },
            include: {
                user: true,
                schedule: true,
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
            },
        });
    });
    if (!booking) {
        throw new AppError_1.default(http_status_1.default.INTERNAL_SERVER_ERROR, "Failed to create reservation record");
    }
    // 11. Generate QR code image as base64 string
    const qrCodeImage = await qrcode_1.default.toDataURL(qrToken);
    // 12. Asynchronously dispatch confirmation email
    if (booking.user?.email) {
        const seatNumbers = booking.bookingSeats?.length > 0
            ? booking.bookingSeats.map((bs) => bs.seat.seatNumber).join(", ")
            : booking.seat?.seatNumber ?? "Seat";
        const formattedDate = new Date(booking.schedule.date).toLocaleDateString();
        email_service_1.emailService.sendBookingConfirmationEmail({
            toEmail: booking.user.email,
            studentName: booking.user.name,
            seatNumber: seatNumbers,
            zoneName: firstZone.name,
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
 * FCFS Quick-Assign: Automatically pick the next optimal seat or table for the given party size.
 */
const getFCFSQuickAssign = async (userId, payload) => {
    const partySize = Math.max(1, payload.partySize || 1);
    const zone = await prisma_1.default.zone.findUnique({
        where: { id: payload.zoneId },
        include: {
            seats: {
                where: { isActive: true },
                orderBy: [
                    { tableNumber: "asc" },
                    { seatPosition: "asc" },
                    { seatNumber: "asc" },
                ],
            },
        },
    });
    if (!zone) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "Zone not found");
    }
    // Find all booked seat IDs for this schedule
    const bookedSeats = await prisma_1.default.bookingSeat.findMany({
        where: {
            seat: { zoneId: payload.zoneId },
            booking: {
                scheduleId: payload.scheduleId,
                status: {
                    in: [enums_1.BookingStatus.pending, enums_1.BookingStatus.confirmed, enums_1.BookingStatus.checked_in],
                },
            },
        },
        select: { seatId: true },
    });
    const bookedSeatIds = new Set(bookedSeats.map((b) => b.seatId));
    // Also include direct bookings
    const directBooked = await prisma_1.default.booking.findMany({
        where: {
            scheduleId: payload.scheduleId,
            seat: { zoneId: payload.zoneId },
            status: {
                in: [enums_1.BookingStatus.pending, enums_1.BookingStatus.confirmed, enums_1.BookingStatus.checked_in],
            },
        },
        select: { seatId: true },
    });
    directBooked.forEach((b) => {
        if (b.seatId)
            bookedSeatIds.add(b.seatId);
    });
    const availableSeats = zone.seats.filter((s) => !bookedSeatIds.has(s.id) && !s.isOccupied);
    if (availableSeats.length < partySize) {
        throw new AppError_1.default(http_status_1.default.CONFLICT, `Not enough available seats in this zone. Required: ${partySize}, Available: ${availableSeats.length}`);
    }
    // If looking for a group table (partySize > 1), try to find a single table with enough free seats
    if (partySize > 1) {
        const tableMap = new Map();
        for (const s of availableSeats) {
            const tableKey = s.tableNumber || "INDIVIDUAL";
            if (!tableMap.has(tableKey)) {
                tableMap.set(tableKey, []);
            }
            tableMap.get(tableKey).push(s);
        }
        // Find table with exact or sufficient available seats
        for (const [tableNumber, tSeats] of tableMap.entries()) {
            if (tableNumber !== "INDIVIDUAL" && tSeats.length >= partySize) {
                const selectedSeats = tSeats.slice(0, partySize);
                return {
                    suggestedSeats: selectedSeats,
                    tableNumber,
                    tableType: selectedSeats[0].tableType,
                    partySize,
                    totalAvailableInZone: availableSeats.length,
                };
            }
        }
    }
    // Fallback: pick the first available seats in FCFS order
    const selected = availableSeats.slice(0, partySize);
    return {
        suggestedSeats: selected,
        tableNumber: selected[0].tableNumber || null,
        tableType: selected[0].tableType,
        partySize,
        totalAvailableInZone: availableSeats.length,
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
        orderBy: {
            bookedAt: "desc",
        },
    });
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
 * List all bookings for librarians / admins with server-side pagination & query filters.
 */
const getAllBookings = async (filters) => {
    const whereCondition = {};
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
        whereCondition.OR = [
            { seat: { zoneId: filters.zoneId } },
            { bookingSeats: { some: { seat: { zoneId: filters.zoneId } } } },
        ];
    }
    if (filters.search && filters.search.trim() !== "") {
        const query = filters.search.trim();
        whereCondition.OR = [
            { user: { name: { contains: query, mode: "insensitive" } } },
            { user: { email: { contains: query, mode: "insensitive" } } },
            { user: { studentId: { contains: query, mode: "insensitive" } } },
            { seat: { seatNumber: { contains: query, mode: "insensitive" } } },
            { seat: { tableNumber: { contains: query, mode: "insensitive" } } },
            { seat: { zone: { name: { contains: query, mode: "insensitive" } } } },
            { bookingSeats: { some: { seat: { seatNumber: { contains: query, mode: "insensitive" } } } } },
        ];
    }
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 10));
    const skip = (page - 1) * limit;
    const sortBy = filters.sortBy || "bookedAt";
    const sortOrder = filters.sortOrder === "asc" ? "asc" : "desc";
    const orderBy = {};
    if (sortBy === "date") {
        orderBy.schedule = { date: sortOrder };
    }
    else if (sortBy === "studentName") {
        orderBy.user = { name: sortOrder };
    }
    else {
        orderBy[sortBy] = sortOrder;
    }
    const [total, bookings] = await Promise.all([
        prisma_1.default.booking.count({ where: whereCondition }),
        prisma_1.default.booking.findMany({
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
            orderBy,
            skip,
            take: limit,
        }),
    ]);
    const mappedBookings = await Promise.all(bookings.map(async (b) => {
        let qrCodeImage = null;
        try {
            qrCodeImage = await qrcode_1.default.toDataURL(b.qrToken);
        }
        catch (err) {
            console.error(`Failed to generate QR code for booking ${b.id}:`, err);
        }
        return {
            ...b,
            qrCodeImage,
        };
    }));
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
const getBookingById = async (id, userId, role) => {
    const booking = await prisma_1.default.booking.findUnique({
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
    if (!booking) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "Booking not found");
    }
    if (role === enums_1.Role.student && booking.userId !== userId) {
        throw new AppError_1.default(http_status_1.default.FORBIDDEN, "Access denied");
    }
    let qrCodeImage = null;
    try {
        qrCodeImage = await qrcode_1.default.toDataURL(booking.qrToken);
    }
    catch (err) {
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
const cancelBooking = async (id, userId, role) => {
    const booking = await prisma_1.default.booking.findUnique({
        where: { id },
        include: {
            seat: true,
            bookingSeats: true,
        },
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
        if (booking.status === enums_1.BookingStatus.completed ||
            booking.status === enums_1.BookingStatus.cancelled ||
            booking.status === enums_1.BookingStatus.no_show) {
            throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "This booking is already completed or inactive");
        }
    }
    // Perform status update and free occupancy for ALL booked seats atomically
    const cancelledBooking = await prisma_1.default.$transaction(async (tx) => {
        const updated = await tx.booking.update({
            where: { id },
            data: {
                status: enums_1.BookingStatus.cancelled,
                cancelledAt: new Date(),
            },
        });
        const seatIdsToFree = [];
        if (booking.seatId)
            seatIdsToFree.push(booking.seatId);
        if (booking.bookingSeats) {
            booking.bookingSeats.forEach((bs) => seatIdsToFree.push(bs.seatId));
        }
        if (booking.status === enums_1.BookingStatus.checked_in && seatIdsToFree.length > 0) {
            await tx.seat.updateMany({
                where: { id: { in: seatIdsToFree } },
                data: { isOccupied: false },
            });
        }
        return updated;
    });
    return cancelledBooking;
};
/**
 * Ensure schedule slots exist for today and the upcoming days (default 7 days).
 */
const ensureUpcomingSchedules = async (daysAhead = 7) => {
    const slots = [
        enums_1.SlotType.morning,
        enums_1.SlotType.noon,
        enums_1.SlotType.afternoon,
        enums_1.SlotType.evening,
    ];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let dayOffset = 0; dayOffset <= daysAhead; dayOffset++) {
        const d = new Date(today);
        d.setDate(today.getDate() + dayOffset);
        const dateStr = d.toISOString().split("T")[0];
        const dateOnly = new Date(`${dateStr}T00:00:00.000Z`);
        for (const slot of slots) {
            await prisma_1.default.schedule.upsert({
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
    const advanceDays = await (0, time_1.getAdvanceBookingDays)();
    await ensureUpcomingSchedules(advanceDays);
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const todayDate = new Date(`${todayStr}T00:00:00.000Z`);
    const maxDate = new Date(now);
    maxDate.setDate(now.getDate() + advanceDays);
    const maxDateStr = maxDate.toISOString().split("T")[0];
    const maxDateObj = new Date(`${maxDateStr}T23:59:59.999Z`);
    const schedules = await prisma_1.default.schedule.findMany({
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
    return schedules.filter((s) => {
        const sDateStr = new Date(s.date).toISOString().split("T")[0];
        return sDateStr >= todayStr;
    });
};
/**
 * Calculate dynamic real-time stats for home dashboard.
 */
const getDashboardStats = async (userId, role) => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const todayDate = new Date(`${todayStr}T00:00:00.000Z`);
    const expectedToday = await prisma_1.default.booking.count({
        where: {
            schedule: {
                date: todayDate,
            },
            status: {
                in: [enums_1.BookingStatus.pending, enums_1.BookingStatus.confirmed, enums_1.BookingStatus.checked_in, enums_1.BookingStatus.completed],
            },
        },
    });
    const checkedIn = await prisma_1.default.booking.count({
        where: {
            status: enums_1.BookingStatus.checked_in,
        },
    });
    const noShows = await prisma_1.default.booking.count({
        where: {
            schedule: {
                date: todayDate,
            },
            status: enums_1.BookingStatus.no_show,
        },
    });
    const totalActiveSeats = await prisma_1.default.seat.count({
        where: {
            isActive: true,
            zone: {
                isActive: true,
            },
        },
    });
    const occupiedSeatsCount = await prisma_1.default.seat.count({
        where: {
            isActive: true,
            isOccupied: true,
            zone: {
                isActive: true,
            },
        },
    });
    const availableSeats = Math.max(0, totalActiveSeats - occupiedSeatsCount);
    const zones = await prisma_1.default.zone.findMany({
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
        }
        else if (occupancyPercent >= 85) {
            statusLabel = `Busy (${occupancyPercent}%)`;
            statusBadgeClass = "bg-amber-50 border-amber-100 text-amber-800";
        }
        else if (occupancyPercent > 0) {
            statusLabel = "Active";
            statusBadgeClass = "bg-indigo-50 border-indigo-100 text-indigo-700";
        }
        return {
            id: z.id,
            name: z.name,
            description: z.description,
            zoneType: z.zoneType,
            allowMultiSeat: z.allowMultiSeat,
            maxSeatsPerBooking: z.maxSeatsPerBooking,
            defaultTableType: z.defaultTableType,
            isActive: z.isActive,
            totalSeats: total,
            occupiedSeats: occupied,
            availableSeats: available,
            occupancyPercent,
            statusLabel,
            statusBadgeClass,
        };
    });
    let studentStats = null;
    if (role === "student") {
        const myActivePasses = await prisma_1.default.booking.count({
            where: {
                userId,
                status: {
                    in: [enums_1.BookingStatus.pending, enums_1.BookingStatus.confirmed, enums_1.BookingStatus.checked_in],
                },
            },
        });
        const myCompletedSessions = await prisma_1.default.booking.count({
            where: {
                userId,
                status: enums_1.BookingStatus.completed,
            },
        });
        const myTotalBookings = await prisma_1.default.booking.count({
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
exports.BookingService = {
    createBooking,
    getFCFSQuickAssign,
    getMyBookings,
    getAllBookings,
    getBookingById,
    cancelBooking,
    getSchedules,
    getDashboardStats,
    ensureUpcomingSchedules,
};
