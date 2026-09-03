"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { loanService } from "@/services/loan-service";
import { bookService } from "@/services/book-service";
import { BookLoan, CirculationStats, Book, LoanStatus } from "@/lib/types";
import {
  ShieldCheck,
  BookOpen,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  PlusCircle,
  ArrowRight,
  Filter,
  Check,
  X,
  MapPin,
  Calendar,
} from "lucide-react";

export default function AdminCirculationPage() {
  const [loans, setLoans] = useState<BookLoan[]>([]);
  const [stats, setStats] = useState<CirculationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"requests" | "active" | "overdue" | "returned">("requests");
  const [searchTerm, setSearchTerm] = useState("");

  // Direct Issue Modal State
  const [isDirectIssueOpen, setIsDirectIssueOpen] = useState(false);
  const [availableBooks, setAvailableBooks] = useState<Book[]>([]);
  const [selectedBookId, setSelectedBookId] = useState("");
  const [studentIdentifier, setStudentIdentifier] = useState("");
  const [issueNotes, setIssueNotes] = useState("");
  const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);
  const [issueModalError, setIssueModalError] = useState<string | null>(null);
  const [issueModalSuccess, setIssueModalSuccess] = useState<string | null>(null);

  // Row Action State
  const [processingLoanId, setProcessingLoanId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  useEffect(() => {
    fetchCirculationData();
  }, []);

  const fetchCirculationData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [loansRes, statsRes] = await Promise.all([
        loanService.getAll({ limit: 100 }),
        loanService.getStats(),
      ]);

      if (loansRes.success && loansRes.data) {
        setLoans(loansRes.data);
      }
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load circulation records.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDirectIssue = async () => {
    setIsDirectIssueOpen(true);
    setIssueModalError(null);
    setIssueModalSuccess(null);
    setSelectedBookId("");
    setStudentIdentifier("");
    setIssueNotes("");

    try {
      const res = await bookService.getAll({ inStockOnly: true, limit: 100 });
      if (res.success && res.data) {
        setAvailableBooks(res.data);
      }
    } catch (err) {
      // Non-blocking
    }
  };

  const handleDirectIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmittingIssue(true);
      setIssueModalError(null);
      setIssueModalSuccess(null);

      const res = await loanService.directIssue({
        bookId: selectedBookId,
        studentIdentifier,
        notes: issueNotes || undefined,
      });

      if (res.success) {
        setIssueModalSuccess("Book successfully issued to student for 10 days!");
        fetchCirculationData();
        setTimeout(() => setIsDirectIssueOpen(false), 1500);
      }
    } catch (err: any) {
      setIssueModalError(err?.message || "Failed to issue book.");
    } finally {
      setIsSubmittingIssue(false);
    }
  };

  const handleUpdateStatus = async (loanId: string, status: LoanStatus) => {
    try {
      setProcessingLoanId(loanId);
      setActionFeedback(null);

      const res = await loanService.updateStatus(loanId, status);
      if (res.success) {
        setActionFeedback(`Loan status updated to '${status}'.`);
        fetchCirculationData();
        setTimeout(() => setActionFeedback(null), 4000);
      }
    } catch (err: any) {
      alert(err?.message || "Failed to update loan status.");
    } finally {
      setProcessingLoanId(null);
    }
  };

  const handleReturnBook = async (loanId: string) => {
    try {
      setProcessingLoanId(loanId);
      setActionFeedback(null);

      const res = await loanService.returnBook(loanId);
      if (res.success) {
        setActionFeedback("Book successfully marked as returned! Stock inventory restored.");
        fetchCirculationData();
        setTimeout(() => setActionFeedback(null), 4000);
      }
    } catch (err: any) {
      alert(err?.message || "Failed to return book.");
    } finally {
      setProcessingLoanId(null);
    }
  };

  const handleAdminRenew = async (loanId: string) => {
    try {
      setProcessingLoanId(loanId);
      setActionFeedback(null);

      const res = await loanService.adminRenew(loanId, 10);
      if (res.success && res.data) {
        setActionFeedback(`Loan extended by 10 days! New due date: ${new Date(res.data.dueDate).toLocaleDateString()}`);
        fetchCirculationData();
        setTimeout(() => setActionFeedback(null), 4000);
      }
    } catch (err: any) {
      alert(err?.message || "Failed to extend loan.");
    } finally {
      setProcessingLoanId(null);
    }
  };

  // Filter loans by tab & search
  const filteredLoans = loans.filter((loan) => {
    const now = new Date();
    const dueDate = new Date(loan.dueDate);

    // Tab check
    if (activeTab === "requests" && loan.status !== "requested") return false;
    if (activeTab === "active" && (loan.status !== "issued" || dueDate < now)) return false;
    if (activeTab === "overdue" && (loan.status !== "issued" || dueDate >= now)) return false;
    if (activeTab === "returned" && loan.status !== "returned") return false;

    // Search query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const match =
        loan.book?.title.toLowerCase().includes(q) ||
        loan.user?.name.toLowerCase().includes(q) ||
        loan.user?.email.toLowerCase().includes(q) ||
        (loan.user?.studentId && loan.user.studentId.toLowerCase().includes(q));
      if (!match) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6 pb-20">
      {/* ── Header Section ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Circulation Desk & Book Borrowing
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Approve borrow requests, issue books directly to students, process returns, and handle 10-day renewals.
          </p>
        </div>

        <button
          onClick={handleOpenDirectIssue}
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-xs font-extrabold text-white shadow-xs hover:bg-slate-800 transition-colors shrink-0"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Direct Issue Book</span>
        </button>
      </div>

      {/* ── Circulation Stats Cards ── */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-3xl border border-amber-200/80 bg-amber-50/60 p-5">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700">
              Pending Requests
            </div>
            <div className="text-2xl font-black text-amber-900 mt-1">
              {stats.pendingRequests}
            </div>
            <div className="text-[11px] font-semibold text-amber-700 mt-1">
              Awaiting staff confirmation
            </div>
          </div>

          <div className="rounded-3xl border border-indigo-200/80 bg-indigo-50/60 p-5">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700">
              Active Loans
            </div>
            <div className="text-2xl font-black text-indigo-900 mt-1">
              {stats.activeLoans}
            </div>
            <div className="text-[11px] font-semibold text-indigo-700 mt-1">
              Currently with students
            </div>
          </div>

          <div className="rounded-3xl border border-rose-200/80 bg-rose-50/60 p-5">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700">
              Overdue Loans
            </div>
            <div className="text-2xl font-black text-rose-900 mt-1">
              {stats.overdueLoans}
            </div>
            <div className="text-[11px] font-semibold text-rose-700 mt-1">
              Past 10-day period
            </div>
          </div>

          <div className="rounded-3xl border border-emerald-200/80 bg-emerald-50/60 p-5">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
              Total Books Returned
            </div>
            <div className="text-2xl font-black text-emerald-900 mt-1">
              {stats.totalReturned}
            </div>
            <div className="text-[11px] font-semibold text-emerald-700 mt-1">
              Restored to inventory
            </div>
          </div>
        </div>
      )}

      {actionFeedback && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* ── Tabbed View & Search Bar ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200/80 pb-1">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("requests")}
            className={`flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-xs font-extrabold transition-all whitespace-nowrap ${
              activeTab === "requests"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <span>Borrow Requests</span>
            {stats && stats.pendingRequests > 0 && (
              <span className="rounded-full bg-amber-500 text-white px-2 py-0.2 text-[10px] font-black">
                {stats.pendingRequests}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("active")}
            className={`flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-xs font-extrabold transition-all whitespace-nowrap ${
              activeTab === "active"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <span>Active Loans</span>
          </button>

          <button
            onClick={() => setActiveTab("overdue")}
            className={`flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-xs font-extrabold transition-all whitespace-nowrap ${
              activeTab === "overdue"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <span>Overdue</span>
            {stats && stats.overdueLoans > 0 && (
              <span className="rounded-full bg-rose-500 text-white px-2 py-0.2 text-[10px] font-black">
                {stats.overdueLoans}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("returned")}
            className={`flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-xs font-extrabold transition-all whitespace-nowrap ${
              activeTab === "returned"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <span>Returned Records</span>
          </button>
        </div>

        <div className="relative w-full sm:w-64 flex items-center">
          <Search className="absolute left-3.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search student or book..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          />
        </div>
      </div>

      {/* ── Table Container ── */}
      <div className="rounded-3xl border border-slate-200/80 bg-white overflow-hidden shadow-2xs">
        {isLoading ? (
          <div className="py-20 text-center">
            <RefreshCw className="h-8 w-8 text-slate-400 animate-spin mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-500">Loading circulation records...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-700">
            <AlertTriangle className="h-8 w-8 text-rose-500 mx-auto mb-2" />
            <p className="font-bold">{error}</p>
          </div>
        ) : filteredLoans.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-700">No records in this category</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Select another tab or adjust your search term.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-extrabold border-b border-slate-200/60">
                <tr>
                  <th className="px-5 py-3.5">Student Info</th>
                  <th className="px-5 py-3.5">Book & Shelf Location</th>
                  <th className="px-5 py-3.5">Borrow / Due Date</th>
                  <th className="px-5 py-3.5">Renewals</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Circulation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {filteredLoans.map((loan) => {
                  const now = new Date();
                  const dueDate = new Date(loan.dueDate);
                  const isOverdue = loan.status === "issued" && dueDate < now;
                  const isProcessing = processingLoanId === loan.id;

                  return (
                    <tr key={loan.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Student */}
                      <td className="px-5 py-4">
                        <div className="font-extrabold text-slate-900">
                          {loan.user?.name || "Student"}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          ID: {loan.user?.studentId || "N/A"} • {loan.user?.email}
                        </div>
                      </td>

                      {/* Book & Shelf */}
                      <td className="px-5 py-4">
                        <div className="font-extrabold text-slate-900 line-clamp-1">
                          {loan.book?.title}
                        </div>
                        {loan.book && (
                          <div className="text-[11px] text-indigo-600 flex items-center gap-1 font-bold mt-0.5">
                            <MapPin className="h-3 w-3" />
                            <span>
                              {loan.book.block} • {loan.book.shelfNumber} {loan.book.rowNumber ? `• ${loan.book.rowNumber}` : ""}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Dates */}
                      <td className="px-5 py-4">
                        <div>Borrow: {new Date(loan.borrowDate).toLocaleDateString()}</div>
                        <div className={`font-extrabold ${isOverdue ? "text-rose-600" : "text-slate-800"}`}>
                          Due: {new Date(loan.dueDate).toLocaleDateString()}
                        </div>
                      </td>

                      {/* Renewals */}
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-700">
                          {loan.renewCount} / 3 Renewed
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                            loan.status === "requested"
                              ? "bg-amber-100 text-amber-800"
                              : isOverdue
                              ? "bg-rose-100 text-rose-800"
                              : loan.status === "issued"
                              ? "bg-indigo-100 text-indigo-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {loan.status === "requested" && "Requested"}
                          {loan.status === "issued" && (isOverdue ? "Overdue" : "Issued (Active)")}
                          {loan.status === "returned" && "Returned"}
                          {loan.status === "rejected" && "Rejected"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {loan.status === "requested" && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(loan.id, "issued")}
                                disabled={isProcessing}
                                className="inline-flex items-center gap-1 rounded-xl bg-slate-900 text-white hover:bg-slate-800 px-3 py-1.5 text-xs font-bold transition-colors"
                              >
                                <Check className="h-3.5 w-3.5" />
                                <span>Approve & Issue</span>
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(loan.id, "rejected")}
                                disabled={isProcessing}
                                className="rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 text-xs font-bold transition-colors"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {loan.status === "issued" && (
                            <>
                              <button
                                onClick={() => handleReturnBook(loan.id)}
                                disabled={isProcessing}
                                className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 px-3 py-1.5 text-xs font-bold shadow-2xs transition-colors"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Mark Returned</span>
                              </button>

                              <button
                                onClick={() => handleAdminRenew(loan.id)}
                                disabled={isProcessing}
                                className="rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 px-2.5 py-1.5 text-xs font-bold transition-colors"
                                title="Extend loan by 10 days"
                              >
                                +10d Extend
                              </button>
                            </>
                          )}

                          {loan.status === "returned" && (
                            <span className="text-[11px] text-slate-400 font-medium">
                              Archived
                            </span>
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
      </div>

      {/* ── Direct Issue Modal ── */}
      {isDirectIssueOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Direct Issue Book
                  </h3>
                  <p className="text-xs text-slate-500">
                    Issue a physical copy directly to a student ID (10-day period).
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsDirectIssueOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {issueModalSuccess && (
              <div className="my-4 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-bold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>{issueModalSuccess}</span>
              </div>
            )}

            {issueModalError && (
              <div className="my-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-bold text-rose-800 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                <span>{issueModalError}</span>
              </div>
            )}

            <form onSubmit={handleDirectIssueSubmit} className="mt-4 space-y-4 text-xs font-bold">
              {/* Select Book */}
              <div>
                <label className="block text-slate-700 mb-1">Select Book in Stock *</label>
                <select
                  required
                  value={selectedBookId}
                  onChange={(e) => setSelectedBookId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                >
                  <option value="">-- Choose Book --</option>
                  {availableBooks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title} ({b.availableCopies} available • {b.block} {b.shelfNumber})
                    </option>
                  ))}
                </select>
              </div>

              {/* Student Identifier */}
              <div>
                <label className="block text-slate-700 mb-1">Student ID or Registered Email *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 211-15-1234 or student@diu.edu.bd"
                  value={studentIdentifier}
                  onChange={(e) => setStudentIdentifier(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              </div>

              {/* Staff Notes */}
              <div>
                <label className="block text-slate-700 mb-1">Staff Circulation Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Verified DIU student ID card"
                  value={issueNotes}
                  onChange={(e) => setIssueNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none"
                />
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3 text-[11px] text-slate-500 font-medium">
                Standard circulation automatically sets a <strong>10-day</strong> due date and decrements available inventory by 1 copy.
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDirectIssueOpen(false)}
                  disabled={isSubmittingIssue}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingIssue}
                  className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50"
                >
                  {isSubmittingIssue && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>Issue Book</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
