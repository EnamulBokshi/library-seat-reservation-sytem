import cron from "node-cron";
import prisma from "../lib/prisma";
import { BookingStatus, SlotType } from "../generated/enums";
import { BookingService } from "../modules/booking/booking.service";
import { getActiveSlotConfig, getAdvanceBookingDays, parseTimeToMinutes } from "../utils/time";

// Default grace period in minutes if not configured in DB
const DEFAULT_GRACE_PERIOD_MINUTES = 15;

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
    const slotConfig = await getActiveSlotConfig();
    const now = new Date();

    const todayStr = now.toISOString().split("T")[0];
    const todayDate = new Date(`${todayStr}T00:00:00.000Z`);

    // Fetch all confirmed bookings for today
    const confirmedBookings = await prisma.booking.findMany({
      where: {
        status: BookingStatus.confirmed,
        schedule: {
          date: todayDate,
        },
      },
      include: {
        schedule: true,
      },
    });

    const expiredBookingIds: string[] = [];

    for (const booking of confirmedBookings) {
      const slot = booking.schedule.slot as SlotType;
      const slotInfo = slotConfig[slot];
      if (!slotInfo || !slotInfo.enabled) continue;

      const startMinutes = parseTimeToMinutes(slotInfo.startTime);
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
        expiredBookingIds.push(booking.id);
      }
    }

    if (expiredBookingIds.length > 0) {
      const result = await prisma.booking.updateMany({
        where: {
          id: { in: expiredBookingIds },
          status: BookingStatus.confirmed,
        },
        data: {
          status: BookingStatus.no_show,
          cancelReason: `Auto-cancelled: Missed ${graceMinutes}-minute check-in grace period`,
        },
      });

      if (result.count > 0) {
        console.log(
          `[Cron Scheduler] Grace Period Enforcer: Auto-cancelled ${result.count} unverified reservation(s) (Grace: ${graceMinutes}m).`
        );
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
        bookingSeats: {
          select: { seatId: true },
        },
      },
    });

    if (checkedInBookings.length > 0) {
      const seatIdsSet = new Set<string>();
      checkedInBookings.forEach((b) => {
        if (b.seatId) seatIdsSet.add(b.seatId);
        if (b.bookingSeats) {
          b.bookingSeats.forEach((bs) => seatIdsSet.add(bs.seatId));
        }
      });
      const seatIds = Array.from(seatIdsSet);

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

      console.log(`[Cron Scheduler] Force-completed ${checkedInBookings.length} active sessions and released ${seatIds.length} seats.`);
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

  // 0. Ensure upcoming schedules exist immediately on startup
  getAdvanceBookingDays().then((days) => {
    BookingService.ensureUpcomingSchedules(days).catch((err) =>
      console.error("[Cron Scheduler] Failed to ensure upcoming schedules on startup:", err)
    );
  });

  // 1. Run grace-period check every minute
  cron.schedule("* * * * *", () => {
    checkGracePeriodCancellations();
  });

  // 2. Boundary cleanup for slot end times
  cron.schedule("0 12 * * *", () => processSlotCleanup(SlotType.morning));
  cron.schedule("0 14 * * *", () => processSlotCleanup(SlotType.noon));
  cron.schedule("0 18 * * *", () => processSlotCleanup(SlotType.afternoon));
  cron.schedule("0 21 * * *", () => processSlotCleanup(SlotType.evening));

  // 3. Roll over schedules daily at midnight
  cron.schedule("0 0 * * *", async () => {
    try {
      const advanceDays = await getAdvanceBookingDays();
      console.log(`[Cron Scheduler] Generating rolling schedules for upcoming ${advanceDays} days...`);
      await BookingService.ensureUpcomingSchedules(advanceDays);
    } catch (err) {
      console.error("[Cron Scheduler] Failed to generate daily rolling schedules:", err);
    }
  });

  console.log("[Cron Scheduler] Cron jobs scheduled successfully.");
};

