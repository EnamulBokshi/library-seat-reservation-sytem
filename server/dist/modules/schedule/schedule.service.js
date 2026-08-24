"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScheduleService = void 0;
const http_status_1 = __importDefault(require("http-status"));
const prisma_1 = __importDefault(require("../../lib/prisma"));
const AppError_1 = __importDefault(require("../../helpers/AppError"));
const enums_1 = require("../../generated/enums");
const booking_service_1 = require("../booking/booking.service");
const time_1 = require("../../utils/time");
const ALL_SLOTS = [
    enums_1.SlotType.morning,
    enums_1.SlotType.noon,
    enums_1.SlotType.afternoon,
    enums_1.SlotType.evening,
];
/**
 * Fetch all schedules (open and closed) in a date range for administrators and librarians,
 * along with the active reservation count for each slot.
 */
const getAdminSchedules = async (startDateStr, endDateStr) => {
    const now = new Date();
    const defaultTodayStr = now.toISOString().split("T")[0];
    const startStr = startDateStr || defaultTodayStr;
    let endStr = endDateStr;
    if (!endStr) {
        const advanceDays = await (0, time_1.getAdvanceBookingDays)();
        const daysToLookAhead = Math.max(advanceDays, 14);
        const futureDate = new Date(now);
        futureDate.setDate(now.getDate() + daysToLookAhead);
        endStr = futureDate.toISOString().split("T")[0];
    }
    // Ensure schedules exist for this window
    const startDateObj = new Date(`${startStr}T00:00:00.000Z`);
    const endDateObj = new Date(`${endStr}T00:00:00.000Z`);
    const diffDays = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 0 && diffDays <= 60) {
        await booking_service_1.BookingService.ensureUpcomingSchedules(diffDays + 2);
    }
    const schedules = await prisma_1.default.schedule.findMany({
        where: {
            date: {
                gte: startDateObj,
                lte: endDateObj,
            },
        },
        include: {
            _count: {
                select: {
                    bookings: {
                        where: {
                            status: {
                                in: [enums_1.BookingStatus.pending, enums_1.BookingStatus.confirmed, enums_1.BookingStatus.checked_in],
                            },
                        },
                    },
                },
            },
        },
        orderBy: [{ date: "asc" }, { slot: "asc" }],
    });
    return schedules;
};
/**
 * Toggle the open/closed state of an individual schedule slot.
 */
const toggleScheduleSlot = async (id, isOpen) => {
    const schedule = await prisma_1.default.schedule.findUnique({
        where: { id },
    });
    if (!schedule) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "Schedule slot not found");
    }
    const updatedSchedule = await prisma_1.default.schedule.update({
        where: { id },
        data: { isOpen },
        include: {
            _count: {
                select: {
                    bookings: {
                        where: {
                            status: {
                                in: [enums_1.BookingStatus.pending, enums_1.BookingStatus.confirmed, enums_1.BookingStatus.checked_in],
                            },
                        },
                    },
                },
            },
        },
    });
    return updatedSchedule;
};
/**
 * Bulk open or close schedules across specified dates or date range and slots.
 */
const bulkToggleSchedules = async (payload) => {
    const targetSlots = payload.slots && payload.slots.length > 0 ? payload.slots : ALL_SLOTS;
    const datesToProcess = [];
    if (payload.dates && payload.dates.length > 0) {
        datesToProcess.push(...payload.dates);
    }
    else if (payload.startDate && payload.endDate) {
        const start = new Date(`${payload.startDate}T00:00:00.000Z`);
        const end = new Date(`${payload.endDate}T00:00:00.000Z`);
        const curr = new Date(start);
        while (curr <= end) {
            datesToProcess.push(curr.toISOString().split("T")[0]);
            curr.setDate(curr.getDate() + 1);
        }
    }
    else if (payload.startDate) {
        datesToProcess.push(payload.startDate);
    }
    if (datesToProcess.length === 0) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "No dates specified for bulk toggle");
    }
    let updatedCount = 0;
    for (const dateStr of datesToProcess) {
        const dateObj = new Date(`${dateStr}T00:00:00.000Z`);
        for (const slot of targetSlots) {
            await prisma_1.default.schedule.upsert({
                where: {
                    date_slot: {
                        date: dateObj,
                        slot,
                    },
                },
                update: {
                    isOpen: payload.isOpen,
                },
                create: {
                    date: dateObj,
                    slot,
                    isOpen: payload.isOpen,
                },
            });
            updatedCount++;
        }
    }
    return {
        success: true,
        message: `Successfully updated ${updatedCount} schedule slot(s) across ${datesToProcess.length} day(s).`,
        updatedSlotsCount: updatedCount,
        updatedDaysCount: datesToProcess.length,
        isOpen: payload.isOpen,
    };
};
/**
 * Manually generate schedule slots for N days ahead.
 */
const generateSchedules = async (daysAhead = 14) => {
    const safeDays = Math.min(Math.max(daysAhead, 1), 60);
    await booking_service_1.BookingService.ensureUpcomingSchedules(safeDays);
    return {
        message: `Successfully ensured schedule slots for the next ${safeDays} days.`,
        daysAhead: safeDays,
    };
};
exports.ScheduleService = {
    getAdminSchedules,
    toggleScheduleSlot,
    bulkToggleSchedules,
    generateSchedules,
};
