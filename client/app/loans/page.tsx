"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { AuthGuard } from "@/components/shared/auth-guard";
import { loanService } from "@/services/loan-service";
import { StudentLoanSummary, BookLoan } from "@/lib/types";
import {
  BookOpen,
  Calendar,
  Clock,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  FileText,
  ArrowRight,
  ShieldCheck,
  PlusCircle,
  History,
  DollarSign,
  Receipt,
  Building,
  AlertCircle,
  HelpCircle,
  X,
  Sparkles,
} from "lucide-react";

export default function StudentLoansPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<StudentLoanSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Renew Action State
  const [renewingLoanId, setRenewingLoanId] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"active" | "pending" | "fines" | "history">("active");

  // Chalan Info Modal
  const [isChalanModalOpen, setIsChalanModalOpen] = useState(false);

  useEffect(() => {
    fetchLoans();
  }, []);

  const fetchLoans = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await loanService.getMyLoans();
      if (res.success && res.data) {
        setSummary(res.data);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load borrowed books.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRenewLoan = async (loan: BookLoan) => {
    try {
      setRenewingLoanId(loan.id);
      setActionSuccessMsg(null);
      setActionErrorMsg(null);

      const res = await loanService.renewLoan(loan.id);
      if (res.success && res.data) {
        setActionSuccessMsg(
          `Successfully renewed "${loan.book?.title}"! New due date is ${new Date(
            res.data.dueDate
          ).toLocaleDateString()}.`
        );
        fetchLoans();
        setTimeout(() => setActionSuccessMsg(null), 5000);
      }
    } catch (err: any) {
      setActionErrorMsg(err?.message || "Failed to renew loan.");
      setTimeout(() => setActionErrorMsg(null), 5000);
    } finally {
      setRenewingLoanId(null);
    }
  };

  const calculateDaysRemaining = (dueDateStr: string) => {
    const now = new Date();
    const due = new Date(dueDateStr);
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const hasUnpaidFines = summary?.fines?.hasUnpaidDues || false;
  const totalDueBDT = summary?.fines?.totalDueBDT || 0;
  const totalPaidBDT = summary?.fines?.totalPaidBDT || 0;

  return (
    <AuthGuard allowedRoles={["student", "admin", "librarian", "super_admin"]}>
      <div className="min-h-screen bg-[#f8f9fa] text-slate-900 pb-20">
        {/* ── Top Header ── */}
        <div className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 border border-indigo-200/60 px-3 py-1 text-xs font-bold text-indigo-700 mb-3">
                  <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Student Library Portal</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  My Borrowed Books & Fines
                </h1>
                <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                  Manage your active book loans, track due dates, submit 1-click renewals, and check late fee statements.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsChalanModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-xs font-extrabold text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
                >
                  <Building className="w-4 h-4 text-indigo-600" />
                  Bank Chalan Info
                </button>

                <Link
                  href="/books"
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-xs font-extrabold text-white shadow-md shadow-indigo-200 transition-all"
                >
                  <PlusCircle className="h-4 w-4" />
                  Browse Catalog
                </Link>
              </div>
            </div>

            {/* ── Unpaid Fine Warning Banner ── */}
            {hasUnpaidFines && (
              <div className="mt-6 p-4 sm:p-5 rounded-2xl bg-rose-50 border border-rose-200 shadow-sm text-rose-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-extrabold text-sm text-rose-900">
                      Borrowing Suspended: Outstanding Fine of {totalDueBDT} BDT
                    </h3>
                    <p className="text-xs text-rose-700 mt-0.5">
                      You have unpaid overdue charges. Please pay via Cash at the library desk or deposit via Bank Chalan to restore book borrowing privileges.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setActiveTab("fines")}
                    className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all"
                  >
                    View Fine Breakdown
                  </button>
                  <button
                    onClick={() => setIsChalanModalOpen(true)}
                    className="px-3 py-2 bg-white text-rose-700 border border-rose-300 hover:bg-rose-100 rounded-xl text-xs font-bold transition-all"
                  >
                    Chalan Guidelines
                  </button>
                </div>
              </div>
            )}

            {/* ── Stat KPI Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Currently Borrowed</span>
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                    <BookOpen className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 mt-2">
                  {summary?.quota.currentlyBorrowed ?? 0}{" "}
                  <span className="text-xs text-slate-400 font-bold">/ {summary?.quota.maxBorrowLimit ?? 3} Books</span>
                </div>
                <div className="text-xs font-semibold text-indigo-600 mt-1">
                  {summary?.quota.availableQuota ?? 3} slots available
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pending Requests</span>
                  <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 mt-2">
                  {summary?.pendingRequests.length ?? 0}
                </div>
                <div className="text-xs font-semibold text-amber-600 mt-1">
                  Awaiting desk approval
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Overdue Dues</span>
                  <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-rose-600 mt-2">
                  {totalDueBDT} <span className="text-sm font-bold text-rose-700">BDT</span>
                </div>
                <div className="text-xs font-semibold text-rose-600 mt-1">
                  {hasUnpaidFines ? "Suspended (Clear dues)" : "Account in good standing"}
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Cleared Fines</span>
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    <Receipt className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-emerald-600 mt-2">
                  {totalPaidBDT} <span className="text-sm font-bold text-emerald-700">BDT</span>
                </div>
                <div className="text-xs font-semibold text-emerald-600 mt-1">
                  {summary?.fines?.paidFines.length ?? 0} transaction(s) verified
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Main Content Container ── */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-6">
          {actionSuccessMsg && (
            <div className="mb-6 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-bold text-emerald-900 shadow-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              {actionSuccessMsg}
            </div>
          )}

          {actionErrorMsg && (
            <div className="mb-6 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs font-bold text-rose-900 shadow-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              {actionErrorMsg}
            </div>
          )}

          {/* ── Navigation Tabs ── */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3 mb-6">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab("active")}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                  activeTab === "active"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Active Loans ({summary?.activeLoans.length ?? 0})
              </button>

              <button
                onClick={() => setActiveTab("pending")}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                  activeTab === "pending"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <Clock className="w-4 h-4" />
                Borrow Requests ({summary?.pendingRequests.length ?? 0})
              </button>

              <button
                onClick={() => setActiveTab("fines")}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                  activeTab === "fines"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <Receipt className="w-4 h-4" />
                Fines & Settlements
                {hasUnpaidFines && (
                  <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[10px] font-black rounded-full">
                    {totalDueBDT} Tk
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab("history")}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                  activeTab === "history"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <History className="w-4 h-4" />
                Loan History
              </button>
            </div>

            <button
              onClick={fetchLoans}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-white rounded-xl transition-all border border-slate-200"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-indigo-600" : ""}`} />
            </button>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* ── TAB 1: ACTIVE LOANS ────────────────────────────────────────── */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === "active" && (
            <div>
              {isLoading ? (
                <div className="py-20 text-center text-slate-400 font-semibold text-sm">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                  Loading active book loans...
                </div>
              ) : summary?.activeLoans.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-sm">
                  <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">No active book loans</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    You have not checked out any physical books yet. Search the catalog and request or visit the desk with the book barcode.
                  </p>
                  <Link
                    href="/books"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl mt-6 shadow-sm"
                  >
                    Browse Library Books <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {summary?.activeLoans.map((loan) => {
                    const daysRemaining = calculateDaysRemaining(loan.dueDate);
                    const isOverdue = daysRemaining < 0;
                    const isWarning = daysRemaining <= 2 && daysRemaining >= 0;

                    return (
                      <div
                        key={loan.id}
                        className={`bg-white rounded-3xl border p-6 flex flex-col justify-between shadow-sm transition-all ${
                          isOverdue
                            ? "border-rose-300 ring-2 ring-rose-100"
                            : isWarning
                            ? "border-amber-300 ring-2 ring-amber-100"
                            : "border-slate-200/80 hover:border-slate-300"
                        }`}
                      >
                        <div>
                          {/* Status Badge */}
                          <div className="flex items-center justify-between mb-4">
                            {isOverdue ? (
                              <span className="px-3 py-1 bg-rose-100 text-rose-800 rounded-full text-xs font-black flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Overdue: {Math.abs(daysRemaining)} day(s) late
                              </span>
                            ) : isWarning ? (
                              <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-black flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                Due in {daysRemaining} day(s) (Warning)
                              </span>
                            ) : (
                              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-black flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Due in {daysRemaining} days
                              </span>
                            )}

                            <span className="text-[11px] font-bold text-slate-400">
                              Renewed: {loan.renewCount}/3
                            </span>
                          </div>

                          {/* Book Details */}
                          <div className="flex gap-4">
                            <div className="w-16 h-22 bg-slate-100 rounded-xl overflow-hidden shrink-0 border border-slate-200">
                              {loan.book?.coverImage ? (
                                <img src={loan.book.coverImage} alt={loan.book.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                  <BookOpen className="w-6 h-6" />
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <Link href={`/books/${loan.bookId}`} className="font-extrabold text-slate-900 text-sm hover:text-indigo-600 line-clamp-2 leading-snug">
                                {loan.book?.title}
                              </Link>
                              <p className="text-xs text-slate-500 mt-1">By {loan.book?.author}</p>
                              <div className="text-[11px] text-slate-400 mt-1 font-mono">
                                {loan.book?.barcode ? `Barcode: ${loan.book.barcode}` : `ISBN: ${loan.book?.isbn || "N/A"}`}
                              </div>
                            </div>
                          </div>

                          {/* Shelf & Return Location */}
                          <div className="mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-indigo-600 shrink-0" />
                            <span className="truncate">
                              Return to: <strong>{loan.book?.block}</strong> • {loan.book?.shelfNumber}
                            </span>
                          </div>

                          {/* Overdue Fine Tag if Overdue */}
                          {isOverdue && loan.fineAmount > 0 && (
                            <div className="mt-3 p-3 bg-rose-50 rounded-2xl border border-rose-200 text-xs text-rose-800 font-bold flex items-center justify-between">
                              <span>Accumulated Late Fine:</span>
                              <span className="text-sm font-black text-rose-900">{loan.fineAmount} BDT</span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                          <div className="text-[11px] text-slate-400">
                            Due: {new Date(loan.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </div>

                          {!isOverdue && loan.renewCount < 3 ? (
                            <button
                              onClick={() => handleRenewLoan(loan)}
                              disabled={renewingLoanId === loan.id}
                              className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-extrabold rounded-xl transition-all flex items-center gap-1.5"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${renewingLoanId === loan.id ? "animate-spin" : ""}`} />
                              {renewingLoanId === loan.id ? "Renewing..." : "Renew (10 Days)"}
                            </button>
                          ) : (
                            <span className="text-xs font-bold text-slate-400">
                              {isOverdue ? "Return at desk" : "Max renewals reached"}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* ── TAB 2: PENDING BORROW REQUESTS ─────────────────────────────── */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === "pending" && (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6">
              <h3 className="text-base font-extrabold text-slate-900 mb-4">Pending Desk Pickup Requests</h3>
              {summary?.pendingRequests.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs font-semibold">
                  No active borrow requests pending.
                </div>
              ) : (
                <div className="space-y-4">
                  {summary?.pendingRequests.map((loan) => (
                    <div key={loan.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900">{loan.book?.title}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">By {loan.book?.author} • {loan.book?.block}, {loan.book?.shelfNumber}</p>
                        <p className="text-[11px] text-amber-700 font-bold mt-1">
                          ⏳ Request submitted. Please visit the circulation desk to collect your physical copy.
                        </p>
                      </div>
                      <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold shrink-0">
                        Pending Pickup
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* ── TAB 3: FINES & SETTLEMENTS ─────────────────────────────────── */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === "fines" && (
            <div className="space-y-6">
              {/* Unpaid Fines Table */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-rose-600" />
                      Outstanding Overdue Fines
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Fines must be settled via Cash at the desk or Bank Chalan to restore borrowing privileges.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsChalanModalOpen(true)}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-extrabold transition-all"
                  >
                    Chalan Deposit Guide
                  </button>
                </div>

                {summary?.fines?.unpaidFines.length === 0 ? (
                  <div className="p-8 text-center bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 font-bold text-xs flex flex-col items-center gap-2">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    You have zero unpaid library fines! Account is in good standing.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase">
                          <th className="py-3 px-4">Book Title</th>
                          <th className="py-3 px-4">Due Date</th>
                          <th className="py-3 px-4">Fine Amount</th>
                          <th className="py-3 px-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold">
                        {summary?.fines?.unpaidFines.map((l) => (
                          <tr key={l.id}>
                            <td className="py-3.5 px-4 font-bold text-slate-900">{l.book?.title}</td>
                            <td className="py-3.5 px-4 text-slate-600">{new Date(l.dueDate).toLocaleDateString()}</td>
                            <td className="py-3.5 px-4 font-black text-rose-600">{l.fineAmount} BDT</td>
                            <td className="py-3.5 px-4">
                              <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 rounded-full font-bold text-[11px]">
                                Unpaid (Locked)
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Paid Fines History */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6">
                <h3 className="text-base font-extrabold text-slate-900 mb-4 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-emerald-600" />
                  Settled Fine Receipts & Chalan Records
                </h3>

                {summary?.fines?.paidFines.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs font-semibold">
                    No past fine transactions on record.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase">
                          <th className="py-3 px-4">Book Title</th>
                          <th className="py-3 px-4">Amount Paid</th>
                          <th className="py-3 px-4">Method</th>
                          <th className="py-3 px-4">Chalan / Receipt</th>
                          <th className="py-3 px-4">Paid Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold">
                        {summary?.fines?.paidFines.map((l) => (
                          <tr key={l.id}>
                            <td className="py-3.5 px-4 font-bold text-slate-900">{l.book?.title}</td>
                            <td className="py-3.5 px-4 font-black text-emerald-600">{l.fineAmount} BDT</td>
                            <td className="py-3.5 px-4 uppercase font-bold text-slate-700">{l.paymentMethod}</td>
                            <td className="py-3.5 px-4 font-mono text-slate-500">{l.chalanNumber || "Desk Cash Receipt"}</td>
                            <td className="py-3.5 px-4 text-slate-600">{l.finePaidAt ? new Date(l.finePaidAt).toLocaleDateString() : "Verified"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* ── TAB 4: LOAN HISTORY ────────────────────────────────────────── */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === "history" && (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6">
              <h3 className="text-base font-extrabold text-slate-900 mb-4">Complete Loan & Return History</h3>
              {summary?.returnedHistory.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs font-semibold">
                  No completed loans on record.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase">
                        <th className="py-3 px-4">Book Title</th>
                        <th className="py-3 px-4">Borrow Date</th>
                        <th className="py-3 px-4">Return Date</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold">
                      {summary?.returnedHistory.map((l) => (
                        <tr key={l.id}>
                          <td className="py-3.5 px-4 font-bold text-slate-900">{l.book?.title}</td>
                          <td className="py-3.5 px-4 text-slate-600">{new Date(l.borrowDate).toLocaleDateString()}</td>
                          <td className="py-3.5 px-4 text-slate-600">{l.returnDate ? new Date(l.returnDate).toLocaleDateString() : "Returned"}</td>
                          <td className="py-3.5 px-4">
                            <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-full font-bold text-[11px]">
                              Completed
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* ── BANK CHALAN INSTRUCTIONS MODAL ─────────────────────────────── */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {isChalanModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 sm:p-8 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Bank Chalan Payment Guide</h3>
                    <p className="text-xs text-slate-500">Official university fine deposit details</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsChalanModalOpen(false)}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Bank Name:</span>
                    <strong className="text-slate-900">Dhaka Bank Ltd. / Prime Bank</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Account Title:</span>
                    <strong className="text-slate-900">DIU Central Library Operations</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Account No:</span>
                    <strong className="text-slate-900 font-mono">102-150-0049281</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Fee Purpose Code:</span>
                    <strong className="text-indigo-600 font-mono">LIB-FINE-OVERDUE</strong>
                  </div>
                </div>

                <div className="space-y-2 text-slate-600">
                  <strong className="block text-slate-900">How to deposit via Bank Chalan:</strong>
                  <ol className="list-decimal pl-4 space-y-1.5 leading-relaxed">
                    <li>Visit the on-campus university bank booth or any designated branch.</li>
                    <li>Fill out the deposit chalan slip using your <strong>Student ID</strong> and name.</li>
                    <li>Deposit the calculated fine amount (5 Tk / day overdue).</li>
                    <li>Bring the stamped student copy of the chalan slip to the library circulation desk.</li>
                    <li>The librarian will enter your chalan number and instantly unlock your borrowing privileges.</li>
                  </ol>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setIsChalanModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm"
                >
                  Got It, Thanks
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
