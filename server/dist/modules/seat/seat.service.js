"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeatService = void 0;
const http_status_1 = __importDefault(require("http-status"));
const prisma_1 = __importDefault(require("../../lib/prisma"));
const AppError_1 = __importDefault(require("../../helpers/AppError"));
const enums_1 = require("../../generated/enums");
/**
 * Add an individual seat to a zone.
 */
const createSeat = async (payload) => {
    // Check if zone exists
    const zone = await prisma_1.default.zone.findUnique({
        where: { id: payload.zoneId },
    });
    if (!zone) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "Zone not found");
    }
    // Check for duplicate seat number within this zone
    const existingSeat = await prisma_1.default.seat.findUnique({
        where: {
            zoneId_seatNumber: {
                zoneId: payload.zoneId,
                seatNumber: payload.seatNumber,
            },
        },
    });
    if (existingSeat) {
        throw new AppError_1.default(http_status_1.default.CONFLICT, "A seat with this number already exists in the selected zone");
    }
    const seat = await prisma_1.default.seat.create({
        data: {
            seatNumber: payload.seatNumber,
            zoneId: payload.zoneId,
            tableNumber: payload.tableNumber || null,
            tableType: payload.tableType || zone.defaultTableType || enums_1.TableType.individual_cubicle,
            tableCapacity: payload.tableCapacity || null,
            seatPosition: payload.seatPosition || null,
            isActive: true,
            isOccupied: false,
        },
    });
    return seat;
};
/**
 * Create a table cluster (e.g. Circle Table with 6 chairs, Meeting Table with 8 chairs).
 */
const createTableCluster = async (payload) => {
    const zone = await prisma_1.default.zone.findUnique({
        where: { id: payload.zoneId },
    });
    if (!zone) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "Zone not found");
    }
    const prefix = payload.prefix?.trim() || payload.tableNumber.trim().toUpperCase();
    const chairs = payload.chairCount;
    // Build seat payloads
    const seatData = Array.from({ length: chairs }, (_, idx) => {
        const chairIndex = idx + 1;
        const seatNo = `${prefix}-${chairIndex < 10 ? `0${chairIndex}` : chairIndex}`;
        return {
            seatNumber: seatNo,
            zoneId: payload.zoneId,
            tableNumber: payload.tableNumber.trim(),
            tableType: payload.tableType,
            tableCapacity: chairs,
            seatPosition: chairIndex,
            isActive: true,
            isOccupied: false,
        };
    });
    // Check if any seat numbers collide
    const seatNumbers = seatData.map((s) => s.seatNumber);
    const existing = await prisma_1.default.seat.findMany({
        where: {
            zoneId: payload.zoneId,
            seatNumber: { in: seatNumbers },
        },
    });
    if (existing.length > 0) {
        throw new AppError_1.default(http_status_1.default.CONFLICT, `Seats for table "${payload.tableNumber}" already exist or conflict with existing seat numbers (${existing.map(s => s.seatNumber).join(", ")}).`);
    }
    const createdSeats = await prisma_1.default.$transaction(seatData.map((data) => prisma_1.default.seat.create({ data })));
    return {
        tableNumber: payload.tableNumber.trim(),
        tableType: payload.tableType,
        tableCapacity: chairs,
        seatsCreated: createdSeats.length,
        seats: createdSeats,
    };
};
/**
 * Bulk generate multiple tables (e.g. 5 circle tables with 6 chairs each).
 */
const bulkCreateTables = async (payload) => {
    const zone = await prisma_1.default.zone.findUnique({
        where: { id: payload.zoneId },
    });
    if (!zone) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "Zone not found");
    }
    const startNum = payload.startTableNumber || 1;
    const prefix = payload.tablePrefix?.trim() || (payload.tableType === enums_1.TableType.circle_table ? "T" : "M");
    const allSeats = [];
    for (let t = 0; t < payload.tableCount; t++) {
        const tableIdx = startNum + t;
        const tableNumber = `${prefix}-${tableIdx < 10 ? `0${tableIdx}` : tableIdx}`;
        for (let c = 1; c <= payload.chairsPerTable; c++) {
            const seatNo = `${tableNumber}-S${c}`;
            allSeats.push({
                seatNumber: seatNo,
                zoneId: payload.zoneId,
                tableNumber,
                tableType: payload.tableType,
                tableCapacity: payload.chairsPerTable,
                seatPosition: c,
                isActive: true,
                isOccupied: false,
            });
        }
    }
    // Filter out duplicates if any
    const existing = await prisma_1.default.seat.findMany({
        where: {
            zoneId: payload.zoneId,
            seatNumber: { in: allSeats.map((s) => s.seatNumber) },
        },
        select: { seatNumber: true },
    });
    const existingSet = new Set(existing.map((e) => e.seatNumber));
    const validToCreate = allSeats.filter((s) => !existingSet.has(s.seatNumber));
    if (validToCreate.length === 0) {
        throw new AppError_1.default(http_status_1.default.CONFLICT, "All generated seats already exist in this zone.");
    }
    const createdSeats = await prisma_1.default.$transaction(validToCreate.map((data) => prisma_1.default.seat.create({ data })));
    return {
        tablesCreated: payload.tableCount,
        seatsCreated: createdSeats.length,
        skippedCount: allSeats.length - validToCreate.length,
    };
};
/**
 * Delete all seats in a table cluster.
 */
const deleteTable = async (zoneId, tableNumber) => {
    const seats = await prisma_1.default.seat.findMany({
        where: { zoneId, tableNumber },
    });
    if (seats.length === 0) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, `No seats found for table ${tableNumber}`);
    }
    const seatIds = seats.map((s) => s.id);
    try {
        await prisma_1.default.seat.deleteMany({
            where: { id: { in: seatIds } },
        });
        return { deletedCount: seatIds.length, mode: "hard" };
    }
    catch {
        await prisma_1.default.seat.updateMany({
            where: { id: { in: seatIds } },
            data: { isActive: false },
        });
        return { deletedCount: seatIds.length, mode: "soft" };
    }
};
/**
 * List seats in a zone with live occupancy, active status, table grouping, and optional schedule-specific booking info.
 */
const getSeatsByZone = async (zoneId, showInactive = false, scheduleId, currentUserId) => {
    // Check if zone exists
    const zone = await prisma_1.default.zone.findUnique({
        where: { id: zoneId },
    });
    if (!zone) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "Zone not found");
    }
    const whereCondition = showInactive
        ? { zoneId }
        : { zoneId, isActive: true };
    const seats = await prisma_1.default.seat.findMany({
        where: whereCondition,
        orderBy: [
            { tableNumber: "asc" },
            { seatPosition: "asc" },
            { seatNumber: "asc" },
        ],
    });
    if (!scheduleId) {
        return seats;
    }
    const seatIds = seats.map((s) => s.id);
    // Find all active bookings for this schedule in this zone (either direct seatId or via bookingSeats join table)
    const [directBookings, multiSeatBookings] = await Promise.all([
        prisma_1.default.booking.findMany({
            where: {
                scheduleId,
                seatId: { in: seatIds },
                status: {
                    in: [enums_1.BookingStatus.pending, enums_1.BookingStatus.confirmed, enums_1.BookingStatus.checked_in],
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
        }),
        prisma_1.default.bookingSeat.findMany({
            where: {
                seatId: { in: seatIds },
                booking: {
                    scheduleId,
                    status: {
                        in: [enums_1.BookingStatus.pending, enums_1.BookingStatus.confirmed, enums_1.BookingStatus.checked_in],
                    },
                },
            },
            select: {
                seatId: true,
                booking: {
                    select: {
                        id: true,
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
                },
            },
        }),
    ]);
    const bookingMap = new Map();
    directBookings.forEach((b) => {
        if (b.seatId) {
            bookingMap.set(b.seatId, b);
        }
    });
    multiSeatBookings.forEach((mb) => {
        if (!bookingMap.has(mb.seatId)) {
            bookingMap.set(mb.seatId, {
                id: mb.booking.id,
                seatId: mb.seatId,
                userId: mb.booking.userId,
                status: mb.booking.status,
                user: mb.booking.user,
            });
        }
    });
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
const updateSeat = async (id, payload) => {
    const seat = await prisma_1.default.seat.findUnique({
        where: { id },
    });
    if (!seat) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "Seat not found");
    }
    // If updating seat number, check for collision in the same zone
    if (payload.seatNumber && payload.seatNumber !== seat.seatNumber) {
        const existingSeat = await prisma_1.default.seat.findUnique({
            where: {
                zoneId_seatNumber: {
                    zoneId: seat.zoneId,
                    seatNumber: payload.seatNumber,
                },
            },
        });
        if (existingSeat) {
            throw new AppError_1.default(http_status_1.default.CONFLICT, "A seat with this number already exists in this zone");
        }
    }
    const updatedSeat = await prisma_1.default.seat.update({
        where: { id },
        data: payload,
    });
    return updatedSeat;
};
/**
 * Delete / Soft-disable seat.
 */
const deleteSeat = async (id) => {
    const seat = await prisma_1.default.seat.findUnique({
        where: { id },
    });
    if (!seat) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "Seat not found");
    }
    try {
        const deletedSeat = await prisma_1.default.seat.delete({
            where: { id },
        });
        return { deletedSeat, mode: "hard" };
    }
    catch {
        const softDisabledSeat = await prisma_1.default.seat.update({
            where: { id },
            data: { isActive: false },
        });
        return { deletedSeat: softDisabledSeat, mode: "soft" };
    }
};
exports.SeatService = {
    createSeat,
    createTableCluster,
    bulkCreateTables,
    deleteTable,
    getSeatsByZone,
    updateSeat,
    deleteSeat,
};
