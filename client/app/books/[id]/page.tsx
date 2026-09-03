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
  Layers,
  Sparkles,
  RefreshCw,
  Share2,
  Navigation,
  Compass,
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
          `Request confirmed! You have 10 days for reading. Please collect this copy from the library desk.`
        );
        fetchBookDetails();
        fetchStudentQuota();
        setTimeout(() => {
          setIsBorrowModalOpen(false);
          setBorrowSuccessMsg(null);
        }, 2500);
      }
    } catch (err: any) {
      setBorrowErrorMsg(err?.message || "Failed to submit borrow request.");
    } finally {
      setIsSubmittingBorrow(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center py-20">
        <RefreshCw className="h-8 w-8 text-slate-400 animate-spin mb-3" />
        <p className="text-sm font-bold text-slate-500">Loading book spatial blueprint and details...</p>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4">
        <div className="rounded-3xl bg-white border border-slate-200/80 p-8 max-w-md w-full text-center shadow-xs">
          <AlertCircle className="h-10 w-10 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900">{error || "Book not found"}</h2>
          <p className="text-xs text-slate-500 mt-1 mb-6">
            The book you are looking for might have been moved or deactivated.
          </p>
          <Link
            href="/books"
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800"
          >
            Back to Catalog
          </Link>
        </div>
      </div>
    );
  }

  const inStock = book.availableCopies > 0;

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-900 pb-20">
      {/* ── Top Bar ── */}
      <div className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <Link
            href="/books"
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 hover:bg-slate-200/80 px-3.5 py-1.5 text-xs font-bold text-slate-700 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Books Catalog</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-slate-900/5 border border-slate-200/80 px-3 py-1 text-xs font-extrabold text-slate-700">
              {book.category}
            </span>
          </div>
        </div>
      </div>

      {/* ── Main Detail Content ── */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* ── Left Column: Book Cover & Quick Status (4 Cols) ── */}
          <div className="lg:col-span-4 space-y-6">
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xs">
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 mb-6 border border-slate-200/60 flex items-center justify-center shadow-inner">
                {book.coverImage ? (
                  <img
                    src={book.coverImage}
                    alt={book.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="text-center p-6">
                    <BookOpen className="h-16 w-16 text-slate-300 mx-auto mb-3" />
                    <span className="text-sm font-bold text-slate-500">{book.title}</span>
                  </div>
                )}

                {book.pdfUrl && (
                  <div className="absolute top-3 right-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-3 py-1 text-xs font-extrabold text-white shadow-md">
                      <FileText className="h-3.5 w-3.5" />
                      <span>Digital PDF</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Stock Status Pill */}
              <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                    Physical Stock
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-extrabold ${
                      inStock
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        inStock ? "bg-emerald-500" : "bg-amber-500"
                      }`}
                    />
                    <span>{inStock ? "In Stock" : "Currently Checked Out"}</span>
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs font-semibold text-slate-600 pt-1 border-t border-slate-200/60">
                  <span>Available Copies:</span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    {book.availableCopies} of {book.totalCopies}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 space-y-2.5">
                <button
                  onClick={() => {
                    if (!isAuthenticated) {
                      router.push(`/auth/login?redirect=/books/${book.id}`);
                      return;
                    }
                    setIsBorrowModalOpen(true);
                  }}
                  disabled={!inStock}
                  className={`w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-extrabold shadow-sm transition-all ${
                    inStock
                      ? "bg-slate-900 text-white hover:bg-slate-800"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  <BookOpen className="h-4 w-4" />
                  <span>{inStock ? "Request 10-Day Borrow" : "All Copies on Loan"}</span>
                </button>

                {book.pdfUrl && (
                  <a
                    href={book.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 py-3 text-sm font-extrabold transition-colors shadow-2xs"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download / Read PDF Copy</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* ── Right Column: Metadata & Interactive Spatial Shelf Locator (8 Cols) ── */}
          <div className="lg:col-span-8 space-y-6">

            {/* Book Info Header */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-2xs">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="rounded-full bg-indigo-50 border border-indigo-200/80 px-3 py-0.5 text-xs font-extrabold text-indigo-700">
                  {book.category}
                </span>
                {book.edition && (
                  <span className="rounded-full bg-slate-100 border border-slate-200/80 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                    {book.edition} Edition
                  </span>
                )}
                {book.publicationYear && (
                  <span className="rounded-full bg-slate-100 border border-slate-200/80 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                    Year {book.publicationYear}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                {book.title}
              </h1>
              <p className="text-base font-bold text-slate-600 mt-2">
                Written by <span className="text-slate-900">{book.author}</span>
              </p>

              {/* Bibliographic Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-6 pt-6 border-t border-slate-100">
                <div className="rounded-2xl bg-slate-50 p-3 border border-slate-100">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    ISBN
                  </div>
                  <div className="text-xs font-bold text-slate-900 mt-0.5 truncate">
                    {book.isbn || "N/A"}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-3 border border-slate-100">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Call Number
                  </div>
                  <div className="text-xs font-bold font-mono text-indigo-600 mt-0.5 truncate">
                    {book.callNumber || "N/A"}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-3 border border-slate-100">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Publisher
                  </div>
                  <div className="text-xs font-bold text-slate-900 mt-0.5 truncate">
                    {book.publisher || "General Press"}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-3 border border-slate-100">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Loan Term
                  </div>
                  <div className="text-xs font-bold text-slate-900 mt-0.5">
                    10 Days (3x Renew)
                  </div>
                </div>
              </div>

              {/* Synopsis */}
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                  Synopsis & Subject Coverage
                </h3>
                <p className="text-sm leading-relaxed text-slate-600 font-medium">
                  {book.description ||
                    "This authoritative academic volume provides foundational theoretical insights, rigorous algorithmic formulations, and practical design patterns for university students, researchers, and faculty."}
                </p>
              </div>
            </div>

            {/* ── Interactive Physical Shelf Locator Card ── */}
            <div className="rounded-3xl border border-indigo-200/80 bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300">
                      <Compass className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                        <span>Physical Shelf Locator</span>
                        <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-extrabold">
                          Live Coordinates
                        </span>
                      </h2>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Follow these exact coordinates to locate this volume in the physical library.
                      </p>
                    </div>
                  </div>

                  {/* Target Coordinates Tag */}
                  <div className="inline-flex items-center gap-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 px-4 py-2 text-xs font-extrabold text-white">
                    <MapPin className="h-4 w-4 text-emerald-400 animate-pulse" />
                    <span>
                      {book.block} • {book.shelfNumber} {book.rowNumber ? `• ${book.rowNumber}` : ""}
                    </span>
                  </div>
                </div>

                {/* Graphical Library Floor & Shelf Blueprint */}
                <div className="my-6 rounded-2xl bg-slate-950/60 border border-white/10 p-5">
                  <div className="text-xs font-bold text-slate-400 mb-3 flex items-center justify-between">
                    <span>Library Stacks Layout Diagram</span>
                    <span className="text-[10px] text-emerald-400 font-mono">
                      Target Rack: {book.shelfNumber}
                    </span>
                  </div>

                  {/* Blocks Grid Representation */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {["Block A", "Block B", "Block C", "Block D"].map((blk) => {
                      const isCurrentBlock = book.block.toLowerCase().includes(blk.toLowerCase().slice(-1));

                      return (
                        <div
                          key={blk}
                          className={`rounded-2xl p-3.5 border transition-all ${
                            isCurrentBlock
                              ? "bg-indigo-600/30 border-indigo-400/80 ring-2 ring-indigo-400/30 text-white"
                              : "bg-white/5 border-white/10 text-slate-400 opacity-60"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-black">{blk}</span>
                            {isCurrentBlock && (
                              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                            )}
                          </div>

                          {/* Mini Shelves */}
                          <div className="grid grid-cols-3 gap-1.5">
                            {[1, 2, 3, 4, 5, 6].map((num) => {
                              const shelfStr = `Shelf 0${num}`;
                              const isTargetShelf = isCurrentBlock && book.shelfNumber.includes(`${num}`);

                              return (
                                <div
                                  key={num}
                                  className={`h-7 rounded-lg text-[9px] font-extrabold flex items-center justify-center border transition-all ${
                                    isTargetShelf
                                      ? "bg-emerald-500 text-slate-950 border-emerald-300 font-black shadow-xs scale-105"
                                      : "bg-white/10 border-white/5 text-slate-400"
                                  }`}
                                >
                                  {isTargetShelf ? `★ S${num}` : `S${num}`}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Spatial Guidance Notes */}
                  <div className="mt-4 pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-300 gap-2">
                    <div className="flex items-center gap-2">
                      <Navigation className="h-3.5 w-3.5 text-indigo-400" />
                      <span>
                        Navigate to <strong>{book.block}</strong>, enter aisle for <strong>{book.shelfNumber}</strong>, inspect <strong>{book.rowNumber || "standard level"}</strong>.
                      </span>
                    </div>
                    {book.callNumber && (
                      <span className="font-mono text-[11px] bg-white/10 rounded-lg px-2 py-0.5 text-indigo-300">
                        {book.callNumber}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Borrow Modal ── */}
      {isBorrowModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Request to Borrow Book
                </h3>
                <p className="text-xs text-slate-500">
                  10-day borrow window with up to 3 renewals
                </p>
              </div>
            </div>

            {borrowSuccessMsg ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-2 animate-bounce" />
                <h4 className="text-base font-extrabold text-slate-900">Request Confirmed!</h4>
                <p className="text-xs text-slate-600 mt-1 max-w-xs mx-auto">
                  {borrowSuccessMsg}
                </p>
              </div>
            ) : (
              <div className="py-4 space-y-4">
                <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200/80">
                  <div className="font-extrabold text-sm text-slate-900">{book.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5">By {book.author}</div>
                  <div className="mt-2.5 flex items-center gap-2 text-xs font-bold text-indigo-700 bg-indigo-50/80 rounded-xl px-2.5 py-1.5 border border-indigo-100">
                    <MapPin className="h-3.5 w-3.5 text-indigo-600" />
                    <span>
                      {book.block} • {book.shelfNumber} {book.rowNumber ? `• ${book.rowNumber}` : ""}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl bg-amber-50/80 border border-amber-200/70 p-3 text-xs text-amber-800 space-y-1">
                  <div className="font-extrabold flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-amber-600" />
                    <span>Circulation Rules:</span>
                  </div>
                  <ul className="list-disc list-inside text-[11px] font-semibold text-amber-700 space-y-0.5">
                    <li>1 borrow period is <strong>10 days</strong>.</li>
                    <li>Students can borrow at most <strong>3 books</strong> concurrently.</li>
                    <li>Online renewal available up to <strong>3 times</strong>.</li>
                  </ul>
                </div>

                {borrowErrorMsg && (
                  <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-bold text-rose-700">
                    {borrowErrorMsg}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Student Note (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. FYDP Thesis literature reference"
                    value={borrowNotes}
                    onChange={(e) => setBorrowNotes(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
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
                    className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition-colors disabled:opacity-50"
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
