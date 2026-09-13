"use client";

import React, { useState } from "react";
import { ApiError, Booking, PaymentMethod } from "@/lib/types";
import { bookingService } from "@/services/booking-service";
import { Banknote, CreditCard, Loader2, Receipt, X } from "lucide-react";

interface SettleSeatFineModalProps {
  booking: Booking;
  onClose: () => void;
  /** Called after a successful settle or waive so the caller can refresh. */
  onSettled: () => void;
}

const METHODS: { value: PaymentMethod; label: string; Icon: React.ElementType }[] = [
  { value: "cash", label: "Cash", Icon: Banknote },
  { value: "chalan", label: "Bank Chalan", Icon: Receipt },
  { value: "online", label: "Online", Icon: CreditCard },
];

export function SettleSeatFineModal({ booking, onClose, onSettled }: SettleSeatFineModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [chalanNumber, setChalanNumber] = useState("");
  const [waiveReason, setWaiveReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const seatLabel = booking.seat?.seatNumber ?? "Seat";
  const zoneLabel = booking.seat?.zone?.name ?? "Library Hall";

  const handlePay = async () => {
    if (paymentMethod === "chalan" && !chalanNumber.trim()) {
      setError("A bank chalan number is required for chalan payments.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await bookingService.payFine(booking.id, {
        paymentMethod,
        chalanNumber: chalanNumber.trim() || undefined,
      });
      onSettled();
      onClose();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setError(apiErr?.message ?? "Failed to settle the seat fine.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWaive = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await bookingService.waiveFine(booking.id, {
        reason: waiveReason.trim() || undefined,
      });
      onSettled();
      onClose();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setError(apiErr?.message ?? "Failed to waive the seat fine.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Settle Seat Fine</h2>
            <p className="text-xs font-medium text-slate-500">
              {booking.user?.name ?? "Student"} · {seatLabel} · {zoneLabel}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="rounded-xl border border-rose-100 bg-rose-50/70 p-4 text-center">
            <p className="kicker-label text-rose-700">Outstanding</p>
            <p className="mt-1 text-3xl font-black text-rose-700">{booking.fineAmount} BDT</p>
            {booking.cancelReason && (
              <p className="mt-2 text-[11px] font-medium leading-relaxed text-rose-900/70">
                {booking.cancelReason}
              </p>
            )}
          </div>

          <div>
            <label className="kicker-label mb-2 block">Payment Method</label>
            <div className="grid grid-cols-3 gap-2">
              {METHODS.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPaymentMethod(value)}
                  className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-[11px] font-bold transition-colors ${
                    paymentMethod === value
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {paymentMethod === "chalan" && (
            <div>
              <label className="kicker-label mb-2 block">Chalan Number</label>
              <input
                value={chalanNumber}
                onChange={(e) => setChalanNumber(e.target.value)}
                placeholder="e.g. CH-2026-00184"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 font-mono text-sm font-bold text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              />
            </div>
          )}

          <div>
            <label className="kicker-label mb-2 block">Waiver Reason (optional)</label>
            <input
              value={waiveReason}
              onChange={(e) => setWaiveReason(e.target.value)}
              placeholder="Documented emergency, staff error…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-medium text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
            <span className="mt-1 block text-[11px] font-medium text-slate-400">
              Only used when waiving the fine instead of collecting it.
            </span>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleWaive}
              disabled={isSubmitting}
              className="pulse-button-secondary flex-1 py-2.5 text-xs disabled:opacity-50"
            >
              Waive Fine
            </button>
            <button
              onClick={handlePay}
              disabled={isSubmitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white transition-colors hover:bg-emerald-500 disabled:opacity-60"
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Receipt className="h-3.5 w-3.5" />
              )}
              Collect {booking.fineAmount} BDT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettleSeatFineModal;
