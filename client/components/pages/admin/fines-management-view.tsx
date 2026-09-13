"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { fineService } from "@/services/fine-service";
import {
  AdminFineRecord,
  FineQueryParams,
  FineSource,
  FineStats,
  FineStatus,
  PaymentMethod,
  ApiError,
} from "@/lib/types";
import {
  AlertCircle,
  AlertTriangle,
  Armchair,
  ArrowDownUp,
  ArrowUpDown,
  Banknote,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CreditCard,
  Eye,
  FileSpreadsheet,
  Filter,
  Info,
  Loader2,
  Receipt,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  User,
  Users,
  Wallet,
  X,
} from "lucide-react";

// ─── Constants & Helpers ──────────────────────────────────────────────────────

const SOURCE_TABS: { value: FineSource; label: string; icon: React.ElementType }[] = [
  { value: "all", label: "All Fines", icon: FileSpreadsheet },
  { value: "seat", label: "Seat Bookings", icon: Armchair },
  { value: "loan", label: "Book Loans", icon: BookOpen },
];

const STATUS_OPTIONS: { value: FineStatus | "all"; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "unpaid", label: "Unpaid" },
  { value: "paid", label: "Paid / Settled" },
  { value: "waived", label: "Waived" },
];

const METHOD_OPTIONS: { value: PaymentMethod | "all"; label: string }[] = [
  { value: "all", label: "All Payment Methods" },
  { value: "cash", label: "Cash" },
  { value: "chalan", label: "Bank Chalan" },
  { value: "online", label: "Online Gateway" },
];

const SORT_OPTIONS: {
  value: "incurredAt" | "amount" | "paidAt" | "status" | "studentName";
  label: string;
}[] = [
  { value: "incurredAt", label: "Date Incurred" },
  { value: "amount", label: "Fine Amount" },
  { value: "paidAt", label: "Date Settled" },
  { value: "status", label: "Fine Status" },
  { value: "studentName", label: "Student Name" },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const WAIVER_PRESETS = [
  "Documented medical emergency / hospitalisation",
  "Approved academic / faculty conflict exception",
  "System telemetry / QR scanner equipment fault",
  "Circulation desk manual validation correction",
  "First-time student grace period waiver",
];

const formatDate = (value: string | null | undefined): string => {
  if (!value) return "—";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return "—";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ─── Status Badge Component ───────────────────────────────────────────────────

function StatusBadge({ status }: { status: FineStatus }) {
  switch (status) {
    case "unpaid":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-black text-rose-700 shadow-2xs">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
          Unpaid
        </span>
      );
    case "paid":
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-black text-emerald-800 shadow-2xs">
          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
          Paid
        </span>
      );
    case "waived":
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
          <ShieldCheck className="h-3 w-3 text-slate-500" />
          Waived
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-slate-500">
          —
        </span>
      );
  }
}

// ─── Source Badge Component ───────────────────────────────────────────────────

function SourceBadge({ source }: { source: "seat" | "loan" }) {
  if (source === "seat") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200/80 bg-indigo-50/70 px-2 py-0.5 text-[10px] font-black text-indigo-700 uppercase tracking-wider">
        <Armchair className="h-3 w-3 text-indigo-600" />
        Seat Booking
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/80 bg-amber-50/70 px-2 py-0.5 text-[10px] font-black text-amber-800 uppercase tracking-wider">
      <BookOpen className="h-3 w-3 text-amber-700" />
      Book Loan
    </span>
  );
}

// ─── Payment Method Badge ─────────────────────────────────────────────────────

function MethodBadge({
  method,
  chalan,
}: {
  method: PaymentMethod | null;
  chalan?: string | null;
}) {
  if (!method) return <span className="text-slate-400 text-xs">—</span>;

  let Icon = Banknote;
  let label = "Cash";

  if (method === "chalan") {
    Icon = Receipt;
    label = chalan ? `Chalan #${chalan}` : "Chalan";
  } else if (method === "online") {
    Icon = CreditCard;
    label = "Online";
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700">
      <Icon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
      <span className="truncate max-w-[130px]">{label}</span>
    </span>
  );
}

// ─── Settle Fine Modal ────────────────────────────────────────────────────────

interface SettleModalProps {
  fine: AdminFineRecord;
  onClose: () => void;
  onSuccess: () => void;
}

function SettleFineModal({ fine, onClose, onSuccess }: SettleModalProps) {
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [chalanNumber, setChalanNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (method === "chalan" && !chalanNumber.trim()) {
      setError("Bank chalan number is required for bank deposit settlements.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await fineService.payFine(fine.source, fine.id, {
        paymentMethod: method,
        chalanNumber: chalanNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setError(apiErr?.message || "Failed to settle fine. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-100 p-5 bg-slate-50/50">
          <div>
            <span className="kicker-label">Circulation Desk Settlement</span>
            <h2 className="text-base font-black text-slate-900 mt-0.5">Settle Student Fine</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Fine Summary Box */}
          <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-900 uppercase tracking-wider">
                Outstanding Balance
              </span>
              <span className="text-2xl font-black text-rose-700">{fine.amount} BDT</span>
            </div>
            <div className="border-t border-rose-100/80 pt-2 space-y-1 text-xs text-rose-950/80 font-medium">
              <p>
                <strong className="font-bold">Student:</strong> {fine.student.name} (
                {fine.student.studentId || fine.student.email})
              </p>
              <p className="truncate">
                <strong className="font-bold">Item:</strong> {fine.subject}
              </p>
              {fine.reason && (
                <p className="text-[11px] text-rose-800 italic">
                  <strong>Reason:</strong> {fine.reason}
                </p>
              )}
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Payment Collection Method</label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { value: "cash", label: "Cash", icon: Banknote },
                  { value: "chalan", label: "Bank Chalan", icon: Receipt },
                  { value: "online", label: "Online Gateway", icon: CreditCard },
                ] as const
              ).map((m) => {
                const Icon = m.icon;
                const isSelected = method === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMethod(m.value)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? "border-slate-900 bg-slate-900 text-white shadow-xs"
                        : "border-slate-200 bg-slate-50/70 text-slate-700 hover:border-slate-300 hover:bg-white"
                    }`}
                  >
                    <Icon className="h-4 w-4 mb-1" />
                    <span className="text-xs font-black">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chalan Number if applicable */}
          {method === "chalan" && (
            <div className="space-y-1.5 animate-in fade-in duration-150">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Bank Deposit Chalan #</span>
                <span className="text-rose-500 font-extrabold">* Required</span>
              </label>
              <input
                type="text"
                value={chalanNumber}
                onChange={(e) => setChalanNumber(e.target.value)}
                placeholder="e.g. SONALI-CH-2026-98124"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 text-xs font-bold text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none"
                required
              />
            </div>
          )}

          {/* Settlement Note */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Audit Memo / Staff Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Verified at circulation desk counter 1"
              rows={2}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 text-xs font-medium text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="pulse-button-secondary py-2 px-4 text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="pulse-button-primary py-2 px-5 text-xs bg-emerald-600 hover:bg-emerald-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Clearing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Confirm Settlement</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Waive Fine Modal ─────────────────────────────────────────────────────────

interface WaiveModalProps {
  fine: AdminFineRecord;
  onClose: () => void;
  onSuccess: () => void;
}

function WaiveFineModal({ fine, onClose, onSuccess }: WaiveModalProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleWaive = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setError(null);
      await fineService.waiveFine(fine.source, fine.id, {
        reason: reason.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setError(apiErr?.message || "Failed to waive fine. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 p-5 bg-slate-50/50">
          <div>
            <span className="kicker-label text-slate-500">Official Waiver</span>
            <h2 className="text-base font-black text-slate-900 mt-0.5">Waive Fine Penalty</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleWaive} className="p-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 space-y-1.5 text-xs text-amber-900">
            <div className="flex items-center gap-1.5 font-bold">
              <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
              <span>Irreversible Audit Action</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-800">
              Waiving removes the <strong>{fine.amount} BDT</strong> charge for{" "}
              <strong>{fine.student.name}</strong>. This event will be logged in the permanent audit trail.
            </p>
          </div>

          {/* Quick Preset Chips */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-700">Quick Justification Presets:</span>
            <div className="flex flex-wrap gap-1.5">
              {WAIVER_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setReason(preset)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition-colors cursor-pointer text-left"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Reason Textarea */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Official Waiver Justification</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="State reason for policy exception or staff correction..."
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 text-xs font-medium text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="pulse-button-secondary py-2 px-4 text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="pulse-button-primary py-2 px-5 text-xs bg-slate-800 hover:bg-slate-900"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Waiving...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Authorize Waiver</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Fine Detail Audit Modal ──────────────────────────────────────────────────

function FineDetailModal({ fine, onClose }: { fine: AdminFineRecord; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 p-5 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <SourceBadge source={fine.source} />
              <StatusBadge status={fine.status} />
            </div>
            <h2 className="text-base font-black text-slate-900 mt-1.5">Fine Audit Ledger Record</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Amount Card */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div>
              <p className="kicker-label">Assessed Penalty</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">{fine.amount} BDT</p>
            </div>
            <div className="text-right text-xs text-slate-500 space-y-0.5">
              <p>Incurred: {formatDate(fine.incurredAt)}</p>
              {fine.paidAt && <p>Settled: {formatDate(fine.paidAt)}</p>}
            </div>
          </div>

          {/* Student Profile Section */}
          <div className="space-y-2 rounded-xl border border-slate-100 p-3.5 bg-white">
            <p className="kicker-label">Student Account</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400 font-medium">Name:</span>
                <p className="font-bold text-slate-900">{fine.student.name}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Student ID:</span>
                <p className="font-bold text-slate-900">{fine.student.studentId || "—"}</p>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 font-medium">Email:</span>
                <p className="font-bold text-slate-900 truncate">{fine.student.email}</p>
              </div>
            </div>
          </div>

          {/* Resource Details */}
          <div className="space-y-2 rounded-xl border border-slate-100 p-3.5 bg-white">
            <p className="kicker-label">Assessed Resource & Item</p>
            <p className="text-sm font-bold text-slate-900">{fine.subject}</p>
            {fine.reason && (
              <p className="text-xs text-slate-600 bg-slate-50 rounded-lg p-2 font-medium">
                {fine.reason}
              </p>
            )}

            {fine.source === "seat" && fine.details.bookingId && (
              <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                <div>
                  <span className="text-slate-400 font-medium">Zone:</span>
                  <p className="font-semibold text-slate-700">{fine.details.zoneName || "—"}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Seat:</span>
                  <p className="font-semibold text-slate-700">{fine.details.seatNumber || "—"}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Session Slot:</span>
                  <p className="font-semibold text-slate-700 capitalize">{fine.details.slot || "—"}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Status:</span>
                  <p className="font-semibold text-slate-700 capitalize">
                    {fine.details.bookingStatus || "—"}
                  </p>
                </div>
              </div>
            )}

            {fine.source === "loan" && fine.details.loanId && (
              <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                <div>
                  <span className="text-slate-400 font-medium">Book Title:</span>
                  <p className="font-semibold text-slate-700 truncate">{fine.details.bookTitle || "—"}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Author:</span>
                  <p className="font-semibold text-slate-700 truncate">{fine.details.bookAuthor || "—"}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Barcode:</span>
                  <p className="font-semibold text-slate-700 font-mono">{fine.details.barcode || "—"}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Due Date:</span>
                  <p className="font-semibold text-slate-700">{formatDate(fine.details.dueDate)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Payment / Clearance Details */}
          <div className="space-y-2 rounded-xl border border-slate-100 p-3.5 bg-white text-xs">
            <p className="kicker-label">Settlement Audit</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-400 font-medium">Payment Method:</span>
                <p className="font-bold text-slate-900 capitalize">{fine.paymentMethod || "—"}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Chalan #:</span>
                <p className="font-bold text-slate-900 font-mono">{fine.chalanNumber || "—"}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Processed At:</span>
                <p className="font-semibold text-slate-700">{formatDateTime(fine.paidAt)}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Librarian Staff ID:</span>
                <p className="font-semibold text-slate-700 font-mono">{fine.receivedBy || "System / —"}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end p-4 border-t border-slate-100 bg-slate-50/50">
          <button onClick={onClose} className="pulse-button-secondary py-2 px-5 text-xs">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Admin Fines Management View ─────────────────────────────────────────

export function AdminFinesManagementView() {
  const [stats, setStats] = useState<FineStats | null>(null);
  const [fines, setFines] = useState<AdminFineRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [sourceFilter, setSourceFilter] = useState<FineSource>("all");
  const [statusFilter, setStatusFilter] = useState<FineStatus | "all">("all");
  const [methodFilter, setMethodFilter] = useState<PaymentMethod | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState<"incurredAt" | "amount" | "paidAt" | "status" | "studentName">(
    "incurredAt"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Modal Targets
  const [settleTarget, setSettleTarget] = useState<AdminFineRecord | null>(null);
  const [waiveTarget, setWaiveTarget] = useState<AdminFineRecord | null>(null);
  const [detailTarget, setDetailTarget] = useState<AdminFineRecord | null>(null);

  // Debounce search query input (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch Summary Stats
  const fetchStats = useCallback(async () => {
    try {
      setIsStatsLoading(true);
      const res = await fineService.getStats();
      if (res.success && res.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.error("Failed to load fine telemetry statistics:", err);
    } finally {
      setIsStatsLoading(false);
    }
  }, []);

  // Fetch Ledger Fines Table
  const fetchFines = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params: FineQueryParams = {
        source: sourceFilter,
        status: statusFilter !== "all" ? statusFilter : undefined,
        paymentMethod: methodFilter !== "all" ? methodFilter : undefined,
        searchTerm: debouncedSearch || undefined,
        page,
        limit,
        sortBy,
        sortOrder,
      };

      const res = await fineService.getAll(params);
      if (res.success) {
        setFines(res.data || []);
        if (res.meta) {
          setTotalCount(res.meta.total || 0);
          setTotalPages(res.meta.totalPages || 1);
        }
      }
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setError(apiErr?.message || "Failed to load fine records from server.");
    } finally {
      setIsLoading(false);
    }
  }, [sourceFilter, statusFilter, methodFilter, debouncedSearch, page, limit, sortBy, sortOrder]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchFines();
  }, [fetchFines]);

  const handleRefreshAll = () => {
    fetchStats();
    fetchFines();
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setDebouncedSearch("");
    setSourceFilter("all");
    setStatusFilter("all");
    setMethodFilter("all");
    setSortBy("incurredAt");
    setSortOrder("desc");
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    debouncedSearch ||
      sourceFilter !== "all" ||
      statusFilter !== "all" ||
      methodFilter !== "all" ||
      sortBy !== "incurredAt" ||
      sortOrder !== "desc"
  );

  const startItem = totalCount === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(totalCount, page * limit);

  return (
    <div className="space-y-6 pb-12">
      {/* ── Metric KPI Cards Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Outstanding Dues */}
        <div className="pulse-card p-5 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-500">
              Outstanding Dues
            </span>
            <span className="rounded-xl bg-rose-50 p-2 text-rose-600 border border-rose-100">
              <AlertTriangle className="h-4 w-4" />
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-rose-700 tracking-tight">
              {isStatsLoading ? "—" : `${stats?.totalOutstanding.toLocaleString() ?? 0} BDT`}
            </div>
            <p className="mt-1 text-xs text-slate-500 font-medium flex items-center gap-1.5 flex-wrap">
              <span>{stats?.outstandingCount ?? 0} record(s)</span>
              <span>·</span>
              <span className="text-indigo-600 font-bold">{stats?.seatUnpaid ?? 0} BDT seat</span>
              <span>·</span>
              <span className="text-amber-700 font-bold">{stats?.loanUnpaid ?? 0} BDT loan</span>
            </p>
          </div>
        </div>

        {/* Card 2: Revenue Collected */}
        <div className="pulse-card p-5 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600">
              Collected Revenue
            </span>
            <span className="rounded-xl bg-emerald-50 p-2 text-emerald-600 border border-emerald-100">
              <TrendingUp className="h-4 w-4" />
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-800 tracking-tight">
              {isStatsLoading ? "—" : `${stats?.totalCollected.toLocaleString() ?? 0} BDT`}
            </div>
            <p className="mt-1 text-xs text-slate-500 font-medium flex items-center gap-1.5 flex-wrap">
              <span>{stats?.collectedCount ?? 0} settled</span>
              <span>·</span>
              <span>Cash: {stats?.cashCollected ?? 0}</span>
              <span>·</span>
              <span>Chalan: {stats?.chalanCollected ?? 0}</span>
            </p>
          </div>
        </div>

        {/* Card 3: Waived Fines */}
        <div className="pulse-card p-5 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              Waived Penalties
            </span>
            <span className="rounded-xl bg-slate-100 p-2 text-slate-600 border border-slate-200">
              <ShieldCheck className="h-4 w-4" />
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-700 tracking-tight">
              {isStatsLoading ? "—" : `${stats?.totalWaived.toLocaleString() ?? 0} BDT`}
            </div>
            <p className="mt-1 text-xs text-slate-500 font-medium">
              {stats?.waivedCount ?? 0} approved administrative waiver(s)
            </p>
          </div>
        </div>

        {/* Card 4: Impacted / Blocked Students */}
        <div className="pulse-card p-5 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700">
              Impacted Students
            </span>
            <span className="rounded-xl bg-amber-50 p-2 text-amber-600 border border-amber-100">
              <Users className="h-4 w-4" />
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {isStatsLoading ? "—" : `${stats?.impactedStudentsCount ?? 0} student(s)`}
            </div>
            <div className="mt-1 text-xs font-semibold flex items-center gap-1.5">
              {(stats?.blockedStudentsCount ?? 0) > 0 ? (
                <span className="text-rose-600 font-black">
                  {stats?.blockedStudentsCount} locked from booking ({`>= ${stats?.maxUnpaidFineLimit} BDT`})
                </span>
              ) : (
                <span className="text-emerald-700">All within headroom limit</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="flex items-center justify-between gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-700">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchFines}
            className="flex items-center gap-1.5 font-bold text-rose-700 hover:text-rose-900 underline shrink-0 cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* ── Multi-Faceted Filters Toolbar ── */}
      <div className="pulse-card p-4 space-y-3">
        {/* Source Pills Tab Selector */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 flex-wrap">
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-100/80 p-1">
            {SOURCE_TABS.map((tab) => {
              const Icon = tab.icon;
              const isSelected = sourceFilter === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => {
                    setSourceFilter(tab.value);
                    setPage(1);
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    isSelected
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={handleRefreshAll}
            disabled={isLoading || isStatsLoading}
            className="pulse-button-secondary py-1.5 px-3 text-xs shrink-0"
            title="Reload live fine metrics"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh Data</span>
          </button>
        </div>

        {/* Search & Filter Dropdowns Row */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student, email, ID, book, seat, chalan..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-10 pr-8 text-xs font-bold text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as FineStatus | "all");
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus:border-slate-900 focus:outline-none shadow-2xs cursor-pointer"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          {/* Payment Method Dropdown */}
          <select
            value={methodFilter}
            onChange={(e) => {
              setMethodFilter(e.target.value as PaymentMethod | "all");
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus:border-slate-900 focus:outline-none shadow-2xs cursor-pointer"
          >
            {METHOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          {/* Sort By Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as any);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus:border-slate-900 focus:outline-none shadow-2xs cursor-pointer"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                Sort: {o.label}
              </option>
            ))}
          </select>

          {/* Sort Direction Toggle */}
          <button
            onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
            className="pulse-button-secondary py-2 px-3 text-xs shrink-0"
            title={`Sort ${sortOrder === "asc" ? "Ascending" : "Descending"} (Click to switch)`}
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            <span className="hidden sm:inline font-bold uppercase text-[11px]">{sortOrder}</span>
          </button>
        </div>

        {/* Filter Summary Strip */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-1 text-xs border-t border-slate-100">
            <span className="text-slate-500 font-medium">
              Filtered results: <strong>{totalCount}</strong> fine(s) matching criteria
            </span>
            <button
              onClick={handleClearFilters}
              className="text-xs font-bold text-rose-600 hover:text-rose-800 underline cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>

      {/* ── Ledger Table ── */}
      <div className="pulse-card overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Retrieving Fine Ledger Records...
            </p>
          </div>
        ) : fines.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <Receipt className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-extrabold text-slate-800">No Fine Records Found</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm">
              {hasActiveFilters
                ? "No fines match the current filters. Try changing or clearing search terms."
                : "The fine ledger is currently clean. Outstanding fines will appear here as they are assessed."}
            </p>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="mt-4 pulse-button-secondary py-1.5 px-4 text-xs font-bold"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Ledger Type</th>
                  <th className="py-3 px-4">Resource & Subject</th>
                  <th className="py-3 px-4">Assessed Fine</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Settlement Info</th>
                  <th className="py-3 px-4">Date Incurred</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {fines.map((record) => {
                  const isUnpaid = record.status === "unpaid";
                  return (
                    <tr
                      key={`${record.source}-${record.id}`}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Student Profile */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-slate-700 shrink-0 text-xs">
                            {record.student.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-extrabold text-slate-900 truncate">{record.student.name}</p>
                            <p className="text-[11px] text-slate-400 truncate">
                              {record.student.studentId || record.student.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Source */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <SourceBadge source={record.source} />
                      </td>

                      {/* Subject & Reason */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="font-bold text-slate-900 truncate">{record.subject}</p>
                        {record.reason && (
                          <p className="text-[11px] text-slate-500 truncate" title={record.reason}>
                            {record.reason}
                          </p>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`text-sm font-black ${
                            record.status === "unpaid"
                              ? "text-rose-600"
                              : record.status === "paid"
                              ? "text-emerald-700"
                              : "text-slate-400 line-through"
                          }`}
                        >
                          {record.amount} BDT
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge status={record.status} />
                      </td>

                      {/* Settlement info */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <MethodBadge method={record.paymentMethod} chalan={record.chalanNumber} />
                        {record.paidAt && (
                          <p className="text-[10px] text-slate-400 font-medium">
                            {formatDate(record.paidAt)}
                          </p>
                        )}
                      </td>

                      {/* Incurred Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-[11px] text-slate-500">
                        {formatDate(record.incurredAt)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isUnpaid ? (
                            <>
                              <button
                                onClick={() => setSettleTarget(record)}
                                className="pulse-button-primary py-1 px-3 text-[11px] bg-emerald-600 hover:bg-emerald-700 min-h-[30px]"
                                title="Settle fine payment"
                              >
                                <Wallet className="h-3 w-3" />
                                <span>Settle</span>
                              </button>
                              <button
                                onClick={() => setWaiveTarget(record)}
                                className="pulse-button-secondary py-1 px-2.5 text-[11px] min-h-[30px]"
                                title="Waive penalty"
                              >
                                <ShieldCheck className="h-3 w-3 text-slate-500" />
                                <span>Waive</span>
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setDetailTarget(record)}
                              className="pulse-button-secondary py-1 px-2.5 text-[11px] min-h-[30px]"
                              title="Inspect audit details"
                            >
                              <Eye className="h-3 w-3 text-slate-500" />
                              <span>Details</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination Footer ── */}
        {!isLoading && fines.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-600 font-semibold">
            {/* Page info & Page size */}
            <div className="flex items-center gap-3">
              <span>
                Showing <strong>{startItem}</strong> to <strong>{endItem}</strong> of{" "}
                <strong>{totalCount}</strong> fines
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Rows:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                >
                  {PAGE_SIZE_OPTIONS.map((sz) => (
                    <option key={sz} value={sz}>
                      {sz}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Page navigation buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={page <= 1}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                title="First Page"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                title="Previous Page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="px-2.5 py-1 text-xs font-black text-slate-800">
                Page {page} of {totalPages}
              </span>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                title="Next Page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page >= totalPages}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                title="Last Page"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {settleTarget && (
        <SettleFineModal
          fine={settleTarget}
          onClose={() => setSettleTarget(null)}
          onSuccess={handleRefreshAll}
        />
      )}

      {waiveTarget && (
        <WaiveFineModal
          fine={waiveTarget}
          onClose={() => setWaiveTarget(null)}
          onSuccess={handleRefreshAll}
        />
      )}

      {detailTarget && (
        <FineDetailModal fine={detailTarget} onClose={() => setDetailTarget(null)} />
      )}
    </div>
  );
}

export default AdminFinesManagementView;
