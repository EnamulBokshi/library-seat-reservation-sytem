"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Booking, BookingPolicyConfig, SlotConfig } from "@/lib/types";
import {
  formatCountdown,
  formatLeadTime,
  previewCancellation,
} from "@/lib/booking-policy";
import { AlertTriangle, Ban, Clock, Loader2, ShieldCheck, X } from "lucide-react";

interface CancelBookingModalProps {
  booking: Booking;
  policy: BookingPolicyConfig;
  slotConfig: SlotConfig;
  /** Student's unpaid dues before this cancellation, for the balance preview. */
  currentUnpaid?: number;
  isCancelling?: boolean;
  errorMessage?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

export function CancelBookingModal({
  booking,
  policy,
  slotConfig,
  currentUnpaid = 0,
  isCancelling = false,
  errorMessage = null,
  onConfirm,
  onClose,
}: CancelBookingModalProps) {
  // Re-render once a second so the countdown stays live and flips the warning
  // the moment the free window closes.
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const preview = useMemo(
    () => previewCancellation(booking, policy, slotConfig, now),
    [booking, policy, slotConfig, now]
  );

  const seatLabel =
    booking.bookingSeats && booking.bookingSeats.length > 0
      ? booking.bookingSeats.map((bs) => bs.seat.seatNumber).join(", ")
      : booking.seat?.seatNumber ?? "Seat";

  const zoneLabel =
    booking.bookingSeats && booking.bookingSeats.length > 0
      ? booking.bookingSeats[0]?.seat?.zone?.name ?? "Library Hall"
      : booking.seat?.zone?.name ?? "Library Hall";

  const newBalance = currentUnpaid + preview.fineAmount;
  const willLock =
    policy.maxUnpaidFineLimit > 0 && newBalance >= policy.maxUnpaidFineLimit;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                preview.willBeFined
                  ? "bg-amber-50 text-amber-600"
                  : "bg-emerald-50 text-emerald-600"
              }`}
            >
              {preview.willBeFined ? (
                <AlertTriangle className="h-5 w-5" />
              ) : (
                <ShieldCheck className="h-5 w-5" />
              )}
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Cancel Reservation
              </h2>
              <p className="text-xs font-medium text-slate-500">
                {seatLabel} · {zoneLabel}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isCancelling}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {preview.isWithinFreeWindow ? (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
              <div className="flex items-center gap-2 text-emerald-800">
                <Clock className="h-4 w-4" />
                <span className="text-xs font-black uppercase tracking-wide">
                  Free cancellation
                </span>
              </div>
              <p className="mt-2 font-mono text-2xl font-black text-emerald-700">
                {formatCountdown(preview.freeSecondsRemaining)}
              </p>
              <p className="mt-1 text-xs font-medium leading-relaxed text-emerald-900/80">
                Cancel within this window and nothing is charged.
              </p>
            </div>
          ) : preview.willBeFined ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-xs font-black uppercase tracking-wide">
                  Late cancellation fee
                </span>
              </div>
              <p className="mt-2 text-2xl font-black text-amber-700">
                {preview.fineAmount} BDT
              </p>
              <p className="mt-1 text-xs font-medium leading-relaxed text-amber-900/80">
                The free window has passed and your session{" "}
                {formatLeadTime(preview.minutesUntilSlotStart)}. Cancelling now
                charges {preview.fineAmount} BDT, taking your unpaid dues to{" "}
                <strong>
                  {newBalance} BDT / {policy.maxUnpaidFineLimit} BDT limit
                </strong>
                .
              </p>
              {willLock && (
                <p className="mt-2 rounded-lg bg-rose-50 p-2 text-[11px] font-bold text-rose-700">
                  This will lock new seat reservations until you settle your dues
                  at the circulation desk.
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
              <div className="flex items-center gap-2 text-emerald-800">
                <ShieldCheck className="h-4 w-4" />
                <span className="text-xs font-black uppercase tracking-wide">
                  No fee
                </span>
              </div>
              <p className="mt-1 text-xs font-medium leading-relaxed text-emerald-900/80">
                Your session {formatLeadTime(preview.minutesUntilSlotStart)}, so
                there is ample time for another student to take the seat. No
                charge applies.
              </p>
            </div>
          )}

          {errorMessage && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
              {errorMessage}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              disabled={isCancelling}
              className="pulse-button-secondary flex-1 py-2.5 text-xs disabled:opacity-50"
            >
              Keep Reservation
            </button>
            <button
              onClick={onConfirm}
              disabled={isCancelling}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold text-white transition-colors disabled:opacity-60 ${
                preview.willBeFined
                  ? "bg-amber-600 hover:bg-amber-500"
                  : "bg-rose-600 hover:bg-rose-500"
              }`}
            >
              {isCancelling ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Ban className="h-3.5 w-3.5" />
              )}
              {preview.willBeFined
                ? `Cancel & Pay ${preview.fineAmount} BDT`
                : "Cancel Reservation"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CancelBookingModal;
