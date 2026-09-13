"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { bookingService } from "@/services/booking-service";
import { loanService } from "@/services/loan-service";
import { userService } from "@/services/user-service";
import { ApiError, Booking, MyFinesResult, StudentLoanSummary } from "@/lib/types";
import {
  AlertCircle,
  Armchair,
  Ban,
  BookOpen,
  CalendarPlus,
  Loader2,
  Receipt,
  ArrowRight,
} from "lucide-react";

const ACTIVE_BOOKING_STATUSES = ["pending", "confirmed", "checked_in"];

interface StatCardProps {
  label: string;
  value: string;
  hint: string;
  href: string;
  Icon: React.ElementType;
  tone?: "default" | "danger";
}

function StatCard({ label, value, hint, href, Icon, tone = "default" }: StatCardProps) {
  const isDanger = tone === "danger";
  return (
    <Link
      href={href}
      className={`group flex flex-col rounded-2xl border p-5 shadow-sm transition-colors ${
        isDanger
          ? "border-rose-200 bg-rose-50 hover:border-rose-300"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <span className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
        <Icon className="h-4 w-4" />
      </span>
      <p className="kicker-label">{label}</p>
      <p className={`mt-1 text-2xl font-black ${isDanger ? "text-rose-700" : "text-slate-900"}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
      <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-slate-700 group-hover:gap-2 transition-all">
        View <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
}

export function OverviewView() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loans, setLoans] = useState<StudentLoanSummary | null>(null);
  const [fines, setFines] = useState<MyFinesResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [bookingRes, loanRes, fineRes] = await Promise.all([
        bookingService.getMyBookings(),
        loanService.getMyLoans(),
        userService.getMyFines(),
      ]);
      setBookings(bookingRes.data ?? []);
      setLoans(loanRes.data ?? null);
      setFines(fineRes.data ?? null);
    } catch (err: unknown) {
      setError((err as ApiError)?.message || "Could not load your dashboard.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
        <div>
          <p className="text-sm font-bold text-rose-800">{error}</p>
          <button onClick={fetchAll} className="mt-2 text-xs font-bold text-rose-700 underline">
            Try again
          </button>
        </div>
      </div>
    );
  }

  const activeBookings = bookings.filter((b) => ACTIVE_BOOKING_STATUSES.includes(b.status));
  const activeLoans = loans?.activeLoans?.length ?? 0;
  const overdueLoans = loans?.activeLoans?.filter((l) => l.status === "overdue").length ?? 0;
  const totalUnpaid = fines?.summary.totalUnpaid ?? 0;
  const isBookingBlocked = fines?.summary.isBookingBlocked ?? false;

  return (
    <div className="space-y-6">
      {isBookingBlocked && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <Ban className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
          <div>
            <p className="text-sm font-extrabold text-rose-800">Seat reservation is locked</p>
            <p className="mt-1 text-xs text-rose-700">
              Unpaid dues of {totalUnpaid} BDT have reached the {fines?.summary.maxUnpaidFineLimit} BDT limit.
              Settle them at the circulation desk to book seats again.
            </p>
            <Link href="/dashboard/fines" className="mt-2 inline-block text-xs font-bold text-rose-800 underline">
              See the statement
            </Link>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="ACTIVE RESERVATIONS"
          value={String(activeBookings.length)}
          hint={activeBookings.length === 0 ? "No upcoming seat passes" : "Seat passes awaiting or in use"}
          href="/dashboard/bookings"
          Icon={Armchair}
        />
        <StatCard
          label="BOOKS ON LOAN"
          value={String(activeLoans)}
          hint={
            overdueLoans > 0
              ? `${overdueLoans} overdue — return to stop the fine growing`
              : `Quota ${loans?.quota.availableQuota ?? 0} of ${loans?.quota.maxBorrowLimit ?? 0} left`
          }
          href="/dashboard/loans"
          Icon={BookOpen}
          tone={overdueLoans > 0 ? "danger" : "default"}
        />
        <StatCard
          label="OUTSTANDING DUES"
          value={`${totalUnpaid} BDT`}
          hint={
            totalUnpaid === 0
              ? "Nothing owed"
              : `${fines?.summary.seatUnpaidTotal ?? 0} seat · ${fines?.summary.loanUnpaidTotal ?? 0} books`
          }
          href="/dashboard/fines"
          Icon={Receipt}
          tone={totalUnpaid > 0 ? "danger" : "default"}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/book" className="pulse-button-primary">
          <CalendarPlus className="h-4 w-4" />
          <span>Reserve a seat</span>
        </Link>
        <Link href="/books" className="pulse-button-secondary">
          <BookOpen className="h-4 w-4" />
          <span>Browse the catalogue</span>
        </Link>
      </div>

      {loans?.quota.pendingRequests ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-extrabold text-slate-900">
            {loans.quota.pendingRequests} borrow request(s) awaiting staff approval
          </p>
          <Link href="/dashboard/loans" className="mt-1 inline-block text-xs font-bold text-indigo-700 underline">
            Check their status
          </Link>
        </div>
      ) : null}
    </div>
  );
}

export default OverviewView;
