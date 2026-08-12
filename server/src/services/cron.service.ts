import cron from "node-cron";
import prisma from "../lib/prisma";
import { BookingStatus, SlotType } from "../generated/enums";

// Default grace period in minutes if not configured in DB
const DEFAULT_GRACE_PERIOD_MINUTES = 15;

// Slot start hours (24h format)
const SLOT_START_HOURS: Record<SlotType, number> = {
  morning: 8,     // 08:00 AM
  noon: 12,       // 12:00 PM
  afternoon: 14,  // 02:00 PM
  evening: 18,    // 06:00 PM
};

/**
 * Read the current check-in grace period setting (in minutes) from the database.
 */
export const getGracePeriodMinutes = async (): Promise<number> => {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: "CHECKIN_GRACE_PERIOD_MINUTES" },
    });
    if (setting && setting.value) {
      const val = parseInt(setting.value, 10);
      if (!isNaN(val) && val > 0) return val;
    }
  } catch {
    // Return default on error
  }
  return DEFAULT_GRACE_PERIOD_MINUTES;
};

/**
 * Dynamic grace period worker:
 * Runs every minute to auto-cancel bookings that miss the check-in grace period window.
 */
const checkGracePeriodCancellations = async () => {
  try {
    const graceMinutes = await getGracePeriodMinutes();
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const todayStr = now.toISOString().split("T")[0];
    const todayDate = new Date(`${todayStr}T00:00:00.000Z`);

    // Check each slot window
    for (const [slotKey, startHour] of Object.entries(SLOT_START_HOURS)) {
      const slot = slotKey as SlotType;
      // Calculate cutoff time in minutes from midnight for this slot
      const slotStartInMinutes = startHour * 60;
      const cutoffInMinutes = slotStartInMinutes + graceMinutes;
      const currentInMinutes = currentHour * 60 + currentMinute;

      // If current time has passed the grace period cutoff for this slot
      if (currentInMinutes >= cutoffInMinutes && currentInMinutes < slotStartInMinutes + 240) {
        const schedule = await prisma.schedule.findUnique({
          where: {
            date_slot: {
              date: todayDate,
              slot,
            },
          },
        });

        if (schedule) {
          // Cancel unconfirmed bookings for this slot
          const result = await prisma.booking.updateMany({
            where: {
              scheduleId: schedule.id,
              status: BookingStatus.confirmed,
            },
            data: {
              status: BookingStatus.no_show,
              cancelReason: `Auto-cancelled: Missed ${graceMinutes}-minute check-in grace period`,
            },
          });

          if (result.count > 0) {
            console.log(
              `[Cron Scheduler] Grace Period Enforcer: Auto-cancelled ${result.count} unverified reservation(s) for slot '${slot}' (Grace: ${graceMinutes}m).`
            );
          }
        }
      }
    }
  } catch (error) {
    console.error("[Cron Scheduler] Error running grace period check:", error);
  }
};

/**
 * Perform boundary checks and cleanup when a schedule slot ends.
 */
const processSlotCleanup = async (slot: SlotType) => {
  console.log(`[Cron Scheduler] Running boundary cleanup for slot: ${slot}...`);

  try {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const todayDate = new Date(`${todayStr}T00:00:00.000Z`);

    const schedule = await prisma.schedule.findUnique({
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

    // Force checkout for checked_in bookings
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
        prisma.booking.updateMany({
          where: {
            scheduleId: schedule.id,
            status: BookingStatus.checked_in,
          },
          data: {
            status: BookingStatus.completed,
            checkedOutAt: new Date(),
          },
        }),
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
    }

    console.log(`[Cron Scheduler] Finished boundary cleanup for slot: ${slot}.`);
  } catch (error) {
    console.error(`[Cron Scheduler] Error processing cleanup for slot ${slot}:`, error);
  }
};

/**
 * Initialize all scheduled cron services.
 */
export const initCronJobs = () => {
  console.log("[Cron Scheduler] Initializing seat booking cron services...");

  // 1. Run grace-period check every minute
  cron.schedule("* * * * *", () => {
    checkGracePeriodCancellations();
  });

  // 2. Boundary cleanup for slot end times
  cron.schedule("0 12 * * *", () => processSlotCleanup(SlotType.morning));
  cron.schedule("0 14 * * *", () => processSlotCleanup(SlotType.noon));
  cron.schedule("0 18 * * *", () => processSlotCleanup(SlotType.afternoon));
  cron.schedule("0 21 * * *", () => processSlotCleanup(SlotType.evening));

  console.log("[Cron Scheduler] Cron jobs scheduled successfully.");
};
