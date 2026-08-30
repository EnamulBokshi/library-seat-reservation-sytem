import cron from "node-cron";
import prisma from "../lib/prisma";
import { BookingStatus, SlotType, LoanStatus } from "../generated/enums";
import { BookingService } from "../modules/booking/booking.service";
import { SettingService } from "../modules/setting/setting.service";
import { emailService } from "./email.service";
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
 * Automated Circulation Engine:
 * 1. Dispatches 48-hour advance reminder emails for active loans.
 * 2. Identifies overdue loans, computes dynamic fines, updates status to 'overdue' and 'unpaid', and sends overdue alert emails.
 */
export const checkCirculationRemindersAndFines = async () => {
  try {
    const now = new Date();
    const fineConfig = await SettingService.getFineConfig();
    const warningDaysMs = fineConfig.warningDays * 24 * 60 * 60 * 1000;

    // ── 1. Check 2-Day Pre-Due Reminders ──
    const upcomingDueLoans = await prisma.bookLoan.findMany({
      where: {
        status: LoanStatus.issued,
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

        await emailService.sendLoanDueDateWarningEmail({
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

        await prisma.bookLoan.update({
          where: { id: loan.id },
          data: { warningEmailSent: true },
        });

        console.log(`[Cron Scheduler] Dispatched 2-day reminder to ${loan.user.email} for book "${loan.book.title}".`);
      } catch (err) {
        console.error(`[Cron Scheduler] Error sending warning reminder for loan ${loan.id}:`, err);
      }
    }

    // ── 2. Check Overdue Loans and Accumulate Fines ──
    const overdueLoans = await prisma.bookLoan.findMany({
      where: {
        status: { in: [LoanStatus.issued, LoanStatus.overdue] },
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
        const { daysOverdue, fineAmount } = await SettingService.calculateLoanFine(loan.dueDate, now);

        const shouldSendOverdueAlert = !loan.overdueEmailSent;

        await prisma.bookLoan.update({
          where: { id: loan.id },
          data: {
            status: LoanStatus.overdue,
            fineStatus: loan.fineStatus === "paid" ? "paid" : "unpaid",
            fineAmount,
            overdueEmailSent: true,
          },
        });

        if (shouldSendOverdueAlert) {
          await emailService.sendLoanOverdueAlertEmail({
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
      } catch (err) {
        console.error(`[Cron Scheduler] Error processing overdue loan ${loan.id}:`, err);
      }
    }
  } catch (error) {
    console.error("[Cron Scheduler] Error running circulation cron:", error);
  }
};

/**
 * Initialize all scheduled cron services.
 */
export const initCronJobs = () => {
  console.log("[Cron Scheduler] Initializing seat booking & circulation cron services...");

  // 0. Ensure upcoming schedules exist immediately on startup
  getAdvanceBookingDays().then((days) => {
    BookingService.ensureUpcomingSchedules(days).catch((err) =>
      console.error("[Cron Scheduler] Failed to ensure upcoming schedules on startup:", err)
    );
  });

  // Run circulation check once on startup
  checkCirculationRemindersAndFines().catch((err) =>
    console.error("[Cron Scheduler] Initial circulation check failed:", err)
  );

  // 1. Run grace-period check every minute
  cron.schedule("* * * * *", () => {
    checkGracePeriodCancellations();
  });

  // 2. Circulation reminders & overdue fine accumulator: runs every 15 minutes
  cron.schedule("*/15 * * * *", () => {
    checkCirculationRemindersAndFines();
  });

  // 3. Boundary cleanup for slot end times
  cron.schedule("0 12 * * *", () => processSlotCleanup(SlotType.morning));
  cron.schedule("0 14 * * *", () => processSlotCleanup(SlotType.noon));
  cron.schedule("0 18 * * *", () => processSlotCleanup(SlotType.afternoon));
  cron.schedule("0 21 * * *", () => processSlotCleanup(SlotType.evening));

  // 4. Roll over schedules daily at midnight
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

