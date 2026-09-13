"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { loanService } from "@/services/loan-service";
import { BookLoan, ApiError, Role } from "@/lib/types";
import {
  BookCheck,
  BookOpen,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Check,
  X,
  MapPin,
  Calendar,
  User,
  GraduationCap,
  ShieldCheck,
  ArrowRight,
  Barcode,
  Sparkles,
} from "lucide-react";

export function BorrowRequestsView() {
  const [loans, setLoans] = useState<BookLoan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "faculty" | "student">("all");
  const [statusFilter, setStatusFilter] = useState<"requested" | "all">("requested");

  // Action processing state
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await loanService.getAll({ limit: 100 });
      if (res.success && res.data) {
        setLoans(res.data);
      }
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setError(apiErr?.message || "Failed to load borrow requests.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleApprove = async (loanId: string) => {
    try {
      setProcessingId(loanId);
      setActionFeedback(null);
      const res = await loanService.updateStatus(loanId, "issued", "Approved and issued via Borrow Requests management");
      if (res.success) {
        setActionFeedback({
          type: "success",
          message: "Request approved successfully! Book is now marked as issued.",
        });
        fetchRequests();
      }
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setActionFeedback({
        type: "error",
        message: apiErr?.message || "Failed to approve borrow request.",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (loanId: string) => {
    try {
      setProcessingId(loanId);
      setActionFeedback(null);
      const res = await loanService.updateStatus(loanId, "rejected", "Rejected at circulation desk");
      if (res.success) {
        setActionFeedback({
          type: "success",
          message: "Borrow request has been rejected.",
        });
        fetchRequests();
      }
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setActionFeedback({
        type: "error",
        message: apiErr?.message || "Failed to reject borrow request.",
      });
    } finally {
      setProcessingId(null);
    }
  };

  // Filtered dataset
  const filteredLoans = useMemo(() => {
    return loans.filter((loan) => {
      // Status filter
      if (statusFilter === "requested" && loan.status !== "requested") {
        return false;
      }

      // Role filter
      if (roleFilter !== "all") {
        const isFaculty = loan.user?.role === "faculty";
        if (roleFilter === "faculty" && !isFaculty) return false;
        if (roleFilter === "student" && isFaculty) return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const titleMatch = loan.book?.title?.toLowerCase().includes(term);
        const authorMatch = loan.book?.author?.toLowerCase().includes(term);
        const barcodeMatch = loan.book?.barcode?.toLowerCase().includes(term);
        const nameMatch = loan.user?.name?.toLowerCase().includes(term);
        const emailMatch = loan.user?.email?.toLowerCase().includes(term);
        const studentIdMatch = loan.user?.studentId?.toLowerCase().includes(term);
        const facultyIdMatch = (loan.user as any)?.facultyId?.toLowerCase().includes(term);

        return Boolean(titleMatch || authorMatch || barcodeMatch || nameMatch || emailMatch || studentIdMatch || facultyIdMatch);
      }

      return true;
    });
  }, [loans, statusFilter, roleFilter, searchTerm]);

  // Quick stats
  const pendingRequests = loans.filter((l) => l.status === "requested");
  const facultyPending = pendingRequests.filter((l) => l.user?.role === "faculty");
  const studentPending = pendingRequests.filter((l) => l.user?.role !== "faculty");
  const uniqueBooks = new Set(pendingRequests.map((l) => l.bookId)).size;

  return (
    <div className="space-y-6 pb-20">
      {/* ── KPI Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Pending Requests
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {pendingRequests.length}
          </div>
          <div className="text-xs font-semibold text-amber-600 mt-1">
            Awaiting desk approval
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Faculty Requests
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-700 mt-2">
            {facultyPending.length}
          </div>
          <div className="text-xs font-semibold text-purple-600 mt-1">
            Priority • 365-day loan period
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Student Requests
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
              <User className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-700 mt-2">
            {studentPending.length}
          </div>
          <div className="text-xs font-semibold text-blue-600 mt-1">
            Standard 10-day loan period
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Distinct Volumes
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-2">
            {uniqueBooks}
          </div>
          <div className="text-xs font-semibold text-emerald-600 mt-1">
            Titles requested by users
          </div>
        </div>
      </div>

      {/* ── Feedback Notification ── */}
      {actionFeedback && (
        <div
          className={`p-4 rounded-2xl border text-sm font-bold flex items-center justify-between shadow-xs ${
            actionFeedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {actionFeedback.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{actionFeedback.message}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-slate-400 hover:text-slate-700 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Control & Filter Toolbar ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search book title, author, barcode, requester name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                Clear
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setRoleFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  roleFilter === "all"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All Roles
              </button>
              <button
                onClick={() => setRoleFilter("faculty")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  roleFilter === "faculty"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Faculty Only ({facultyPending.length})
              </button>
              <button
                onClick={() => setRoleFilter("student")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  roleFilter === "student"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Students Only ({studentPending.length})
              </button>
            </div>

            <button
              onClick={fetchRequests}
              disabled={isLoading}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all border border-slate-200"
              title="Refresh requests"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-slate-900" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Requests Table ── */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-slate-400 font-semibold text-xs flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-slate-900" />
            <span>Loading pending borrow requests...</span>
          </div>
        ) : filteredLoans.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <BookCheck className="w-7 h-7" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900">
              No pending borrow requests
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              {searchTerm || roleFilter !== "all"
                ? "No borrow requests match your current search or filter criteria."
                : "All book borrow requests have been processed. Great job!"}
            </p>
            {(searchTerm || roleFilter !== "all") && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setRoleFilter("all");
                }}
                className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-5">Book Details</th>
                  <th className="py-3.5 px-5">Requester</th>
                  <th className="py-3.5 px-5">Requested On</th>
                  <th className="py-3.5 px-5">Loan Terms</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {filteredLoans.map((loan) => {
                  const isFaculty = loan.user?.role === "faculty";
                  const isProcessing = processingId === loan.id;

                  return (
                    <tr
                      key={loan.id}
                      className="hover:bg-slate-50/60 transition-colors group"
                    >
                      {/* Book Details */}
                      <td className="py-4 px-5">
                        <div className="flex items-start gap-3.5">
                          <div className="w-12 h-16 bg-slate-100 rounded-xl overflow-hidden shrink-0 border border-slate-200 flex items-center justify-center text-slate-400">
                            {loan.book?.coverImage ? (
                              <img
                                src={loan.book.coverImage}
                                alt={loan.book.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <BookOpen className="w-5 h-5" />
                            )}
                          </div>
                          <div className="min-w-0 max-w-xs">
                            <Link
                              href={`/books/${loan.bookId}`}
                              className="font-extrabold text-slate-900 hover:text-indigo-600 line-clamp-1 text-xs leading-snug"
                            >
                              {loan.book?.title}
                            </Link>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              By {loan.book?.author || "Unknown Author"}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                                <MapPin className="w-3 h-3 text-indigo-600" />
                                {loan.book?.block || "Block"} • {loan.book?.shelfNumber || "Shelf"}
                              </span>
                              {loan.book?.barcode && (
                                <span className="text-[10px] font-mono text-slate-400">
                                  {loan.book.barcode}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Requester Profile */}
                      <td className="py-4 px-5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-slate-900 text-xs">
                              {loan.user?.name || "Library User"}
                            </span>
                            {isFaculty ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-50 text-purple-700 border border-purple-200">
                                <GraduationCap className="w-3 h-3" />
                                Faculty
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                <User className="w-3 h-3" />
                                Student
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium">
                            {loan.user?.email}
                          </div>
                          {loan.user?.studentId && (
                            <div className="text-[10px] font-mono font-bold text-slate-400">
                              ID: {loan.user.studentId}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Request Date */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        <div className="text-xs font-bold text-slate-900">
                          {new Date(loan.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(loan.createdAt).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>

                      {/* Loan Terms */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        {isFaculty ? (
                          <div>
                            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-purple-700">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              365 Days
                            </span>
                            <div className="text-[10px] text-purple-600/80 font-semibold mt-0.5">
                              Faculty Privilege • No Fines
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span className="text-[11px] font-bold text-slate-800">
                              10 Days
                            </span>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Standard Student Borrow
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Awaiting Approval
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleApprove(loan.id)}
                            disabled={isProcessing}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-extrabold shadow-xs transition-all disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{isProcessing ? "Processing..." : "Approve & Issue"}</span>
                          </button>

                          <button
                            onClick={() => handleReject(loan.id)}
                            disabled={isProcessing}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-slate-200 disabled:opacity-50"
                            title="Reject Request"
                          >
                            <X className="w-4 h-4" />
                          </button>
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
    </div>
  );
}

export default BorrowRequestsView;
