import cron from "node-cron";
import prisma from "../lib/prisma";
import { BookingStatus, SlotType } from "../generated/enums";

/**
 * Perform boundary checks and cleanup when a schedule slot ends.
 * - Marks all unconfirmed bookings (status: confirmed) as no_show.
 * - Marks all unreleased checked_in bookings as completed and resets seat occupancy.
 */
const processSlotCleanup = async (slot: SlotType) => {
    console.log(`[Cron Scheduler] Running boundary cleanup for slot: ${slot}...`);

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 1. Find schedule for today and the ended slot
        const schedule = await prisma.schedule.findUnique({
            where: {
                date_slot: {
                    date: today,
                    slot,
                },
            },
        });

        if (!schedule) {
            console.log(`[Cron Scheduler] No schedule slot found for date: ${today.toISOString().split("T")[0]} and slot: ${slot}. Skipping cleanup.`);
            return;
        }

        // 2. Mark no-shows: bookings that remained "confirmed" (Reserved but never checked in)
        const noShowResult = await prisma.booking.updateMany({
            where: {
                scheduleId: schedule.id,
                status: BookingStatus.confirmed,
            },
            data: {
                status: BookingStatus.no_show,
            },
        });

        console.log(`[Cron Scheduler] Marked ${noShowResult.count} bookings as no-show.`);

        // 3. Force checkout: bookings that remained "checked_in" (Checked-in but forgot to check-out)
        const checkedInBookings = await prisma.booking.findMany({
            where: {
                scheduleId: schedule.id,
                status: BookingStatus.checked_in,
            },
            select: {
                id: true,
                seatId: true,
            },
        });

        if (checkedInBookings.length > 0) {
            const seatIds = checkedInBookings.map((b) => b.seatId);

            await prisma.$transaction([
                // Update bookings to completed
                prisma.booking.updateMany({
                    where: {
                        scheduleId: schedule.id,
                        status: BookingStatus.checked_in,
                    },
                    data: {
                        status: BookingStatus.completed,
                        checkedOutAt: new Date(), // Force check-out at slot end
                    },
                }),
                // Release seat occupancies
                prisma.seat.updateMany({
                    where: {
                        id: { in: seatIds },
                    },
                    data: {
                        isOccupied: false,
                    },
                }),
            ]);

            console.log(`[Cron Scheduler] Force-completed ${checkedInBookings.length} active sessions and released their seats.`);
        } else {
            console.log("[Cron Scheduler] No active check-in sessions to force checkout.");
        }

        console.log(`[Cron Scheduler] Finished boundary cleanup for slot: ${slot}.`);
    } catch (error) {
        console.error(`[Cron Scheduler] Error processing cleanup for slot ${slot}:`, error);
    }
};

/**
 * Initialize all scheduled boundary cleanups.
 * boundaries: 12:00, 14:00, 18:00, 21:00
 */
export const initCronJobs = () => {
    console.log("[Cron Scheduler] Initializing seat booking cron services...");

    // 1. Morning slot ends at 12:00
    cron.schedule("0 12 * * *", () => {
        processSlotCleanup(SlotType.morning);
    });

    // 2. Noon slot ends at 14:00
    cron.schedule("0 14 * * *", () => {
        processSlotCleanup(SlotType.noon);
    });

    // 3. Afternoon slot ends at 18:00
    cron.schedule("0 18 * * *", () => {
        processSlotCleanup(SlotType.afternoon);
    });

    // 4. Evening slot ends at 21:00
    cron.schedule("0 21 * * *", () => {
        processSlotCleanup(SlotType.evening);
    });

    console.log("[Cron Scheduler] Cron jobs scheduled successfully.");
};
