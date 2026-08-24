import { SlotType } from "../generated/enums";
import prisma from "../lib/prisma";

export interface SlotDetail {
  startTime: string; // "08:00"
  endTime: string;   // "12:00"
  label: string;     // "Morning"
  icon?: string;     // "🌅"
  enabled: boolean;
}

export type SlotConfig = Record<SlotType, SlotDetail>;

export const DEFAULT_SLOT_CONFIG: SlotConfig = {
  [SlotType.morning]: {
    startTime: "08:00",
    endTime: "12:00",
    label: "Morning",
    icon: "🌅",
    enabled: true,
  },
  [SlotType.noon]: {
    startTime: "12:00",
    endTime: "14:00",
    label: "Noon",
    icon: "☀️",
    enabled: true,
  },
  [SlotType.afternoon]: {
    startTime: "14:00",
    endTime: "18:00",
    label: "Afternoon",
    icon: "🌇",
    enabled: true,
  },
  [SlotType.evening]: {
    startTime: "18:00",
    endTime: "21:00",
    label: "Evening",
    icon: "🌙",
    enabled: true,
  },
};

export const parseTimeToMinutes = (timeStr: string): number => {
  if (!timeStr) return 0;
  const [hourStr, minuteStr] = timeStr.split(":");
  const hours = parseInt(hourStr, 10) || 0;
  const minutes = parseInt(minuteStr, 10) || 0;
  return hours * 60 + minutes;
};

/**
 * Retrieve the active Slot Configuration from database or return default.
 */
export const getActiveSlotConfig = async (): Promise<SlotConfig> => {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: "SLOT_CONFIG" },
    });
    if (setting?.value) {
      const parsed = JSON.parse(setting.value);
      return {
        ...DEFAULT_SLOT_CONFIG,
        ...parsed,
      };
    }
  } catch {
    // fallback to default
  }
  return DEFAULT_SLOT_CONFIG;
};

/**
 * Retrieve advance booking window in days.
 */
export const getAdvanceBookingDays = async (): Promise<number> => {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: "ADVANCE_BOOKING_DAYS" },
    });
    if (setting?.value) {
      const val = parseInt(setting.value, 10);
      if (!isNaN(val) && val > 0) return val;
    }
  } catch {
    // fallback to default
  }
  return 7;
};

/**
 * Checks if the current local time falls within the given date and slot type window.
 */
export const isSlotActive = (
  scheduleDate: Date,
  slot: SlotType,
  customConfig?: SlotConfig
): boolean => {
  const now = new Date();
  const sDate = new Date(scheduleDate);

  // Verify date matches (Year, Month, Date)
  if (
    now.getFullYear() !== sDate.getFullYear() ||
    now.getMonth() !== sDate.getMonth() ||
    now.getDate() !== sDate.getDate()
  ) {
    return false;
  }

  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const totalMinutes = currentHour * 60 + currentMinute;

  const config = customConfig ?? DEFAULT_SLOT_CONFIG;
  const slotInfo = config[slot] ?? DEFAULT_SLOT_CONFIG[slot];

  if (!slotInfo || !slotInfo.enabled) {
    return false;
  }

  const startMinutes = parseTimeToMinutes(slotInfo.startTime);
  const endMinutes = parseTimeToMinutes(slotInfo.endTime);

  return totalMinutes >= startMinutes && totalMinutes < endMinutes;
};

/**
 * Checks if the slot has already ended for the given schedule date.
 * If date is in the past, returns true.
 * If date is in the future, returns false.
 * If date is today, returns true if current time >= slot end time.
 */
export const isSlotExpired = (
  scheduleDate: Date,
  slot: SlotType,
  customConfig?: SlotConfig
): boolean => {
  const now = new Date();
  const sDate = new Date(scheduleDate);

  const todayStr = now.toISOString().split("T")[0];
  const sDateStr = sDate.toISOString().split("T")[0];

  if (sDateStr < todayStr) {
    return true;
  }
  if (sDateStr > todayStr) {
    return false;
  }

  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentMinutes = currentHour * 60 + currentMinute;

  const config = customConfig ?? DEFAULT_SLOT_CONFIG;
  const slotInfo = config[slot] ?? DEFAULT_SLOT_CONFIG[slot];

  if (!slotInfo) {
    return false;
  }

  const endMinutes = parseTimeToMinutes(slotInfo.endTime);
  return currentMinutes >= endMinutes;
};
