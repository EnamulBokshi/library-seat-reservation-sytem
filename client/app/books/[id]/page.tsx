"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { bookService } from "@/services/book-service";
import { loanService } from "@/services/loan-service";
import { Book, StudentLoanSummary } from "@/lib/types";
import {
  ArrowLeft,
  BookOpen,
  MapPin,
  FileText,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Navigation,
  Compass,
  Barcode,
  Building,
  DollarSign,
  ShieldCheck,
  Sparkles,
  Info,
  Check,
  X,
  ExternalLink,
  Bookmark,
} from "lucide-react";

export default function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const bookId = resolvedParams.id;
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const [book, setBook] = useState<Book | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Student Quota
  const [studentSummary, setStudentSummary] = useState<StudentLoanSummary | null>(null);

  // Borrow Modal State
  const [isBorrowModalOpen, setIsBorrowModalOpen] = useState(false);
  const [borrowNotes, setBorrowNotes] = useState("");
  const [isSubmittingBorrow, setIsSubmittingBorrow] = useState(false);
  const [borrowSuccessMsg, setBorrowSuccessMsg] = useState<string | null>(null);
  const [borrowErrorMsg, setBorrowErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchBookDetails();
    if (isAuthenticated) {
      fetchStudentQuota();
    }
  }, [bookId, isAuthenticated]);

  const fetchBookDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await bookService.getById(bookId);
      if (res.success && res.data) {
        setBook(res.data);
      } else {
        setError("Book not found.");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load book details.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStudentQuota = async () => {
    try {
      const res = await loanService.getMyLoans();
      if (res.success && res.data) {
        setStudentSummary(res.data);
      }
    } catch (err) {
      // Non-blocking
    }
  };

  const handleConfirmBorrow = async () => {
    if (!book) return;

    try {
      setIsSubmittingBorrow(true);
      setBorrowErrorMsg(null);
      const res = await loanService.requestBorrow(book.id, borrowNotes);

      if (res.success) {
        setBorrowSuccessMsg(
          `Request confirmed! You have 10 days once picked up. Please collect "${book.title}" from the circulation desk.`
        );
        fetchBookDetails();
        fetchStudentQuota();
        setTimeout(() => {
          setIsBorrowModalOpen(false);
          setBorrowSuccessMsg(null);
        }, 2200);
      }
    } catch (err: any) {
      setBorrowErrorMsg(err?.message || "Failed to submit borrow request.");
    } finally {
      setIsSubmittingBorrow(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center py-20 text-slate-900">
        <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm font-bold text-slate-500">Loading book spatial blueprint and details...</p>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
        <div className="rounded-3xl bg-white border border-slate-200 p-8 max-w-md w-full text-center shadow-sm">
          <AlertCircle className="h-10 w-10 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900">{error || "Book not found"}</h2>
          <p className="text-xs text-slate-500 mt-1 mb-6">
            The book you are looking for might have been moved or deactivated.
          </p>
          <Link
            href="/books"
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800"
          >
            Back to Books Catalog
          </Link>
        </div>
      </div>
    );
  }

  const inStock = book.availableCopies > 0;
  const hasUnpaidFines = studentSummary?.fines?.hasUnpaidDues || false;
  const remainingQuota = studentSummary?.quota?.availableQuota ?? 3;

  // Check if current student has this book borrowed or requested
  const userLoan = studentSummary?.activeLoans?.find((l) => l.bookId === book.id) ||
    studentSummary?.pendingRequests?.find((l) => l.bookId === book.id) ||
    null;
  const isBorrowedByMe = userLoan?.status === "issued" || userLoan?.status === "overdue";
  const isRequestedByMe = userLoan?.status === "requested";

  return (
    <div className="min-h-screen bg-[#fafafa] text-slate-900 pb-24">
      {/* ── Top Clean Sub-header ── */}
      <div className="border-b border-slate-200 bg-white sticky top-0 z-20 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <Link
            href="/books"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Books Catalog</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold">
              {book.category}
            </span>
            {book.barcode && (
              <span className="hidden sm:inline-flex px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-mono font-bold">
                {book.barcode}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── 2-Column Responsive Layout ── */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* ── LEFT SIDE (8 COLS, SCROLLABLE): FULL BOOK DETAILS ─────────── */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-8 space-y-10">

            {/* 0. Student Active Loan Alert Banner (if borrowed or requested) */}
            {userLoan && (
              <div
                className={`rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border transition-all ${
                  userLoan.status === "overdue"
                    ? "bg-rose-50 border-rose-200 text-rose-900"
                    : userLoan.status === "issued"
                    ? "bg-indigo-50 border-indigo-200 text-indigo-950"
                    : "bg-amber-50 border-amber-200 text-amber-950"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 ${
                      userLoan.status === "overdue"
                        ? "bg-rose-600 text-white"
                        : userLoan.status === "issued"
                        ? "bg-indigo-600 text-white"
                        : "bg-amber-500 text-white"
                    }`}
                  >
                    {userLoan.status === "overdue" ? (
                      <AlertCircle className="h-6 w-6" />
                    ) : userLoan.status === "issued" ? (
                      <Bookmark className="h-6 w-6 fill-current" />
                    ) : (
                      <Clock className="h-6 w-6" />
                    )}
                  </div>

                  <div>
                    <div
                      className={`text-xs font-black uppercase tracking-wider ${
                        userLoan.status === "overdue"
                          ? "text-rose-600"
                          : userLoan.status === "issued"
                          ? "text-indigo-600"
                          : "text-amber-700"
                      }`}
                    >
                      {userLoan.status === "overdue"
                        ? "Overdue Loan • Immediate Action Required"
                        : userLoan.status === "issued"
                        ? "Currently Borrowed by You"
                        : "Borrow Request Submitted"}
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5">
                      {userLoan.status === "overdue"
                        ? `Was due on ${new Date(userLoan.dueDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })} • Overdue Fine: ${userLoan.fineAmount || 0} BDT`
                        : userLoan.status === "issued"
                        ? `Return Due: ${new Date(userLoan.dueDate).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })} (${userLoan.renewCount > 0 ? `Renewed ${userLoan.renewCount}x` : "Original 10-day period"})`
                        : "Waiting for circulation librarian check-out at desk."}
                    </div>
                  </div>
                </div>

                <Link
                  href="/loans"
                  className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-extrabold text-white transition-colors shrink-0 self-start sm:self-auto shadow-xs ${
                    userLoan.status === "overdue"
                      ? "bg-rose-600 hover:bg-rose-700"
                      : userLoan.status === "issued"
                      ? "bg-indigo-600 hover:bg-indigo-700"
                      : "bg-amber-600 hover:bg-amber-700"
                  }`}
                >
                  <span>Manage in My Loans</span>
                  <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
                </Link>
              </div>
            )}
            
            {/* 1. Header & Hero Presentation (Flat, Clean) */}
            <div className="space-y-6">
              {/* Category & Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 bg-indigo-50 border border-indigo-200/60 text-indigo-700 rounded-full text-xs font-bold">
                  {book.category}
                </span>
                {book.edition && (
                  <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold">
                    {book.edition} Edition
                  </span>
                )}
                {book.publicationYear && (
                  <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold">
                    Year {book.publicationYear}
                  </span>
                )}
                {book.pdfUrl && (
                  <span className="px-3 py-1 bg-rose-50 border border-rose-200 text-rose-700 rounded-full text-xs font-bold flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    Digital PDF Available
                  </span>
                )}
              </div>

              {/* Title & Author */}
              <div>
                <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                  {book.title}
                </h1>
                <p className="text-base sm:text-lg font-medium text-slate-600 mt-2">
                  Authored by <span className="font-bold text-slate-900">{book.author}</span>
                </p>
              </div>

              {/* Book Cover Image (Large, Flat Showcase) */}
              <div className="relative w-full max-w-md sm:max-w-lg aspect-[16/10] sm:aspect-[16/9] rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
                {book.coverImage ? (
                  <img
                    src={book.coverImage}
                    alt={book.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-8">
                    <BookOpen className="h-16 w-16 text-slate-300 mx-auto mb-2" />
                    <span className="text-sm font-bold text-slate-400">{book.title}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Flat Bibliographical Metadata Grid */}
            <div className="pt-8 border-t border-slate-200">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-4">
                Bibliographic Information
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-6 text-xs">
                <div>
                  <span className="text-slate-400 font-medium block">ISBN-13</span>
                  <span className="font-bold text-slate-900 font-mono mt-0.5 block">{book.isbn || "N/A"}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Barcode Tag</span>
                  <span className="font-bold text-indigo-700 font-mono mt-0.5 block">{book.barcode || "N/A"}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Call Number</span>
                  <span className="font-bold text-indigo-700 font-mono mt-0.5 block">{book.callNumber || "N/A"}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Publisher</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">{book.publisher || "General Press"}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Publication Year</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">{book.publicationYear || "N/A"}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Edition</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">{book.edition || "Standard"}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Total Inventory</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">{book.totalCopies} physical copies</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Standard Loan Term</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">10 Days (3x Renew)</span>
                </div>
              </div>
            </div>

            {/* 3. Synopsis & Description */}
            <div className="pt-8 border-t border-slate-200">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">
                Synopsis & Subject Overview
              </h2>
              <p className="text-sm sm:text-base leading-relaxed text-slate-700 font-normal">
                {book.description ||
                  "This comprehensive academic edition provides theoretical foundations, algorithms, and applied frameworks for university coursework, student capstone projects, and faculty research."}
              </p>
            </div>

            {/* 4. Physical Shelf Locator (Flat, Clean Stacks Blueprint) */}
            <div className="pt-8 border-t border-slate-200 space-y-6">
              <div>
                <div className="flex items-center gap-2">
                  <Compass className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-lg font-extrabold text-slate-900">Physical Shelf Locator</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Live Library Stacks
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Follow these physical coordinates in the central university library to find this book on the stacks.
                </p>
              </div>

              {/* Blueprint Container (Clean Flat Style) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="text-sm font-extrabold text-slate-900">
                      Target Shelf: {book.block} • {book.shelfNumber} {book.rowNumber ? `• ${book.rowNumber}` : ""}
                    </span>
                  </div>
                  {book.callNumber && (
                    <span className="px-3 py-1 bg-slate-100 text-slate-800 font-mono text-xs font-bold rounded-lg self-start sm:self-auto">
                      Call Number: {book.callNumber}
                    </span>
                  )}
                </div>

                {/* Flat Block Matrix */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                  {["Block A", "Block B", "Block C", "Block D"].map((blk) => {
                    const isCurrentBlock = book.block.toLowerCase().includes(blk.toLowerCase().slice(-1));

                    return (
                      <div
                        key={blk}
                        className={`rounded-xl p-3.5 border transition-all ${
                          isCurrentBlock
                            ? "bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20"
                            : "bg-slate-50/70 border-slate-200 opacity-60"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2.5">
                          <span className={`text-xs font-black ${isCurrentBlock ? "text-indigo-900" : "text-slate-700"}`}>
                            {blk}
                          </span>
                          {isCurrentBlock && (
                            <span className="px-1.5 py-0.5 bg-indigo-600 text-white rounded text-[9px] font-bold">
                              TARGET
                            </span>
                          )}
                        </div>

                        {/* Shelf Shelves grid */}
                        <div className="grid grid-cols-3 gap-1.5">
                          {[1, 2, 3, 4, 5, 6].map((num) => {
                            const isTargetShelf = isCurrentBlock && book.shelfNumber.includes(`${num}`);

                            return (
                              <div
                                key={num}
                                className={`h-7 rounded-lg text-[10px] font-bold flex items-center justify-center border transition-all ${
                                  isTargetShelf
                                    ? "bg-indigo-600 text-white border-indigo-700 font-black shadow-xs scale-105"
                                    : "bg-white border-slate-200 text-slate-600"
                                }`}
                              >
                                {isTargetShelf ? `S${num}` : `S${num}`}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Walking guidance */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>
                    Head to <strong>{book.block}</strong>, enter the aisle for <strong>{book.shelfNumber}</strong>, inspect <strong>{book.rowNumber || "shelf tier"}</strong>.
                  </span>
                </div>
              </div>
            </div>

            {/* 5. Borrowing Policies & Circulation Guidelines */}
            <div className="pt-8 border-t border-slate-200 space-y-4">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                Circulation & Borrowing Rules
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-white border border-slate-200">
                  <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    10-Day Duration
                  </div>
                  <p className="text-slate-500 leading-relaxed">
                    Standard borrowing period is 10 calendar days with automated 48-hour return reminders.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200">
                  <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                    <RefreshCw className="w-4 h-4 text-indigo-600" />
                    3x Online Renewals
                  </div>
                  <p className="text-slate-500 leading-relaxed">
                    You can extend this loan up to 3 times through the student portal if not overdue.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200">
                  <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-rose-600" />
                    Overdue Charges
                  </div>
                  <p className="text-slate-500 leading-relaxed">
                    A late fee of 5 Tk/day applies if not returned on time. Unpaid fees suspend new borrows.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* ── RIGHT SIDE (4 COLS, FIXED / STICKY): LOOKUP & CHECKOUT ───── */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-5">
            
            {/* Quick Action Checkout Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-sm space-y-6">
              
              {/* Header / Stock Badge */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                    Physical Availability
                  </span>
                  <span className={`text-base font-black ${inStock ? "text-emerald-600" : "text-rose-600"}`}>
                    {inStock ? "Available to Borrow" : "Currently on Loan"}
                  </span>
                </div>

                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold ${
                    inStock
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-rose-50 text-rose-700 border border-rose-200"
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${inStock ? "bg-emerald-500" : "bg-rose-500"}`} />
                  {inStock ? `${book.availableCopies} of ${book.totalCopies} Left` : "0 Copies"}
                </span>
              </div>

              {/* Physical Shelf Coordinates Snapshot */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Shelf Location:</span>
                  <span className="font-extrabold text-slate-900">
                    {book.block} • {book.shelfNumber}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Row / Shelf Tier:</span>
                  <span className="font-bold text-slate-800">{book.rowNumber || "Standard Tier"}</span>
                </div>
                {book.callNumber && (
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
                    <span className="text-slate-500 font-medium">Call Number:</span>
                    <span className="font-mono font-bold text-indigo-700">{book.callNumber}</span>
                  </div>
                )}
              </div>

              {/* Student Eligibility Status Notice */}
              {isAuthenticated ? (
                <div className="text-xs space-y-1.5 pt-1">
                  {hasUnpaidFines ? (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-semibold">
                      <strong className="block text-rose-900 font-bold">Borrowing Locked:</strong>
                      You have unpaid overdue fees. Please clear dues at the circulation desk first.
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-slate-600 font-medium">
                      <span>Your Active Loans:</span>
                      <span className="font-bold text-slate-900">
                        {studentSummary?.quota?.currentlyBorrowed ?? 0} / {studentSummary?.quota?.maxBorrowLimit ?? 3} Books
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-800 font-medium">
                  Please sign in to submit online borrow requests or view your quota.
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                {isBorrowedByMe ? (
                  <Link
                    href="/loans"
                    className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Bookmark className="w-4 h-4 fill-current" />
                    <span>Currently Borrowed (Manage Loan)</span>
                  </Link>
                ) : isRequestedByMe ? (
                  <Link
                    href="/loans"
                    className="w-full py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-sm transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Clock className="w-4 h-4" />
                    <span>Pickup Request Pending (View in My Loans)</span>
                  </Link>
                ) : (
                  <button
                    onClick={() => {
                      if (!isAuthenticated) {
                        router.push(`/auth/login?redirect=/books/${book.id}`);
                        return;
                      }
                      setIsBorrowModalOpen(true);
                    }}
                    disabled={!inStock || hasUnpaidFines}
                    className={`w-full py-3.5 px-4 rounded-2xl font-extrabold text-sm transition-all flex items-center justify-center gap-2 shadow-sm ${
                      inStock && !hasUnpaidFines
                        ? "bg-slate-900 hover:bg-slate-800 text-white shadow-slate-200"
                        : "bg-slate-200 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    {hasUnpaidFines
                      ? "Dues Pending (Borrow Locked)"
                      : inStock
                      ? "Request 10-Day Borrow"
                      : "All Copies Checked Out"}
                  </button>
                )}

                {book.pdfUrl && (
                  <a
                    href={book.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 px-4 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold text-xs transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5 text-rose-600" />
                    Read / Download Digital PDF
                  </a>
                )}
              </div>

              {/* Quick Perks / Summary */}
              <div className="pt-4 border-t border-slate-100 text-xs text-slate-500 space-y-2 font-medium">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Immediate confirmation email on borrow</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Automated 48-hour return reminder alert</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Pick up physically with Student ID card</span>
                </div>
              </div>
            </div>

            {/* Quick Librarian Desk Scan Hint */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs text-slate-600 space-y-1">
              <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                <Barcode className="w-3.5 h-3.5 text-indigo-600" />
                Physical Checkout at Desk
              </span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Bring this book directly to the circulation desk. The librarian can scan the barcode{" "}
                <strong className="text-slate-800">{book.barcode || book.isbn || "on back cover"}</strong> for instant checkout.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* ── Borrow Modal ── */}
      {isBorrowModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Request Book Borrow
                  </h3>
                  <p className="text-xs text-slate-500">
                    10-day borrow period with up to 3 renewals
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBorrowModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {borrowSuccessMsg ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto animate-bounce" />
                <h4 className="text-base font-extrabold text-slate-900">Request Confirmed!</h4>
                <p className="text-xs text-slate-600 max-w-xs mx-auto">
                  {borrowSuccessMsg}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200">
                  <div className="font-extrabold text-sm text-slate-900 line-clamp-1">{book.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5">By {book.author}</div>
                  <div className="mt-2.5 flex items-center gap-2 text-xs font-bold text-indigo-700 bg-indigo-50/80 rounded-xl px-2.5 py-1.5 border border-indigo-100">
                    <MapPin className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                    <span>
                      {book.block} • {book.shelfNumber} {book.rowNumber ? `• ${book.rowNumber}` : ""}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 space-y-1">
                  <div className="font-bold text-slate-800">Circulation Policy:</div>
                  <ul className="list-disc list-inside text-[11px] text-slate-600 space-y-0.5">
                    <li>1 borrow period is <strong>10 days</strong>.</li>
                    <li>Students can borrow at most <strong>3 books</strong> concurrently.</li>
                    <li>Overdue rate: <strong>5 Tk / day</strong>.</li>
                  </ul>
                </div>

                {borrowErrorMsg && (
                  <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-bold text-rose-700">
                    {borrowErrorMsg}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Student Note / Purpose (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Capstone project reference"
                    value={borrowNotes}
                    onChange={(e) => setBorrowNotes(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsBorrowModalOpen(false)}
                    disabled={isSubmittingBorrow}
                    className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmBorrow}
                    disabled={isSubmittingBorrow}
                    className="flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 px-5 py-2.5 text-xs font-extrabold text-white shadow-sm transition-colors disabled:opacity-50"
                  >
                    {isSubmittingBorrow && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                    <span>Submit Borrow Request</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
