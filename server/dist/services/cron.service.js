"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initCronJobs = exports.getGracePeriodMinutes = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const enums_1 = require("../generated/enums");
const booking_service_1 = require("../modules/booking/booking.service");
// Default grace period in minutes if not configured in DB
const DEFAULT_GRACE_PERIOD_MINUTES = 15;
// Slot start hours (24h format)
const SLOT_START_HOURS = {
    morning: 8, // 08:00 AM
    noon: 12, // 12:00 PM
    afternoon: 14, // 02:00 PM
    evening: 18, // 06:00 PM
};
/**
 * Read the current check-in grace period setting (in minutes) from the database.
 */
const getGracePeriodMinutes = async () => {
    try {
        const setting = await prisma_1.default.setting.findUnique({
            where: { key: "CHECKIN_GRACE_PERIOD_MINUTES" },
        });
        if (setting && setting.value) {
            const val = parseInt(setting.value, 10);
            if (!isNaN(val) && val > 0)
                return val;
        }
    }
    catch {
        // Return default on error
    }
    return DEFAULT_GRACE_PERIOD_MINUTES;
};
exports.getGracePeriodMinutes = getGracePeriodMinutes;
/**
 * Dynamic grace period worker:
 * Runs every minute to auto-cancel bookings that miss the check-in grace period window.
 */
const checkGracePeriodCancellations = async () => {
    try {
        const graceMinutes = await (0, exports.getGracePeriodMinutes)();
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const todayStr = now.toISOString().split("T")[0];
        const todayDate = new Date(`${todayStr}T00:00:00.000Z`);
        // Check each slot window
        for (const [slotKey, startHour] of Object.entries(SLOT_START_HOURS)) {
            const slot = slotKey;
            // Calculate cutoff time in minutes from midnight for this slot
            const slotStartInMinutes = startHour * 60;
            const cutoffInMinutes = slotStartInMinutes + graceMinutes;
            const currentInMinutes = currentHour * 60 + currentMinute;
            // If current time has passed the grace period cutoff for this slot
            if (currentInMinutes >= cutoffInMinutes && currentInMinutes < slotStartInMinutes + 240) {
                const schedule = await prisma_1.default.schedule.findUnique({
                    where: {
                        date_slot: {
                            date: todayDate,
                            slot,
                        },
                    },
                });
                if (schedule) {
                    // Cancel unconfirmed bookings for this slot
                    const result = await prisma_1.default.booking.updateMany({
                        where: {
                            scheduleId: schedule.id,
                            status: enums_1.BookingStatus.confirmed,
                        },
                        data: {
                            status: enums_1.BookingStatus.no_show,
                            cancelReason: `Auto-cancelled: Missed ${graceMinutes}-minute check-in grace period`,
                        },
                    });
                    if (result.count > 0) {
                        console.log(`[Cron Scheduler] Grace Period Enforcer: Auto-cancelled ${result.count} unverified reservation(s) for slot '${slot}' (Grace: ${graceMinutes}m).`);
                    }
                }
            }
        }
    }
    catch (error) {
        console.error("[Cron Scheduler] Error running grace period check:", error);
    }
};
/**
 * Perform boundary checks and cleanup when a schedule slot ends.
 */
const processSlotCleanup = async (slot) => {
    console.log(`[Cron Scheduler] Running boundary cleanup for slot: ${slot}...`);
    try {
        const now = new Date();
        const todayStr = now.toISOString().split("T")[0];
        const todayDate = new Date(`${todayStr}T00:00:00.000Z`);
        const schedule = await prisma_1.default.schedule.findUnique({
            where: {
                date_slot: {
                    date: todayDate,
                    slot,
                },
            },
        });
        if (!schedule) {
            console.log(`[Cron Scheduler] No schedule slot found for date: ${todayStr} and slot: ${slot}. Skipping cleanup.`);
            return;
        }
        // Mark remaining confirmed as no_show
        const noShowResult = await prisma_1.default.booking.updateMany({
            where: {
                scheduleId: schedule.id,
                status: enums_1.BookingStatus.confirmed,
            },
            data: {
                status: enums_1.BookingStatus.no_show,
            },
        });
        console.log(`[Cron Scheduler] Marked ${noShowResult.count} bookings as no-show.`);
        // Force checkout for checked_in bookings
        const checkedInBookings = await prisma_1.default.booking.findMany({
            where: {
                scheduleId: schedule.id,
                status: enums_1.BookingStatus.checked_in,
            },
            select: {
                id: true,
                seatId: true,
            },
        });
        if (checkedInBookings.length > 0) {
            const seatIds = checkedInBookings.map((b) => b.seatId);
            await prisma_1.default.$transaction([
                prisma_1.default.booking.updateMany({
                    where: {
                        scheduleId: schedule.id,
                        status: enums_1.BookingStatus.checked_in,
                    },
                    data: {
                        status: enums_1.BookingStatus.completed,
                        checkedOutAt: new Date(),
                    },
                }),
                prisma_1.default.seat.updateMany({
                    where: {
                        id: { in: seatIds },
                    },
                    data: {
                        isOccupied: false,
                    },
                }),
            ]);
            console.log(`[Cron Scheduler] Force-completed ${checkedInBookings.length} active sessions and released their seats.`);
        }
        console.log(`[Cron Scheduler] Finished boundary cleanup for slot: ${slot}.`);
    }
    catch (error) {
        console.error(`[Cron Scheduler] Error processing cleanup for slot ${slot}:`, error);
    }
};
/**
 * Initialize all scheduled cron services.
 */
const initCronJobs = () => {
    console.log("[Cron Scheduler] Initializing seat booking cron services...");
    // 0. Ensure upcoming schedules exist immediately on startup
    booking_service_1.BookingService.ensureUpcomingSchedules(7).catch((err) => console.error("[Cron Scheduler] Failed to ensure upcoming schedules on startup:", err));
    // 1. Run grace-period check every minute
    node_cron_1.default.schedule("* * * * *", () => {
        checkGracePeriodCancellations();
    });
    // 2. Boundary cleanup for slot end times
    node_cron_1.default.schedule("0 12 * * *", () => processSlotCleanup(enums_1.SlotType.morning));
    node_cron_1.default.schedule("0 14 * * *", () => processSlotCleanup(enums_1.SlotType.noon));
    node_cron_1.default.schedule("0 18 * * *", () => processSlotCleanup(enums_1.SlotType.afternoon));
    node_cron_1.default.schedule("0 21 * * *", () => processSlotCleanup(enums_1.SlotType.evening));
    // 3. Roll over schedules daily at midnight
    node_cron_1.default.schedule("0 0 * * *", () => {
        console.log("[Cron Scheduler] Generating rolling schedules for upcoming 7 days...");
        booking_service_1.BookingService.ensureUpcomingSchedules(7).catch((err) => console.error("[Cron Scheduler] Failed to generate daily rolling schedules:", err));
    });
    console.log("[Cron Scheduler] Cron jobs scheduled successfully.");
};
exports.initCronJobs = initCronJobs;
