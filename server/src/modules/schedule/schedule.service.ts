import status from "http-status";
import prisma from "../../lib/prisma";
import AppError from "../../helpers/AppError";
import { BookingStatus, SlotType } from "../../generated/enums";
import { BookingService } from "../booking/booking.service";
import { getAdvanceBookingDays } from "../../utils/time";
import { IBulkToggleSchedulePayload, IToggleSchedulePayload } from "./schedule.interface";

const ALL_SLOTS: SlotType[] = [
  SlotType.morning,
  SlotType.noon,
  SlotType.afternoon,
  SlotType.evening,
];

/**
 * Fetch all schedules (open and closed) in a date range for administrators and librarians,
 * along with the active reservation count for each slot.
 */
const getAdminSchedules = async (startDateStr?: string, endDateStr?: string) => {
  const now = new Date();
  const defaultTodayStr = now.toISOString().split("T")[0];
  const startStr = startDateStr || defaultTodayStr;

  let endStr = endDateStr;
  if (!endStr) {
    const advanceDays = await getAdvanceBookingDays();
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
    await BookingService.ensureUpcomingSchedules(diffDays + 2);
  }

  const schedules = await prisma.schedule.findMany({
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
                in: [BookingStatus.pending, BookingStatus.confirmed, BookingStatus.checked_in],
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
const toggleScheduleSlot = async (id: string, isOpen: boolean) => {
  const schedule = await prisma.schedule.findUnique({
    where: { id },
  });

  if (!schedule) {
    throw new AppError(status.NOT_FOUND, "Schedule slot not found");
  }

  const updatedSchedule = await prisma.schedule.update({
    where: { id },
    data: { isOpen },
    include: {
      _count: {
        select: {
          bookings: {
            where: {
              status: {
                in: [BookingStatus.pending, BookingStatus.confirmed, BookingStatus.checked_in],
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
const bulkToggleSchedules = async (payload: IBulkToggleSchedulePayload) => {
  const targetSlots = payload.slots && payload.slots.length > 0 ? payload.slots : ALL_SLOTS;
  const datesToProcess: string[] = [];

  if (payload.dates && payload.dates.length > 0) {
    datesToProcess.push(...payload.dates);
  } else if (payload.startDate && payload.endDate) {
    const start = new Date(`${payload.startDate}T00:00:00.000Z`);
    const end = new Date(`${payload.endDate}T00:00:00.000Z`);
    
    const curr = new Date(start);
    while (curr <= end) {
      datesToProcess.push(curr.toISOString().split("T")[0]);
      curr.setDate(curr.getDate() + 1);
    }
  } else if (payload.startDate) {
    datesToProcess.push(payload.startDate);
  }

  if (datesToProcess.length === 0) {
    throw new AppError(status.BAD_REQUEST, "No dates specified for bulk toggle");
  }

  let updatedCount = 0;

  for (const dateStr of datesToProcess) {
    const dateObj = new Date(`${dateStr}T00:00:00.000Z`);
    for (const slot of targetSlots) {
      await prisma.schedule.upsert({
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
const generateSchedules = async (daysAhead: number = 14) => {
  const safeDays = Math.min(Math.max(daysAhead, 1), 60);
  await BookingService.ensureUpcomingSchedules(safeDays);
  return {
    message: `Successfully ensured schedule slots for the next ${safeDays} days.`,
    daysAhead: safeDays,
  };
};

export const ScheduleService = {
  getAdminSchedules,
  toggleScheduleSlot,
  bulkToggleSchedules,
  generateSchedules,
};
