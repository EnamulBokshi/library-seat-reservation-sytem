"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { userService } from "@/services/user-service";
import { ApiError, FineEntry, FineStatus, MyFinesResult } from "@/lib/types";
import {
  AlertCircle,
  Ban,
  Building,
  CheckCircle2,
  Loader2,
  Receipt,
  RefreshCw,
  ShieldCheck,
  Armchair,
  BookOpen,
} from "lucide-react";

type FineTab = "seat" | "loan";

const STATUS_STYLE: Record<FineStatus, { label: string; className: string }> = {
  unpaid: { label: "Unpaid", className: "bg-rose-50 border-rose-200 text-rose-700" },
  paid: { label: "Paid", className: "bg-emerald-50 border-emerald-200 text-emerald-700" },
  waived: { label: "Waived", className: "bg-slate-100 border-slate-200 text-slate-600" },
  none: { label: "—", className: "bg-slate-100 border-slate-200 text-slate-600" },
};

const formatDate = (value: string | null): string => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

function FineRow({ entry }: { entry: FineEntry }) {
  const status = STATUS_STYLE[entry.status];

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-extrabold text-slate-900">{entry.subject}</p>
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-black ${status.className}`}
          >
            {status.label}
          </span>
        </div>
        {entry.reason && <p className="mt-1 text-xs text-slate-500">{entry.reason}</p>}
        <p className="mt-1 text-[11px] text-slate-400">
          Charged {formatDate(entry.incurredAt)}
          {entry.status === "paid" && ` · Settled ${formatDate(entry.paidAt)}`}
          {entry.paymentMethod && ` · ${entry.paymentMethod}`}
          {entry.chalanNumber && ` · Chalan ${entry.chalanNumber}`}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p
          className={`text-lg font-black ${
            entry.status === "unpaid" ? "text-rose-600" : "text-slate-400 line-through"
          }`}
        >
          {entry.amount} BDT
        </p>
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-10 text-center">
      <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-500" />
      <p className="text-sm font-bold text-slate-700">No {label} on your record</p>
      <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
        Keep returning books on time and honouring your seat reservations to stay clear.
      </p>
    </div>
  );
}

export function FinesView() {
  const [data, setData] = useState<MyFinesResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FineTab>("seat");

  const fetchFines = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await userService.getMyFines();
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err: unknown) {
      setError((err as ApiError)?.message || "Could not load your fine statement.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFines();
  }, [fetchFines]);

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
          <button onClick={fetchFines} className="mt-2 text-xs font-bold text-rose-700 underline">
            Try again
          </button>
        </div>
      </div>
    );
  }

  const summary = data?.summary;
  const entries = activeTab === "seat" ? data?.seatFines ?? [] : data?.loanFines ?? [];
  const tabUnpaid = activeTab === "seat" ? summary?.seatUnpaidTotal ?? 0 : summary?.loanUnpaidTotal ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={fetchFines} className="pulse-button-secondary shrink-0">
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* ── Outstanding summary ── */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="kicker-label">SEAT FINES DUE</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{summary?.seatUnpaidTotal ?? 0} BDT</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="kicker-label">BOOK FINES DUE</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{summary?.loanUnpaidTotal ?? 0} BDT</p>
        </div>
        <div
          className={`rounded-2xl border p-4 shadow-sm ${
            summary?.isBookingBlocked ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-white"
          }`}
        >
          <p className="kicker-label">TOTAL OUTSTANDING</p>
          <p
            className={`mt-1 text-2xl font-black ${
              summary?.isBookingBlocked ? "text-rose-700" : "text-slate-900"
            }`}
          >
            {summary?.totalUnpaid ?? 0} BDT
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Limit {summary?.maxUnpaidFineLimit ?? 0} BDT
          </p>
        </div>
      </div>

      {summary?.isBookingBlocked ? (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <Ban className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
          <div>
            <p className="text-sm font-extrabold text-rose-800">Seat reservation is locked</p>
            <p className="mt-1 text-xs text-rose-700">
              Your unpaid dues of {summary.totalUnpaid} BDT have reached the {summary.maxUnpaidFineLimit} BDT
              limit. Settle them at the circulation desk to restore booking privileges.
            </p>
          </div>
        </div>
      ) : (
        (summary?.totalUnpaid ?? 0) > 0 && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-extrabold text-amber-900">
                {summary?.remainingBalance} BDT of headroom left
              </p>
              <p className="mt-1 text-xs text-amber-800">
                Seat booking locks once unpaid dues reach {summary?.maxUnpaidFineLimit} BDT.
              </p>
            </div>
          </div>
        )
      )}

      {/* ── Pay at the desk ── */}
      <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <Building className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
        <div>
          <p className="text-sm font-extrabold text-slate-900">Settle at the circulation desk</p>
          <p className="mt-1 text-xs text-slate-600">
            Fines are cleared by library staff against cash or a bank chalan. Bring your student ID; the
            record updates the moment payment is entered, and a receipt is emailed to you.
          </p>
          <Link href="/dashboard/loans" className="mt-2 inline-block text-xs font-bold text-indigo-700 underline">
            Bank chalan details
          </Link>
        </div>
      </div>

      {/* ── Ledger tabs ── */}
      <div>
        <div className="mb-4 flex gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
          {(
            [
              { key: "seat", label: "Seat fines", Icon: Armchair, count: data?.seatFines.length ?? 0 },
              { key: "loan", label: "Book fines", Icon: BookOpen, count: data?.loanFines.length ?? 0 },
            ] as const
          ).map(({ key, label, Icon, count }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-colors sm:text-sm ${
                activeTab === key
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
              <span className="rounded-full bg-white/20 px-1.5 text-[10px] font-black">
                {count}
              </span>
            </button>
          ))}
        </div>

        {entries.length === 0 ? (
          <EmptyState label={activeTab === "seat" ? "seat reservation fines" : "book loan fines"} />
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <Receipt className="h-4 w-4" />
              {entries.length} record(s) · {tabUnpaid} BDT unpaid
            </div>
            {entries.map((entry) => (
              <FineRow key={`${entry.source}-${entry.id}`} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default FinesView;
