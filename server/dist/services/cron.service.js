"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initCronJobs = exports.checkCirculationRemindersAndFines = exports.checkSlotExpirationAndRelease = exports.checkSlotEndingWarnings = exports.checkGracePeriodCancellations = exports.getGracePeriodMinutes = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const enums_1 = require("../generated/enums");
const booking_service_1 = require("../modules/booking/booking.service");
const setting_service_1 = require("../modules/setting/setting.service");
const email_service_1 = require("./email.service");
const time_1 = require("../utils/time");
// Default grace period in minutes if not configured in DB
const DEFAULT_GRACE_PERIOD_MINUTES = 15;
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
 * Runs every minute to auto-cancel bookings that miss the check-in grace period window and notify students.
 */
const checkGracePeriodCancellations = async () => {
    try {
        const graceMinutes = await (0, exports.getGracePeriodMinutes)();
        const slotConfig = await (0, time_1.getActiveSlotConfig)();
        const now = new Date();
        const todayStr = now.toISOString().split("T")[0];
        const todayDate = new Date(`${todayStr}T00:00:00.000Z`);
        // Fetch all confirmed bookings for today with complete student & seat info
        const confirmedBookings = await prisma_1.default.booking.findMany({
            where: {
                status: enums_1.BookingStatus.confirmed,
                schedule: {
                    date: todayDate,
                },
            },
            include: {
                schedule: true,
                user: true,
                seat: {
                    include: {
                        zone: true,
                    },
                },
            },
        });
        const expiredBookings = [];
        for (const booking of confirmedBookings) {
            const slot = booking.schedule.slot;
            const slotInfo = slotConfig[slot];
            if (!slotInfo || !slotInfo.enabled)
                continue;
            const startMinutes = (0, time_1.parseTimeToMinutes)(slotInfo.startTime);
            const startHour = Math.floor(startMinutes / 60);
            const startMin = startMinutes % 60;
            // Slot start time on today's date
            const slotStartTime = new Date(now);
            slotStartTime.setHours(startHour, startMin, 0, 0);
            // Effective check-in deadline is the LATER of:
            // 1. Slot Start Time + graceMinutes (for reservations made in advance)
            // 2. Booking Creation Time (bookedAt) + graceMinutes (for reservations made during active slot)
            const slotStartCutoff = slotStartTime.getTime() + graceMinutes * 60 * 1000;
            const bookedAtCutoff = new Date(booking.bookedAt).getTime() + graceMinutes * 60 * 1000;
            const effectiveCutoff = Math.max(slotStartCutoff, bookedAtCutoff);
            if (now.getTime() >= effectiveCutoff) {
                expiredBookings.push(booking);
            }
        }
        if (expiredBookings.length > 0) {
            const expiredBookingIds = expiredBookings.map((b) => b.id);
            const result = await prisma_1.default.booking.updateMany({
                where: {
                    id: { in: expiredBookingIds },
                    status: enums_1.BookingStatus.confirmed,
                },
                data: {
                    status: enums_1.BookingStatus.no_show,
                    cancelReason: `Auto-cancelled: Missed ${graceMinutes}-minute check-in grace period`,
                },
            });
            if (result.count > 0) {
                console.log(`[Cron Scheduler] Grace Period Enforcer: Auto-cancelled ${result.count} unverified reservation(s) (Grace: ${graceMinutes}m).`);
                // Dispatch cancellation email to each affected student
                for (const b of expiredBookings) {
                    if (b.user?.email) {
                        const formattedDate = new Date(b.schedule.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                        });
                        const slotInfo = slotConfig[b.schedule.slot];
                        const timeRange = slotInfo ? `${slotInfo.startTime} – ${slotInfo.endTime}` : "";
                        email_service_1.emailService
                            .sendSeatNoShowCancellationEmail({
                            toEmail: b.user.email,
                            studentName: b.user.name,
                            seatNumber: b.seat.seatNumber,
                            zoneName: b.seat.zone.name,
                            dateStr: formattedDate,
                            slotName: b.schedule.slot,
                            timeRange,
                            graceMinutes,
                        })
                            .catch((err) => console.error(`[Cron Scheduler] Error sending no-show email to ${b.user.email}:`, err));
                    }
                }
            }
        }
    }
    catch (error) {
        console.error("[Cron Scheduler] Error running grace period check:", error);
    }
};
exports.checkGracePeriodCancellations = checkGracePeriodCancellations;
/**
 * Slot ending warning worker:
 * Runs every minute to dispatch an advance warning email to students 10 minutes before their booked time slot ends.
 */
const checkSlotEndingWarnings = async () => {
    try {
        const slotConfig = await (0, time_1.getActiveSlotConfig)();
        const now = new Date();
        const todayStr = now.toISOString().split("T")[0];
        const todayDate = new Date(`${todayStr}T00:00:00.000Z`);
        // Fetch active/confirmed bookings for today that haven't received the 10-minute warning email
        const activeBookings = await prisma_1.default.booking.findMany({
            where: {
                status: { in: [enums_1.BookingStatus.checked_in, enums_1.BookingStatus.confirmed] },
                slotWarningEmailSent: false,
                schedule: {
                    date: todayDate,
                },
            },
            include: {
                schedule: true,
                user: true,
                seat: {
                    include: {
                        zone: true,
                    },
                },
            },
        });
        for (const booking of activeBookings) {
            const slot = booking.schedule.slot;
            const slotInfo = slotConfig[slot];
            if (!slotInfo || !slotInfo.enabled)
                continue;
            const endMinutes = (0, time_1.parseTimeToMinutes)(slotInfo.endTime);
            const endHour = Math.floor(endMinutes / 60);
            const endMin = endMinutes % 60;
            const slotEndTime = new Date(now);
            slotEndTime.setHours(endHour, endMin, 0, 0);
            const diffMs = slotEndTime.getTime() - now.getTime();
            const minutesUntilEnd = diffMs / (60 * 1000);
            // Trigger if within 10 minutes of slot end (0 < minutesUntilEnd <= 10)
            if (minutesUntilEnd > 0 && minutesUntilEnd <= 10) {
                const roundedMin = Math.max(1, Math.ceil(minutesUntilEnd));
                // Mark flag immediately to guarantee single dispatch
                await prisma_1.default.booking.update({
                    where: { id: booking.id },
                    data: { slotWarningEmailSent: true },
                });
                if (booking.user?.email) {
                    const formattedDate = new Date(booking.schedule.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                    });
                    email_service_1.emailService
                        .sendSeatSlotEndingWarningEmail({
                        toEmail: booking.user.email,
                        studentName: booking.user.name,
                        seatNumber: booking.seat.seatNumber,
                        zoneName: booking.seat.zone.name,
                        dateStr: formattedDate,
                        slotName: booking.schedule.slot,
                        slotEndTimeStr: slotInfo.endTime,
                        minutesRemaining: roundedMin,
                    })
                        .catch((err) => console.error(`[Cron Scheduler] Error sending 10-min warning to ${booking.user.email}:`, err));
                    console.log(`[Cron Scheduler] Dispatched 10-minute warning email to ${booking.user.email} (Seat: ${booking.seat.seatNumber}, Slot: ${booking.schedule.slot}).`);
                }
            }
        }
    }
    catch (error) {
        console.error("[Cron Scheduler] Error running slot ending warning check:", error);
    }
};
exports.checkSlotEndingWarnings = checkSlotEndingWarnings;
/**
 * Dynamic slot expiration & seat release worker:
 * Runs every minute to auto-complete active sessions and release seats when their booked time slot ends.
 */
const checkSlotExpirationAndRelease = async () => {
    try {
        const slotConfig = await (0, time_1.getActiveSlotConfig)();
        const now = new Date();
        const todayStr = now.toISOString().split("T")[0];
        const todayDate = new Date(`${todayStr}T00:00:00.000Z`);
        const bookings = await prisma_1.default.booking.findMany({
            where: {
                status: { in: [enums_1.BookingStatus.checked_in, enums_1.BookingStatus.confirmed] },
                schedule: {
                    date: todayDate,
                },
            },
            include: {
                schedule: true,
                seat: true,
            },
        });
        const completedBookingIds = [];
        const noShowBookingIds = [];
        const seatIdsToFree = [];
        for (const booking of bookings) {
            const slot = booking.schedule.slot;
            const slotInfo = slotConfig[slot];
            if (!slotInfo)
                continue;
            const endMinutes = (0, time_1.parseTimeToMinutes)(slotInfo.endTime);
            const endHour = Math.floor(endMinutes / 60);
            const endMin = endMinutes % 60;
            const slotEndTime = new Date(now);
            slotEndTime.setHours(endHour, endMin, 0, 0);
            // If slot has ended (now >= slotEndTime)
            if (now.getTime() >= slotEndTime.getTime()) {
                if (booking.status === enums_1.BookingStatus.checked_in) {
                    completedBookingIds.push(booking.id);
                    seatIdsToFree.push(booking.seatId);
                }
                else if (booking.status === enums_1.BookingStatus.confirmed) {
                    noShowBookingIds.push(booking.id);
                    seatIdsToFree.push(booking.seatId);
                }
            }
        }
        if (completedBookingIds.length > 0 || noShowBookingIds.length > 0) {
            await prisma_1.default.$transaction([
                ...(completedBookingIds.length > 0
                    ? [
                        prisma_1.default.booking.updateMany({
                            where: { id: { in: completedBookingIds } },
                            data: {
                                status: enums_1.BookingStatus.completed,
                                checkedOutAt: now,
                            },
                        }),
                    ]
                    : []),
                ...(noShowBookingIds.length > 0
                    ? [
                        prisma_1.default.booking.updateMany({
                            where: { id: { in: noShowBookingIds } },
                            data: {
                                status: enums_1.BookingStatus.no_show,
                                cancelReason: "Auto-cancelled: Time slot expired without check-in",
                            },
                        }),
                    ]
                    : []),
                ...(seatIdsToFree.length > 0
                    ? [
                        prisma_1.default.seat.updateMany({
                            where: { id: { in: seatIdsToFree } },
                            data: { isOccupied: false },
                        }),
                    ]
                    : []),
            ]);
            console.log(`[Cron Scheduler] Slot Expiration Enforcer: Released ${seatIdsToFree.length} seat(s) (Completed: ${completedBookingIds.length}, No-show: ${noShowBookingIds.length})`);
        }
    }
    catch (error) {
        console.error("[Cron Scheduler] Error running slot expiration & release worker:", error);
    }
};
exports.checkSlotExpirationAndRelease = checkSlotExpirationAndRelease;
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
                cancelReason: "Auto-cancelled: Time slot expired without check-in",
            },
        });
        console.log(`[Cron Scheduler] Marked ${noShowResult.count} bookings as no-show.`);
        // Force checkout for checked_in bookings and release seats
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
 * Automated Circulation Engine:
 * 1. Dispatches 48-hour advance reminder emails for active loans.
 * 2. Identifies overdue loans, computes dynamic fines, updates status to 'overdue' and 'unpaid', and sends overdue alert emails.
 */
const checkCirculationRemindersAndFines = async () => {
    try {
        const now = new Date();
        const fineConfig = await setting_service_1.SettingService.getFineConfig();
        const warningDaysMs = fineConfig.warningDays * 24 * 60 * 60 * 1000;
        // ── 1. Check 2-Day Pre-Due Reminders ──
        const upcomingDueLoans = await prisma_1.default.bookLoan.findMany({
            where: {
                status: enums_1.LoanStatus.issued,
                warningEmailSent: false,
                dueDate: {
                    gte: now,
                    lte: new Date(now.getTime() + warningDaysMs),
                },
            },
            include: {
                book: true,
                user: true,
            },
        });
        for (const loan of upcomingDueLoans) {
            try {
                const diffMs = new Date(loan.dueDate).getTime() - now.getTime();
                const daysRemaining = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
                await email_service_1.emailService.sendLoanDueDateWarningEmail({
                    toEmail: loan.user.email,
                    studentName: loan.user.name,
                    bookTitle: loan.book.title,
                    dueDateStr: new Date(loan.dueDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                    }),
                    daysRemaining,
                    fineRatePerDay: fineConfig.defaultRate,
                });
                await prisma_1.default.bookLoan.update({
                    where: { id: loan.id },
                    data: { warningEmailSent: true },
                });
                console.log(`[Cron Scheduler] Dispatched 2-day reminder to ${loan.user.email} for book "${loan.book.title}".`);
            }
            catch (err) {
                console.error(`[Cron Scheduler] Error sending warning reminder for loan ${loan.id}:`, err);
            }
        }
        // ── 2. Check Overdue Loans and Accumulate Fines ──
        const overdueLoans = await prisma_1.default.bookLoan.findMany({
            where: {
                status: { in: [enums_1.LoanStatus.issued, enums_1.LoanStatus.overdue] },
                dueDate: {
                    lt: now,
                },
            },
            include: {
                book: true,
                user: true,
            },
        });
        for (const loan of overdueLoans) {
            try {
                const { daysOverdue, fineAmount } = await setting_service_1.SettingService.calculateLoanFine(loan.dueDate, now);
                const shouldSendOverdueAlert = !loan.overdueEmailSent;
                await prisma_1.default.bookLoan.update({
                    where: { id: loan.id },
                    data: {
                        status: enums_1.LoanStatus.overdue,
                        fineStatus: loan.fineStatus === "paid" ? "paid" : "unpaid",
                        fineAmount,
                        overdueEmailSent: true,
                    },
                });
                if (shouldSendOverdueAlert) {
                    await email_service_1.emailService.sendLoanOverdueAlertEmail({
                        toEmail: loan.user.email,
                        studentName: loan.user.name,
                        bookTitle: loan.book.title,
                        dueDateStr: new Date(loan.dueDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                        }),
                        daysOverdue,
                        fineAmount,
                        fineRatePerDay: fineConfig.defaultRate,
                    });
                    console.log(`[Cron Scheduler] Overdue alert dispatched to ${loan.user.email} (Fine: ${fineAmount} BDT).`);
                }
            }
            catch (err) {
                console.error(`[Cron Scheduler] Error processing overdue loan ${loan.id}:`, err);
            }
        }
    }
    catch (error) {
        console.error("[Cron Scheduler] Error running circulation cron:", error);
    }
};
exports.checkCirculationRemindersAndFines = checkCirculationRemindersAndFines;
/**
 * Initialize all scheduled cron services.
 */
const initCronJobs = () => {
    console.log("[Cron Scheduler] Initializing seat booking & circulation cron services...");
    // 0. Ensure upcoming schedules exist immediately on startup
    (0, time_1.getAdvanceBookingDays)().then((days) => {
        booking_service_1.BookingService.ensureUpcomingSchedules(days).catch((err) => console.error("[Cron Scheduler] Failed to ensure upcoming schedules on startup:", err));
    });
    // Run initial circulation and slot expiration checks once on startup
    (0, exports.checkCirculationRemindersAndFines)().catch((err) => console.error("[Cron Scheduler] Initial circulation check failed:", err));
    (0, exports.checkSlotExpirationAndRelease)().catch((err) => console.error("[Cron Scheduler] Initial slot expiration check failed:", err));
    // 1. Run 1-minute workers: grace-period cancellations, 10-minute slot warnings, and slot-end seat releases
    node_cron_1.default.schedule("* * * * *", async () => {
        await (0, exports.checkGracePeriodCancellations)();
        await (0, exports.checkSlotEndingWarnings)();
        await (0, exports.checkSlotExpirationAndRelease)();
    });
    // 2. Circulation reminders & overdue fine accumulator: runs every 15 minutes
    node_cron_1.default.schedule("*/15 * * * *", () => {
        (0, exports.checkCirculationRemindersAndFines)();
    });
    // 3. Boundary cleanup for slot end times
    node_cron_1.default.schedule("0 12 * * *", () => processSlotCleanup(enums_1.SlotType.morning));
    node_cron_1.default.schedule("0 14 * * *", () => processSlotCleanup(enums_1.SlotType.noon));
    node_cron_1.default.schedule("0 18 * * *", () => processSlotCleanup(enums_1.SlotType.afternoon));
    node_cron_1.default.schedule("0 21 * * *", () => processSlotCleanup(enums_1.SlotType.evening));
    // 4. Roll over schedules daily at midnight
    node_cron_1.default.schedule("0 0 * * *", async () => {
        try {
            const advanceDays = await (0, time_1.getAdvanceBookingDays)();
            console.log(`[Cron Scheduler] Generating rolling schedules for upcoming ${advanceDays} days...`);
            await booking_service_1.BookingService.ensureUpcomingSchedules(advanceDays);
        }
        catch (err) {
            console.error("[Cron Scheduler] Failed to generate daily rolling schedules:", err);
        }
    });
    console.log("[Cron Scheduler] Cron jobs scheduled successfully.");
};
exports.initCronJobs = initCronJobs;
