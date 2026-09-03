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
 * Runs every minute to auto-cancel bookings that miss the check-in grace period window and notify students.
 */
export const checkGracePeriodCancellations = async () => {
  try {
    const graceMinutes = await getGracePeriodMinutes();
    const slotConfig = await getActiveSlotConfig();
    const now = new Date();

    const todayStr = now.toISOString().split("T")[0];
    const todayDate = new Date(`${todayStr}T00:00:00.000Z`);

    // Fetch all confirmed bookings for today with complete student & seat info
    const confirmedBookings = await prisma.booking.findMany({
      where: {
        status: BookingStatus.confirmed,
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

    const expiredBookings: typeof confirmedBookings = [];

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
        expiredBookings.push(booking);
      }
    }

    if (expiredBookings.length > 0) {
      const expiredBookingIds = expiredBookings.map((b) => b.id);

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

        // Dispatch cancellation email to each affected student
        for (const b of expiredBookings) {
          if (b.user?.email) {
            const formattedDate = new Date(b.schedule.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });
            const slotInfo = slotConfig[b.schedule.slot as SlotType];
            const timeRange = slotInfo ? `${slotInfo.startTime} – ${slotInfo.endTime}` : "";

            emailService
              .sendSeatNoShowCancellationEmail({
                toEmail: b.user.email,
                studentName: b.user.name,
                seatNumber: b.seat?.seatNumber ?? "Seat",
                zoneName: b.seat?.zone.name ?? "Library Hall",
                dateStr: formattedDate,
                slotName: b.schedule.slot,
                timeRange,
                graceMinutes,
              })
              .catch((err) =>
                console.error(`[Cron Scheduler] Error sending no-show email to ${b.user.email}:`, err)
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
 * Slot ending warning worker:
 * Runs every minute to dispatch an advance warning email to students 10 minutes before their booked time slot ends.
 */
export const checkSlotEndingWarnings = async () => {
  try {
    const slotConfig = await getActiveSlotConfig();
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const todayDate = new Date(`${todayStr}T00:00:00.000Z`);

    // Fetch active/confirmed bookings for today that haven't received the 10-minute warning email
    const activeBookings = await prisma.booking.findMany({
      where: {
        status: { in: [BookingStatus.checked_in, BookingStatus.confirmed] },
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
      const slot = booking.schedule.slot as SlotType;
      const slotInfo = slotConfig[slot];
      if (!slotInfo || !slotInfo.enabled) continue;

      const endMinutes = parseTimeToMinutes(slotInfo.endTime);
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
        await prisma.booking.update({
          where: { id: booking.id },
          data: { slotWarningEmailSent: true },
        });

        if (booking.user?.email) {
          const formattedDate = new Date(booking.schedule.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });

          const seatNumber = booking.seat?.seatNumber ?? "Seat";
          const zoneName = booking.seat?.zone.name ?? "Library Hall";

          emailService
            .sendSeatSlotEndingWarningEmail({
              toEmail: booking.user.email,
              studentName: booking.user.name,
              seatNumber,
              zoneName,
              dateStr: formattedDate,
              slotName: booking.schedule.slot,
              slotEndTimeStr: slotInfo.endTime,
              minutesRemaining: roundedMin,
            })
            .catch((err) =>
              console.error(`[Cron Scheduler] Error sending 10-min warning to ${booking.user.email}:`, err)
            );

          console.log(
            `[Cron Scheduler] Dispatched 10-minute warning email to ${booking.user.email} (Seat: ${seatNumber}, Slot: ${booking.schedule.slot}).`
          );
        }
      }
    }
  } catch (error) {
    console.error("[Cron Scheduler] Error running slot ending warning check:", error);
  }
};

/**
 * Dynamic slot expiration & seat release worker:
 * Runs every minute to auto-complete active sessions and release seats when their booked time slot ends.
 */
export const checkSlotExpirationAndRelease = async () => {
  try {
    const slotConfig = await getActiveSlotConfig();
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const todayDate = new Date(`${todayStr}T00:00:00.000Z`);

    const bookings = await prisma.booking.findMany({
      where: {
        status: { in: [BookingStatus.checked_in, BookingStatus.confirmed] },
        schedule: {
          date: todayDate,
        },
      },
      include: {
        schedule: true,
        seat: true,
      },
    });

    const completedBookingIds: string[] = [];
    const noShowBookingIds: string[] = [];
    const seatIdsToFree: string[] = [];

    for (const booking of bookings) {
      const slot = booking.schedule.slot as SlotType;
      const slotInfo = slotConfig[slot];
      if (!slotInfo) continue;

      const endMinutes = parseTimeToMinutes(slotInfo.endTime);
      const endHour = Math.floor(endMinutes / 60);
      const endMin = endMinutes % 60;

      const slotEndTime = new Date(now);
      slotEndTime.setHours(endHour, endMin, 0, 0);

      // If slot has ended (now >= slotEndTime)
      if (now.getTime() >= slotEndTime.getTime()) {
        if (booking.status === BookingStatus.checked_in) {
          completedBookingIds.push(booking.id);
          if (booking.seatId) seatIdsToFree.push(booking.seatId);
        } else if (booking.status === BookingStatus.confirmed) {
          noShowBookingIds.push(booking.id);
          if (booking.seatId) seatIdsToFree.push(booking.seatId);
        }
      }
    }

    if (completedBookingIds.length > 0 || noShowBookingIds.length > 0) {
      await prisma.$transaction([
        ...(completedBookingIds.length > 0
          ? [
              prisma.booking.updateMany({
                where: { id: { in: completedBookingIds } },
                data: {
                  status: BookingStatus.completed,
                  checkedOutAt: now,
                },
              }),
            ]
          : []),
        ...(noShowBookingIds.length > 0
          ? [
              prisma.booking.updateMany({
                where: { id: { in: noShowBookingIds } },
                data: {
                  status: BookingStatus.no_show,
                  cancelReason: "Auto-cancelled: Time slot expired without check-in",
                },
              }),
            ]
          : []),
        ...(seatIdsToFree.length > 0
          ? [
              prisma.seat.updateMany({
                where: { id: { in: seatIdsToFree } },
                data: { isOccupied: false },
              }),
            ]
          : []),
      ]);

      console.log(
        `[Cron Scheduler] Slot Expiration Enforcer: Released ${seatIdsToFree.length} seat(s) (Completed: ${completedBookingIds.length}, No-show: ${noShowBookingIds.length})`
      );
    }
  } catch (error) {
    console.error("[Cron Scheduler] Error running slot expiration & release worker:", error);
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
        cancelReason: "Auto-cancelled: Time slot expired without check-in",
      },
    });

    console.log(`[Cron Scheduler] Marked ${noShowResult.count} bookings as no-show.`);

    // Force checkout for checked_in bookings and release seats
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

  // Run initial circulation and slot expiration checks once on startup
  checkCirculationRemindersAndFines().catch((err) =>
    console.error("[Cron Scheduler] Initial circulation check failed:", err)
  );

  checkSlotExpirationAndRelease().catch((err) =>
    console.error("[Cron Scheduler] Initial slot expiration check failed:", err)
  );

  // 1. Run 1-minute workers: grace-period cancellations, 10-minute slot warnings, and slot-end seat releases
  cron.schedule("* * * * *", async () => {
    await checkGracePeriodCancellations();
    await checkSlotEndingWarnings();
    await checkSlotExpirationAndRelease();
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

