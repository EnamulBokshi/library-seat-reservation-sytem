"use client";

import React from "react";
import Link from "next/link";
import { BookingEligibility } from "@/lib/types";
import { Lock, Wallet } from "lucide-react";

interface FineLockBannerProps {
  eligibility: BookingEligibility | null;
  className?: string;
}

/**
 * Shown when a student's unpaid library dues have reached the configured limit
 * and seat reservations are refused by the server.
 */
export function FineLockBanner({ eligibility, className = "" }: FineLockBannerProps) {
  if (!eligibility?.isBookingBlocked) return null;

  const { totalUnpaid, maxUnpaidFineLimit, seatFineTotal, loanFineTotal } = eligibility;

  return (
    <div
      className={`rounded-2xl border border-rose-200 bg-rose-50/80 p-5 ${className}`}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-rose-200 bg-white text-rose-600">
          <Lock className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-black text-rose-900">
            Seat reservations are suspended
          </h3>
          <p className="mt-1 text-xs font-medium leading-relaxed text-rose-900/80">
            Your unpaid library dues total <strong>{totalUnpaid} BDT</strong>, which has reached the{" "}
            {maxUnpaidFineLimit} BDT limit. Settle your dues at the library circulation desk
            (Cash / Bank Chalan) to restore your reservation privileges.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {seatFineTotal > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-white px-2.5 py-1 text-[11px] font-black text-rose-700">
                <Wallet className="h-3 w-3" />
                Seat fines: {seatFineTotal} BDT
              </span>
            )}
            {loanFineTotal > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-white px-2.5 py-1 text-[11px] font-black text-rose-700">
                <Wallet className="h-3 w-3" />
                Overdue book fines: {loanFineTotal} BDT
              </span>
            )}
            <Link
              href="/bookings"
              className="inline-flex items-center rounded-full border border-rose-300 bg-rose-600 px-3 py-1 text-[11px] font-black text-white transition-colors hover:bg-rose-500"
            >
              Review my dues
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FineLockBanner;
