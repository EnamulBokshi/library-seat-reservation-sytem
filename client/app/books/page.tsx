"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { bookService } from "@/services/book-service";
import { loanService } from "@/services/loan-service";
import { Book, BookLoan, StudentLoanSummary } from "@/lib/types";
import {
  Search,
  BookOpen,
  MapPin,
  FileText,
  CheckCircle2,
  AlertCircle,
  Download,
  Filter,
  Bookmark,
  Layers,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Info,
  Clock,
} from "lucide-react";

export default function BooksCatalogPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [spatialIndex, setSpatialIndex] = useState<{ blocks: string[]; shelves: string[] }>({
    blocks: [],
    shelves: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedBlock, setSelectedBlock] = useState("All");
  const [hasPdfOnly, setHasPdfOnly] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [myBorrowedOnly, setMyBorrowedOnly] = useState(false);

  // Student Quota
  const [studentSummary, setStudentSummary] = useState<StudentLoanSummary | null>(null);

  // Map of student's active loans & requests by bookId
  const userLoanMap = useMemo(() => {
    const map = new Map<string, BookLoan>();
    if (!studentSummary) return map;
    studentSummary.activeLoans?.forEach((loan) => {
      map.set(loan.bookId, loan);
    });
    studentSummary.pendingRequests?.forEach((loan) => {
      if (!map.has(loan.bookId)) {
        map.set(loan.bookId, loan);
      }
    });
    return map;
  }, [studentSummary]);

  // Borrow Modal State
  const [borrowModalBook, setBorrowModalBook] = useState<Book | null>(null);
  const [borrowNotes, setBorrowNotes] = useState("");
  const [isSubmittingBorrow, setIsSubmittingBorrow] = useState(false);
  const [borrowSuccessMsg, setBorrowSuccessMsg] = useState<string | null>(null);
  const [borrowErrorMsg, setBorrowErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchInitialData();
    if (isAuthenticated) {
      fetchStudentQuota();
    }
  }, [isAuthenticated]);

  const fetchInitialData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [booksRes, catsRes, spatialRes] = await Promise.all([
        bookService.getAll({ limit: 100 }),
        bookService.getCategories(),
        bookService.getSpatialIndex(),
      ]);

      if (booksRes.success && booksRes.data) {
        setBooks(booksRes.data);
      }
      if (catsRes.success && catsRes.data) {
        setCategories(["All", ...catsRes.data]);
      }
      if (spatialRes.success && spatialRes.data) {
        setSpatialIndex(spatialRes.data);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load library books catalog.");
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

  // Filtered Books Memo
  const filteredBooks = useMemo(() => {
    return books.filter((book) => {
      // Search
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matches =
          book.title.toLowerCase().includes(query) ||
          book.author.toLowerCase().includes(query) ||
          (book.isbn && book.isbn.toLowerCase().includes(query)) ||
          (book.callNumber && book.callNumber.toLowerCase().includes(query)) ||
          (book.barcode && book.barcode.toLowerCase().includes(query)) ||
          book.category.toLowerCase().includes(query);
        if (!matches) return false;
      }

      // Category
      if (selectedCategory !== "All" && book.category !== selectedCategory) {
        return false;
      }

      // Block
      if (selectedBlock !== "All" && book.block !== selectedBlock) {
        return false;
      }

      // PDF
      if (hasPdfOnly && !book.pdfUrl) {
        return false;
      }

      // In Stock
      if (inStockOnly && book.availableCopies <= 0) {
        return false;
      }

      // My Borrowed Only
      if (myBorrowedOnly && !userLoanMap.has(book.id)) {
        return false;
      }

      return true;
    });
  }, [books, searchTerm, selectedCategory, selectedBlock, hasPdfOnly, inStockOnly, myBorrowedOnly, userLoanMap]);

  const handleOpenBorrowModal = (book: Book) => {
    if (!isAuthenticated) {
      router.push("/auth/login?redirect=/books");
      return;
    }
    setBorrowModalBook(book);
    setBorrowNotes("");
    setBorrowSuccessMsg(null);
    setBorrowErrorMsg(null);
  };

  const handleConfirmBorrow = async () => {
    if (!borrowModalBook) return;

    try {
      setIsSubmittingBorrow(true);
      setBorrowErrorMsg(null);
      const res = await loanService.requestBorrow(borrowModalBook.id, borrowNotes);

      if (res.success) {
        setBorrowSuccessMsg(
          `Request submitted! You have 10 days once picked up. Please collect "${borrowModalBook.title}" from the circulation desk.`
        );
        fetchInitialData();
        fetchStudentQuota();
        setTimeout(() => {
          setBorrowModalBook(null);
          setBorrowSuccessMsg(null);
        }, 2500);
      }
    } catch (err: any) {
      setBorrowErrorMsg(err?.message || "Failed to submit borrow request.");
    } finally {
      setIsSubmittingBorrow(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-900 pb-20">
      {/* ── Top Hero Banner ── */}
      <div className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 border border-indigo-200/60 px-3 py-1 text-xs font-bold text-indigo-700 mb-3">
                <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                <span>Smart Library Spatial Catalog</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
                Discover Books & Shelf Locations
              </h1>
              <p className="mt-2 text-sm sm:text-base text-slate-500 max-w-2xl">
                Explore available physical volumes with exact block and shelf positioning, read digital PDF copies, and request 10-day borrowings with online renewals.
              </p>
            </div>

            {/* Student Quota Capsule */}
            {isAuthenticated && studentSummary && (
              <div className="flex items-center gap-4 bg-slate-50 border border-slate-200/80 rounded-2xl p-4 shadow-2xs shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white font-black text-base shadow-xs">
                  {studentSummary.quota.currentlyBorrowed}/3
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Your Borrow Quota
                  </div>
                  <div className="text-sm font-extrabold text-slate-800">
                    {studentSummary.quota.availableQuota} Books Available to Borrow
                  </div>
                  <Link
                    href="/loans"
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 mt-0.5"
                  >
                    <span>View My Loans ({studentSummary.activeLoans.length})</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* ── Search Bar ── */}
          <div className="mt-8 relative">
            <div className="relative flex items-center">
              <Search className="absolute left-4 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by book title, author, ISBN, call number, or topic..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-2xl border border-slate-300/80 bg-white py-3.5 pl-12 pr-4 text-sm font-semibold text-slate-900 shadow-xs placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-4 text-xs font-bold text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full px-2.5 py-1 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* ── Category Pills & Filters ── */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            {/* Categories */}
            <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                    selectedCategory === cat
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Filter Dropdowns & Toggles */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
              {/* Block Filter */}
              <div className="flex items-center gap-1 bg-white border border-slate-200/80 rounded-xl px-2.5 py-1.5 shadow-2xs">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={selectedBlock}
                  onChange={(e) => setSelectedBlock(e.target.value)}
                  className="bg-transparent text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="All">All Blocks</option>
                  {spatialIndex.blocks.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              {/* Digital PDF Toggle */}
              <button
                onClick={() => setHasPdfOnly(!hasPdfOnly)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 border transition-all ${
                  hasPdfOnly
                    ? "bg-rose-50 border-rose-200 text-rose-700 font-extrabold shadow-2xs"
                    : "bg-white border-slate-200/80 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <FileText className="h-3.5 w-3.5 text-rose-500" />
                <span>PDF Available</span>
              </button>

              {/* In Stock Toggle */}
              <button
                onClick={() => setInStockOnly(!inStockOnly)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 border transition-all ${
                  inStockOnly
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700 font-extrabold shadow-2xs"
                    : "bg-white border-slate-200/80 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>In Stock Only</span>
              </button>

              {/* My Borrowed / Active Loans Toggle (Student Only) */}
              {isAuthenticated && userLoanMap.size > 0 && (
                <button
                  onClick={() => setMyBorrowedOnly(!myBorrowedOnly)}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 border transition-all ${
                    myBorrowedOnly
                      ? "bg-indigo-600 border-indigo-700 text-white font-extrabold shadow-2xs"
                      : "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                  }`}
                >
                  <Bookmark className="h-3.5 w-3.5 fill-current" />
                  <span>My Borrowed Books ({userLoanMap.size})</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Catalog Grid ── */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <RefreshCw className="h-8 w-8 text-slate-400 animate-spin mb-3" />
            <p className="text-sm font-bold text-slate-500">Loading library book catalog...</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-rose-50 border border-rose-200 p-6 text-center text-rose-700 my-8">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-rose-500" />
            <p className="font-bold">{error}</p>
            <button
              onClick={fetchInitialData}
              className="mt-3 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700"
            >
              Try Again
            </button>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="rounded-3xl bg-white border border-slate-200/80 p-12 text-center my-8 shadow-2xs">
            <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900">No books found matching your filters</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Try adjusting your search terms, changing the category, or clearing the availability filters.
            </p>
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedCategory("All");
                setSelectedBlock("All");
                setHasPdfOnly(false);
                setInStockOnly(false);
                setMyBorrowedOnly(false);
              }}
              className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-6">
              <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                Showing {filteredBooks.length} {filteredBooks.length === 1 ? "Book" : "Books"}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredBooks.map((book) => {
                const inStock = book.availableCopies > 0;
                const userLoan = userLoanMap.get(book.id);
                const isBorrowedByMe = userLoan?.status === "issued" || userLoan?.status === "overdue";
                const isRequestedByMe = userLoan?.status === "requested";

                return (
                  <div
                    key={book.id}
                    className={`group relative flex flex-col justify-between rounded-3xl border bg-white p-5 shadow-2xs hover:shadow-md transition-all duration-200 ${
                      isBorrowedByMe
                        ? "border-indigo-300 ring-2 ring-indigo-500/20"
                        : isRequestedByMe
                        ? "border-amber-300 ring-2 ring-amber-500/20"
                        : "border-slate-200/80 hover:border-slate-300"
                    }`}
                  >
                    <div>
                      {/* Book Cover / Header */}
                      <div className="relative h-48 w-full overflow-hidden rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 mb-4 border border-slate-200/60 flex items-center justify-center">
                        {book.coverImage ? (
                          <img
                            src={book.coverImage}
                            alt={book.title}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="text-center p-4">
                            <BookOpen className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                            <span className="text-xs font-bold text-slate-500 line-clamp-2">
                              {book.title}
                            </span>
                          </div>
                        )}

                        {/* Top Left Category Badge */}
                        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5 z-10">
                          <span className="rounded-full bg-slate-900/80 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-extrabold text-white">
                            {book.category}
                          </span>
                        </div>

                        {/* Top Right Status Badges */}
                        <div className="absolute top-2.5 right-2.5 flex flex-col items-end gap-1 z-10">
                          {isBorrowedByMe ? (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black shadow-md ${
                                userLoan.status === "overdue"
                                  ? "bg-rose-600 text-white animate-pulse"
                                  : "bg-indigo-600 text-white"
                              }`}
                            >
                              <Bookmark className="h-3 w-3 fill-current" />
                              <span>{userLoan.status === "overdue" ? "Overdue" : "Borrowed by You"}</span>
                            </span>
                          ) : isRequestedByMe ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 text-white px-2.5 py-0.5 text-[10px] font-black shadow-md">
                              <Clock className="h-3 w-3" />
                              <span>Requested</span>
                            </span>
                          ) : null}

                          {book.pdfUrl && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-600/90 backdrop-blur-md px-2 py-0.5 text-[10px] font-extrabold text-white shadow-xs">
                              <FileText className="h-3 w-3" />
                              <span>PDF</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Book Title & Author */}
                      <Link href={`/books/${book.id}`} className="block group-hover:text-indigo-600 transition-colors">
                        <h3 className="text-base font-extrabold tracking-tight text-slate-900 line-clamp-2 leading-snug">
                          {book.title}
                        </h3>
                      </Link>
                      <p className="text-xs font-semibold text-slate-500 mt-1 line-clamp-1">
                        By {book.author}
                      </p>

                      {/* Active Borrow / Request Ribbon for student */}
                      {isBorrowedByMe ? (
                        <div className="mt-2.5 rounded-xl bg-indigo-50 border border-indigo-200/80 p-2 text-xs font-bold text-indigo-900 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Bookmark className="h-3.5 w-3.5 text-indigo-600 fill-current" />
                            <span>{userLoan.status === "overdue" ? "Late Return Due" : "Active Loan"}</span>
                          </span>
                          <span className="text-[11px] font-mono text-indigo-700">
                            Due: {new Date(userLoan.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        </div>
                      ) : isRequestedByMe ? (
                        <div className="mt-2.5 rounded-xl bg-amber-50 border border-amber-200/80 p-2 text-xs font-bold text-amber-900 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-amber-600" />
                            <span>Pickup Pending</span>
                          </span>
                          <span className="text-[10px] text-amber-700">Awaiting Desk</span>
                        </div>
                      ) : null}

                      {/* 📍 Spatial Physical Location Tag (Block, Shelf, Row) */}
                      <div className="mt-2.5 rounded-2xl bg-slate-50 border border-slate-200/70 p-2.5">
                        <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-700">
                          <MapPin className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                          <span className="truncate">
                            {book.block} • {book.shelfNumber} {book.rowNumber ? `• ${book.rowNumber}` : ""}
                          </span>
                        </div>
                        {book.callNumber && (
                          <div className="text-[10px] font-bold font-mono text-slate-400 mt-0.5 pl-5">
                            {book.callNumber}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer Status & Actions */}
                    <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-2.5">
                      <div className="flex items-center justify-between">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-bold ${
                            inStock ? "text-emerald-600" : "text-amber-600"
                          }`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              inStock ? "bg-emerald-500" : "bg-amber-500"
                            }`}
                          />
                          <span>
                            {inStock ? `${book.availableCopies} of ${book.totalCopies} Available` : "Checked Out"}
                          </span>
                        </span>

                        {book.pdfUrl && (
                          <a
                            href={book.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-800 hover:underline"
                          >
                            <Download className="h-3 w-3" />
                            <span>Download</span>
                          </a>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <Link
                          href={`/books/${book.id}`}
                          className="flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 px-3 py-2 text-xs font-bold text-slate-800 transition-colors text-center"
                        >
                          View Map
                        </Link>

                        {isBorrowedByMe ? (
                          <Link
                            href="/loans"
                            className="flex items-center justify-center gap-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 text-xs font-extrabold transition-all text-center shadow-xs"
                          >
                            <Bookmark className="h-3.5 w-3.5 fill-current" />
                            <span>My Loan</span>
                          </Link>
                        ) : isRequestedByMe ? (
                          <Link
                            href="/loans"
                            className="flex items-center justify-center gap-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 text-xs font-extrabold transition-all text-center shadow-xs"
                          >
                            <Clock className="h-3.5 w-3.5" />
                            <span>Requested</span>
                          </Link>
                        ) : (
                          <button
                            onClick={() => handleOpenBorrowModal(book)}
                            disabled={!inStock}
                            className={`flex items-center justify-center rounded-xl px-3 py-2 text-xs font-bold transition-all text-center ${
                              inStock
                                ? "bg-slate-900 text-white hover:bg-slate-800 shadow-xs"
                                : "bg-slate-100 text-slate-400 cursor-not-allowed"
                            }`}
                          >
                            {inStock ? "Borrow" : "Unavailable"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* ── Borrow Confirmation Modal ── */}
      {borrowModalBook && (
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
                  10-day borrowing duration with up to 3 renewals
                </p>
              </div>
            </div>

            {borrowSuccessMsg ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-2 animate-bounce" />
                <h4 className="text-base font-extrabold text-slate-900">Request Successful!</h4>
                <p className="text-xs text-slate-600 mt-1 max-w-xs mx-auto">
                  {borrowSuccessMsg}
                </p>
              </div>
            ) : (
              <div className="py-4 space-y-4">
                {/* Book Mini Card */}
                <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200/80">
                  <div className="font-extrabold text-sm text-slate-900">{borrowModalBook.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5">By {borrowModalBook.author}</div>
                  <div className="mt-2.5 flex items-center gap-2 text-xs font-bold text-indigo-700 bg-indigo-50/80 rounded-xl px-2.5 py-1.5 border border-indigo-100">
                    <MapPin className="h-3.5 w-3.5 text-indigo-600" />
                    <span>
                      Location: {borrowModalBook.block} • {borrowModalBook.shelfNumber} {borrowModalBook.rowNumber ? `• ${borrowModalBook.rowNumber}` : ""}
                    </span>
                  </div>
                </div>

                {/* Policy Notice */}
                <div className="rounded-2xl bg-amber-50/80 border border-amber-200/70 p-3 text-xs text-amber-800 space-y-1">
                  <div className="font-extrabold flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-amber-600" />
                    <span>Borrowing Terms:</span>
                  </div>
                  <ul className="list-disc list-inside text-[11px] font-semibold text-amber-700 space-y-0.5">
                    <li>Standard loan duration: <strong>10 days</strong>.</li>
                    <li>Students may borrow up to <strong>3 books</strong> simultaneously.</li>
                    <li>Eligible for up to <strong>3 renewals</strong> before return.</li>
                  </ul>
                </div>

                {borrowErrorMsg && (
                  <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-bold text-rose-700">
                    {borrowErrorMsg}
                  </div>
                )}

                {/* Optional Note Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Student Note (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. For FYDP thesis research reference"
                    value={borrowNotes}
                    onChange={(e) => setBorrowNotes(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setBorrowModalBook(null)}
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
                    <span>Confirm Borrow Request</span>
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
