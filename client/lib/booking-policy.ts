import { Booking, BookingPolicyConfig, SlotConfig, SlotType } from "./types";

export const DEFAULT_BOOKING_POLICY: BookingPolicyConfig = {
  freeCancelMinutes: 5,
  lateCancelFine: 5,
  lateCancelLeadMinutes: 120,
  noShowFine: 5,
  maxUnpaidFineLimit: 10,
  checkinGraceMinutes: 15,
};

const parseTimeToMinutes = (timeStr: string): number => {
  if (!timeStr) return 0;
  const [hourStr, minuteStr] = timeStr.split(":");
  return (parseInt(hourStr, 10) || 0) * 60 + (parseInt(minuteStr, 10) || 0);
};

/**
 * Absolute local start time of a booking's slot. Schedule dates arrive as UTC
 * midnight, so the calendar day is read in UTC and rebuilt in local time — this
 * mirrors getSlotStartDate() on the server.
 */
export const getSlotStartDate = (
  scheduleDate: string | Date,
  slot: SlotType,
  slotConfig: SlotConfig
): Date => {
  const startMinutes = parseTimeToMinutes(slotConfig[slot]?.startTime ?? "00:00");
  const sDate = new Date(scheduleDate);
  const start = new Date(sDate.getUTCFullYear(), sDate.getUTCMonth(), sDate.getUTCDate());
  start.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);
  return start;
};

export interface CancellationPreview {
  /** Seconds left in the free cancellation window (0 once elapsed). */
  freeSecondsRemaining: number;
  isWithinFreeWindow: boolean;
  /** Whether cancelling right now would charge the late fee. */
  willBeFined: boolean;
  fineAmount: number;
  minutesUntilSlotStart: number;
}

/**
 * Mirror of evaluateCancellationFine() on the server: a cancellation is only
 * fineable once the free window has closed AND the session is imminent.
 * The server remains the authority; this is for warning the student first.
 */
export const previewCancellation = (
  booking: Booking,
  policy: BookingPolicyConfig,
  slotConfig: SlotConfig,
  now: Date = new Date()
): CancellationPreview => {
  const bookedAt = new Date(booking.bookedAt).getTime();
  const freeUntil = bookedAt + policy.freeCancelMinutes * 60 * 1000;
  const freeSecondsRemaining = Math.max(0, Math.ceil((freeUntil - now.getTime()) / 1000));
  const isWithinFreeWindow = freeSecondsRemaining > 0;

  let minutesUntilSlotStart = 0;
  if (booking.schedule) {
    const slotStart = getSlotStartDate(
      booking.schedule.date,
      booking.schedule.slot,
      slotConfig
    );
    minutesUntilSlotStart = (slotStart.getTime() - now.getTime()) / (60 * 1000);
  }

  const isSlotImminent = minutesUntilSlotStart <= policy.lateCancelLeadMinutes;
  const willBeFined = !isWithinFreeWindow && isSlotImminent && policy.lateCancelFine > 0;

  return {
    freeSecondsRemaining,
    isWithinFreeWindow,
    willBeFined,
    fineAmount: willBeFined ? policy.lateCancelFine : 0,
    minutesUntilSlotStart,
  };
};

export const formatCountdown = (totalSeconds: number): string => {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

export const formatLeadTime = (minutes: number): string => {
  if (minutes <= 0) return "already started";
  if (minutes < 60) return `starts in ${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return rest === 0 ? `starts in ${hours}h` : `starts in ${hours}h ${rest}m`;
};
