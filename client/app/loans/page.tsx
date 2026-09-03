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
  const [activeTab, setActiveTab] = useState<"active" | "pending" | "history">("active");

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
                  <span>Circulation & Borrowing Portal</span>
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                  My Borrowed Books & Renewals
                </h1>
                <p className="mt-1 text-sm text-slate-500 max-w-2xl">
                  Manage your active 10-day physical book loans, monitor due dates, and extend borrowings up to 3 times online.
                </p>
              </div>

              {/* Quota Gauge Card */}
              {summary && (
                <div className="rounded-3xl bg-slate-900 text-white p-5 shadow-sm min-w-[260px]">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-2">
                    <span>Borrow Limit Quota</span>
                    <span className="text-white font-extrabold font-mono">
                      {summary.quota.currentlyBorrowed} / {summary.quota.maxBorrowLimit} Books
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden mb-3">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        summary.quota.currentlyBorrowed >= summary.quota.maxBorrowLimit
                          ? "bg-amber-400"
                          : "bg-emerald-400"
                      }`}
                      style={{
                        width: `${(summary.quota.currentlyBorrowed / summary.quota.maxBorrowLimit) * 100}%`,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
                    <span>{summary.quota.availableQuota} Available Slots</span>
                    <Link
                      href="/books"
                      className="text-indigo-300 hover:text-white font-bold inline-flex items-center gap-1"
                    >
                      <span>Browse Catalog</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Notification Banners */}
            {actionSuccessMsg && (
              <div className="mt-6 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{actionSuccessMsg}</span>
              </div>
            )}

            {actionErrorMsg && (
              <div className="mt-6 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs font-bold text-rose-800 flex items-center gap-2 animate-in fade-in">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{actionErrorMsg}</span>
              </div>
            )}

            {/* ── Tabs Navigation ── */}
            <div className="mt-8 flex items-center gap-2 border-b border-slate-200/80">
              <button
                onClick={() => setActiveTab("active")}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-extrabold transition-all ${
                  activeTab === "active"
                    ? "border-slate-900 text-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                <BookOpen className="h-4 w-4" />
                <span>Active Loans ({summary?.activeLoans.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveTab("pending")}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-extrabold transition-all ${
                  activeTab === "pending"
                    ? "border-slate-900 text-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                <Clock className="h-4 w-4" />
                <span>Pending Requests ({summary?.pendingRequests.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveTab("history")}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-extrabold transition-all ${
                  activeTab === "history"
                    ? "border-slate-900 text-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                <History className="h-4 w-4" />
                <span>Loan History ({summary?.returnedHistory.length || 0})</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Content Viewport ── */}
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <RefreshCw className="h-8 w-8 text-slate-400 animate-spin mb-3" />
              <p className="text-sm font-bold text-slate-500">Loading your loan records...</p>
            </div>
          ) : error ? (
            <div className="rounded-3xl bg-rose-50 border border-rose-200 p-8 text-center text-rose-700">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-rose-500" />
              <p className="font-bold">{error}</p>
              <button
                onClick={fetchLoans}
                className="mt-3 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700"
              >
                Retry
              </button>
            </div>
          ) : activeTab === "active" ? (
            <div>
              {!summary?.activeLoans || summary.activeLoans.length === 0 ? (
                <div className="rounded-3xl bg-white border border-slate-200/80 p-12 text-center shadow-2xs">
                  <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-base font-extrabold text-slate-900">
                    No active borrowed books right now
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    You have all 3 borrowing slots available! Explore the catalog to discover books and request loans.
                  </p>
                  <Link
                    href="/books"
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-extrabold text-white shadow-xs hover:bg-slate-800"
                  >
                    <PlusCircle className="h-4 w-4" />
                    <span>Browse Books to Borrow</span>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {summary.activeLoans.map((loan) => {
                    const daysRemaining = calculateDaysRemaining(loan.dueDate);
                    const isOverdue = daysRemaining < 0;
                    const isDueSoon = daysRemaining >= 0 && daysRemaining <= 2;
                    const canRenew = loan.renewCount < summary.quota.maxRenewalLimit && !isOverdue;
                    const isRenewing = renewingLoanId === loan.id;

                    return (
                      <div
                        key={loan.id}
                        className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
                      >
                        <div>
                          {/* Top Status & Renew Count */}
                          <div className="flex items-center justify-between mb-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-extrabold ${
                                isOverdue
                                  ? "bg-rose-100 text-rose-800"
                                  : isDueSoon
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              <Clock className="h-3 w-3" />
                              <span>
                                {isOverdue
                                  ? `Overdue (${Math.abs(daysRemaining)}d)`
                                  : daysRemaining === 0
                                  ? "Due Today"
                                  : `Due in ${daysRemaining} days`}
                              </span>
                            </span>

                            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-extrabold text-slate-600">
                              {loan.renewCount}/{summary.quota.maxRenewalLimit} Renewals
                            </span>
                          </div>

                          {/* Book Title & Author */}
                          <Link href={`/books/${loan.bookId}`}>
                            <h3 className="text-base font-extrabold text-slate-900 line-clamp-2 hover:text-indigo-600 transition-colors">
                              {loan.book?.title || "Library Book"}
                            </h3>
                          </Link>
                          <p className="text-xs text-slate-500 font-semibold mt-0.5">
                            By {loan.book?.author || "Author"}
                          </p>

                          {/* Spatial Shelf Coordinates */}
                          {loan.book && (
                            <div className="mt-3.5 rounded-2xl bg-slate-50 border border-slate-100 p-2.5 text-xs font-bold text-slate-700 flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                              <span className="truncate">
                                {loan.book.block} • {loan.book.shelfNumber} {loan.book.rowNumber ? `• ${loan.book.rowNumber}` : ""}
                              </span>
                            </div>
                          )}

                          {/* Dates Breakdown */}
                          <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                                Borrow Date
                              </div>
                              <div className="font-bold text-slate-800 mt-0.5">
                                {new Date(loan.borrowDate).toLocaleDateString()}
                              </div>
                            </div>

                            <div>
                              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                                Due Date
                              </div>
                              <div className={`font-extrabold mt-0.5 ${isOverdue ? "text-rose-600" : "text-slate-900"}`}>
                                {new Date(loan.dueDate).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Renew Action Button */}
                        <div className="mt-6 pt-4 border-t border-slate-100">
                          <button
                            onClick={() => handleRenewLoan(loan)}
                            disabled={!canRenew || isRenewing}
                            className={`w-full flex items-center justify-center gap-2 rounded-2xl py-2.5 text-xs font-extrabold shadow-xs transition-all ${
                              canRenew
                                ? "bg-slate-900 text-white hover:bg-slate-800"
                                : "bg-slate-100 text-slate-400 cursor-not-allowed"
                            }`}
                          >
                            <RefreshCw className={`h-3.5 w-3.5 ${isRenewing ? "animate-spin" : ""}`} />
                            <span>
                              {loan.renewCount >= summary.quota.maxRenewalLimit
                                ? "Max Renewals Reached"
                                : isOverdue
                                ? "Overdue (Visit Desk)"
                                : "Renew (+10 Days)"}
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : activeTab === "pending" ? (
            <div>
              {!summary?.pendingRequests || summary.pendingRequests.length === 0 ? (
                <div className="rounded-3xl bg-white border border-slate-200/80 p-12 text-center shadow-2xs">
                  <Clock className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-base font-extrabold text-slate-900">
                    No pending borrow requests
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    When you request to borrow a book, it will appear here until library staff issue it at the desk.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {summary.pendingRequests.map((loan) => (
                    <div
                      key={loan.id}
                      className="rounded-3xl border border-amber-200/70 bg-amber-50/40 p-6 shadow-2xs"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 text-xs font-extrabold">
                          <Clock className="h-3 w-3" />
                          <span>Awaiting Desk Collection</span>
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {new Date(loan.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <h3 className="text-base font-extrabold text-slate-900 line-clamp-2">
                        {loan.book?.title}
                      </h3>
                      <p className="text-xs text-slate-500 font-semibold mt-0.5">
                        By {loan.book?.author}
                      </p>

                      {loan.book && (
                        <div className="mt-3.5 rounded-2xl bg-white p-3 border border-amber-200/60 text-xs font-bold text-slate-700 flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                          <span>
                            Location: {loan.book.block} • {loan.book.shelfNumber}
                          </span>
                        </div>
                      )}

                      <div className="mt-4 pt-3 border-t border-amber-200/50 text-xs text-amber-800 font-medium">
                        Please visit the library circulation desk to pick up your physical book.
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              {!summary?.returnedHistory || summary.returnedHistory.length === 0 ? (
                <div className="rounded-3xl bg-white border border-slate-200/80 p-12 text-center shadow-2xs">
                  <History className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-base font-extrabold text-slate-900">
                    No borrowing history recorded yet
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Completed and returned book loans will be logged here for your academic reference.
                  </p>
                </div>
              ) : (
                <div className="rounded-3xl border border-slate-200/80 bg-white overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-extrabold border-b border-slate-200/60">
                        <tr>
                          <th className="px-6 py-4">Book Title</th>
                          <th className="px-6 py-4">Author</th>
                          <th className="px-6 py-4">Borrowed On</th>
                          <th className="px-6 py-4">Returned On</th>
                          <th className="px-6 py-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                        {summary.returnedHistory.map((loan) => (
                          <tr key={loan.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-6 py-4 font-bold text-slate-900">
                              <Link href={`/books/${loan.bookId}`} className="hover:text-indigo-600">
                                {loan.book?.title || "Book"}
                              </Link>
                            </td>
                            <td className="px-6 py-4">{loan.book?.author || "Author"}</td>
                            <td className="px-6 py-4 text-slate-500">
                              {new Date(loan.borrowDate).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 text-slate-500">
                              {loan.returnDate ? new Date(loan.returnDate).toLocaleDateString() : "Returned"}
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[10px] font-extrabold">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Returned</span>
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
