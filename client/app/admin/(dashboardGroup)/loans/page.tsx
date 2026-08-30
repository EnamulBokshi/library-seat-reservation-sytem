"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { loanService } from "@/services/loan-service";
import { bookService } from "@/services/book-service";
import {
  BookLoan,
  CirculationStats,
  Book,
  LoanStatus,
  StudentLookupResult,
  PaymentMethod,
} from "@/lib/types";
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
  Barcode,
  DollarSign,
  Receipt,
  CreditCard,
  Building,
  Sparkles,
  AlertCircle,
  ScanLine,
} from "lucide-react";

export default function AdminCirculationPage() {
  const [loans, setLoans] = useState<BookLoan[]>([]);
  const [stats, setStats] = useState<CirculationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active View Tab
  const [activeTab, setActiveTab] = useState<"desk" | "requests" | "active" | "overdue" | "fines" | "returned">("desk");
  const [searchTerm, setSearchTerm] = useState("");

  // ─── Rapid Barcode Desk State ──────────────────────────────────────────────
  const [scannedBookInput, setScannedBookInput] = useState("");
  const [scannedStudentInput, setScannedStudentInput] = useState("");
  const [deskBook, setDeskBook] = useState<Book | null>(null);
  const [deskStudent, setDeskStudent] = useState<StudentLookupResult | null>(null);
  const [isLookingUpBook, setIsLookingUpBook] = useState(false);
  const [isLookingUpStudent, setIsLookingUpStudent] = useState(false);
  const [deskError, setDeskError] = useState<string | null>(null);
  const [deskSuccess, setDeskSuccess] = useState<string | null>(null);
  const [isIssuingFromDesk, setIsIssuingFromDesk] = useState(false);

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const studentInputRef = useRef<HTMLInputElement>(null);

  // ─── Fine Settlement Modal State ───────────────────────────────────────────
  const [fineModalLoan, setFineModalLoan] = useState<BookLoan | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [chalanNumber, setChalanNumber] = useState("");
  const [fineNotes, setFineNotes] = useState("");
  const [isSettlingFine, setIsSettlingFine] = useState(false);
  const [fineModalError, setFineModalError] = useState<string | null>(null);
  const [fineModalSuccess, setFineModalSuccess] = useState<string | null>(null);

  // ─── Direct Issue Modal State (Alternative Form) ───────────────────────────
  const [isDirectIssueOpen, setIsDirectIssueOpen] = useState(false);
  const [availableBooks, setAvailableBooks] = useState<Book[]>([]);
  const [selectedBookIdentifier, setSelectedBookIdentifier] = useState("");
  const [directStudentIdentifier, setDirectStudentIdentifier] = useState("");
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

  // ─── Desk Barcode Lookup Handlers ──────────────────────────────────────────

  const handleLookupBook = async () => {
    if (!scannedBookInput.trim()) return;
    try {
      setIsLookingUpBook(true);
      setDeskError(null);
      const res = await loanService.lookupBook(scannedBookInput.trim());
      if (res.success && res.data) {
        setDeskBook(res.data);
        if (studentInputRef.current) {
          studentInputRef.current.focus();
        }
      }
    } catch (err: any) {
      setDeskBook(null);
      setDeskError(err?.message || "Book not found. Please check the barcode or ISBN.");
    } finally {
      setIsLookingUpBook(false);
    }
  };

  const handleLookupStudent = async () => {
    if (!scannedStudentInput.trim()) return;
    try {
      setIsLookingUpStudent(true);
      setDeskError(null);
      const res = await loanService.lookupStudent(scannedStudentInput.trim());
      if (res.success && res.data) {
        setDeskStudent(res.data);
      }
    } catch (err: any) {
      setDeskStudent(null);
      setDeskError(err?.message || "Student not found with this ID or email.");
    } finally {
      setIsLookingUpStudent(false);
    }
  };

  const handleDeskDirectIssue = async () => {
    if (!deskBook || !deskStudent) return;
    try {
      setIsIssuingFromDesk(true);
      setDeskError(null);
      setDeskSuccess(null);

      const res = await loanService.directIssue({
        bookIdentifier: deskBook.barcode || deskBook.isbn || deskBook.id,
        studentIdentifier: deskStudent.student.studentId || deskStudent.student.email,
        notes: "Issued via Rapid Barcode Circulation Desk",
      });

      if (res.success) {
        setDeskSuccess(`✅ Book "${deskBook.title}" successfully issued to ${deskStudent.student.name}! Loan confirmation email dispatched.`);
        // Reset desk
        setDeskBook(null);
        setDeskStudent(null);
        setScannedBookInput("");
        setScannedStudentInput("");
        fetchCirculationData();
        if (barcodeInputRef.current) {
          barcodeInputRef.current.focus();
        }
      }
    } catch (err: any) {
      setDeskError(err?.message || "Failed to complete book issue.");
    } finally {
      setIsIssuingFromDesk(false);
    }
  };

  const handleResetDesk = () => {
    setDeskBook(null);
    setDeskStudent(null);
    setScannedBookInput("");
    setScannedStudentInput("");
    setDeskError(null);
    setDeskSuccess(null);
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  };

  // ─── Status Update Handlers ────────────────────────────────────────────────

  const handleApproveRequest = async (loanId: string) => {
    try {
      setProcessingLoanId(loanId);
      setActionFeedback(null);
      const res = await loanService.updateStatus(loanId, "issued", "Approved and issued at circulation desk");
      if (res.success) {
        setActionFeedback("✅ Request approved and book loan issued. Confirmation email sent!");
        fetchCirculationData();
      }
    } catch (err: any) {
      setActionFeedback(`❌ Error: ${err?.message || "Failed to approve request."}`);
    } finally {
      setProcessingLoanId(null);
    }
  };

  const handleRejectRequest = async (loanId: string) => {
    try {
      setProcessingLoanId(loanId);
      setActionFeedback(null);
      const res = await loanService.updateStatus(loanId, "rejected", "Rejected by librarian");
      if (res.success) {
        setActionFeedback("Request rejected.");
        fetchCirculationData();
      }
    } catch (err: any) {
      setActionFeedback(`❌ Error: ${err?.message || "Failed to reject request."}`);
    } finally {
      setProcessingLoanId(null);
    }
  };

  const handleReturnBook = async (loanId: string) => {
    try {
      setProcessingLoanId(loanId);
      setActionFeedback(null);
      const res = await loanService.returnBook(loanId);
      if (res.success && res.data) {
        if (res.data.fineAmount > 0) {
          setActionFeedback(`⚠️ Book returned with ${res.data.daysOverdue} days overdue. Fine of ${res.data.fineAmount} BDT recorded.`);
          // Open fine settlement modal automatically
          setFineModalLoan(res.data.loan);
          setPaymentMethod("cash");
          setChalanNumber("");
          setFineNotes("");
          setFineModalError(null);
          setFineModalSuccess(null);
        } else {
          setActionFeedback("✅ Book marked as returned and inventory restored.");
        }
        fetchCirculationData();
      }
    } catch (err: any) {
      setActionFeedback(`❌ Error: ${err?.message || "Failed to return book."}`);
    } finally {
      setProcessingLoanId(null);
    }
  };

  // ─── Fine Settlement Modal Handlers ────────────────────────────────────────

  const handleOpenFineModal = (loan: BookLoan) => {
    setFineModalLoan(loan);
    setPaymentMethod("cash");
    setChalanNumber("");
    setFineNotes("");
    setFineModalError(null);
    setFineModalSuccess(null);
  };

  const handleConfirmFinePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fineModalLoan) return;

    try {
      setIsSettlingFine(true);
      setFineModalError(null);
      setFineModalSuccess(null);

      const res = await loanService.payFine(fineModalLoan.id, {
        paymentMethod,
        chalanNumber: paymentMethod === "chalan" ? chalanNumber : undefined,
        notes: fineNotes || undefined,
      });

      if (res.success) {
        setFineModalSuccess(`✅ Fine of ${fineModalLoan.fineAmount} BDT marked as PAID via ${paymentMethod.toUpperCase()}. Student borrowing privileges restored!`);
        fetchCirculationData();
        setTimeout(() => {
          setFineModalLoan(null);
          setFineModalSuccess(null);
        }, 2200);
      }
    } catch (err: any) {
      setFineModalError(err?.message || "Failed to record fine payment.");
    } finally {
      setIsSettlingFine(false);
    }
  };

  // ─── Tab Counts & Filtered Lists ───────────────────────────────────────────

  const pendingRequests = loans.filter((l) => l.status === "requested");
  const activeLoans = loans.filter((l) => l.status === "issued");
  const overdueLoans = loans.filter((l) => l.status === "overdue");
  const returnedLoans = loans.filter((l) => l.status === "returned");
  const unpaidFinesList = loans.filter((l) => l.fineStatus === "unpaid" && l.fineAmount > 0);

  const getFilteredLoans = () => {
    let list: BookLoan[] = [];
    if (activeTab === "requests") list = pendingRequests;
    else if (activeTab === "active") list = activeLoans;
    else if (activeTab === "overdue") list = overdueLoans;
    else if (activeTab === "fines") list = unpaidFinesList;
    else if (activeTab === "returned") list = returnedLoans;
    else list = loans;

    if (!searchTerm.trim()) return list;
    const q = searchTerm.toLowerCase();
    return list.filter(
      (l) =>
        l.book?.title.toLowerCase().includes(q) ||
        l.book?.author.toLowerCase().includes(q) ||
        (l.book?.barcode && l.book.barcode.toLowerCase().includes(q)) ||
        (l.book?.isbn && l.book.isbn.toLowerCase().includes(q)) ||
        l.user?.name.toLowerCase().includes(q) ||
        l.user?.email.toLowerCase().includes(q) ||
        (l.user?.studentId && l.user.studentId.toLowerCase().includes(q)) ||
        (l.chalanNumber && l.chalanNumber.toLowerCase().includes(q))
    );
  };

  const filteredLoans = getFilteredLoans();

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-900 pb-20">
      {/* ── Top Header ── */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 mb-2">
                <ScanLine className="w-3.5 h-3.5" />
                Smart Library Circulation Hub
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Circulation Desk & Fine Manager
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Rapid barcode scanning, instant checkout, overdue fine collection (Cash/Chalan), and automated notifications.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setActiveTab("desk")}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all ${
                  activeTab === "desk"
                    ? "bg-indigo-600 text-white shadow-indigo-200 ring-2 ring-indigo-600 ring-offset-2"
                    : "bg-slate-900 text-white hover:bg-slate-800"
                }`}
              >
                <Barcode className="w-4 h-4" />
                Barcode Scanner Desk
              </button>

              <button
                onClick={fetchCirculationData}
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl transition-all shadow-sm"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-indigo-600" : ""}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* ── Live Statistics KPI Cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mt-6">
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Loans</span>
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                  <BookOpen className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">{stats?.activeLoans ?? activeLoans.length}</div>
              <div className="text-xs font-semibold text-blue-600 mt-1">Currently checked out</div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Borrow Requests</span>
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">{stats?.pendingRequests ?? pendingRequests.length}</div>
              <div className="text-xs font-semibold text-amber-600 mt-1">Awaiting desk approval</div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Overdue Books</span>
                <div className="w-8 h-8 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-red-600 mt-2">{stats?.overdueLoans ?? overdueLoans.length}</div>
              <div className="text-xs font-semibold text-red-600 mt-1">Fine accumulating</div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Fines Collected</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-600 mt-2">{stats?.totalFinesCollected ?? 0} <span className="text-sm font-bold text-emerald-700">BDT</span></div>
              <div className="text-xs font-semibold text-emerald-600 mt-1">Cash & Chalan verified</div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Unpaid Dues</span>
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-rose-600 mt-2">{stats?.totalOutstandingFines ?? 0} <span className="text-sm font-bold text-rose-700">BDT</span></div>
              <div className="text-xs font-semibold text-rose-600 mt-1">{stats?.unpaidFinesCount ?? unpaidFinesList.length} student(s) locked</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {actionFeedback && (
          <div className="mb-6 p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 font-bold text-sm flex items-center justify-between shadow-sm">
            <span>{actionFeedback}</span>
            <button onClick={() => setActionFeedback(null)} className="text-indigo-600 hover:text-indigo-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Tab Switcher ── */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-slate-200 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab("desk")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                activeTab === "desk"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <Barcode className="w-4 h-4" />
              ⚡ Scanner Desk
            </button>

            <button
              onClick={() => setActiveTab("requests")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                activeTab === "requests"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <Clock className="w-4 h-4" />
              Requests
              {pendingRequests.length > 0 && (
                <span className="px-2 py-0.5 text-xs font-extrabold rounded-full bg-amber-400 text-slate-900">
                  {pendingRequests.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("active")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                activeTab === "active"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Active ({activeLoans.length})
            </button>

            <button
              onClick={() => setActiveTab("overdue")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                activeTab === "overdue"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              Overdue ({overdueLoans.length})
            </button>

            <button
              onClick={() => setActiveTab("fines")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                activeTab === "fines"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <Receipt className="w-4 h-4" />
              Fines & Dues ({unpaidFinesList.length})
            </button>

            <button
              onClick={() => setActiveTab("returned")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                activeTab === "returned"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              Returned History
            </button>
          </div>

          {activeTab !== "desk" && (
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search book, student ID, barcode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* ── 1. RAPID BARCODE CHECKOUT DESK ─────────────────────────────── */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "desk" && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8">
              <div className="flex items-center justify-between border-b border-slate-100 pb-5 mb-6">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                    <Barcode className="w-6 h-6 text-indigo-600" />
                    Librarian Rapid Barcode Terminal
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Scan or type the physical book barcode/ISBN, then scan the student ID card or email.
                  </p>
                </div>
                {(deskBook || deskStudent) && (
                  <button
                    onClick={handleResetDesk}
                    className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 bg-slate-100 rounded-lg hover:bg-slate-200 transition-all"
                  >
                    Reset Terminal
                  </button>
                )}
              </div>

              {deskError && (
                <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Desk Verification Notice:</strong>
                    {deskError}
                  </div>
                </div>
              )}

              {deskSuccess && (
                <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Issue Complete:</strong>
                    {deskSuccess}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* ── Left: Scan Book ── */}
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                      <Barcode className="w-4 h-4 text-indigo-600" />
                      Step 1: Scan Book Barcode
                    </span>
                    {deskBook && (
                      <span className="px-2 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-800 rounded-full">
                        Verified
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2 mb-4">
                    <div className="relative flex-1">
                      <ScanLine className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        ref={barcodeInputRef}
                        type="text"
                        placeholder="Scan or enter Barcode / ISBN / Call #"
                        value={scannedBookInput}
                        onChange={(e) => setScannedBookInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleLookupBook();
                        }}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                      />
                    </div>
                    <button
                      onClick={handleLookupBook}
                      disabled={isLookingUpBook || !scannedBookInput.trim()}
                      className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all shadow-sm"
                    >
                      {isLookingUpBook ? "Searching..." : "Lookup"}
                    </button>
                  </div>

                  {deskBook ? (
                    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-16 bg-slate-100 rounded-lg overflow-hidden shrink-0 border border-slate-200">
                          {deskBook.coverImage ? (
                            <img src={deskBook.coverImage} alt={deskBook.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                              <BookOpen className="w-6 h-6" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-extrabold text-sm text-slate-900 leading-snug line-clamp-2">{deskBook.title}</h4>
                          <p className="text-xs text-slate-500 mt-0.5">By {deskBook.author}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {deskBook.barcode && (
                              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[11px] font-mono font-bold">
                                {deskBook.barcode}
                              </span>
                            )}
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[11px] font-bold">
                              {deskBook.block} • {deskBook.shelfNumber}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                        <span className="text-slate-500 font-medium">Available Inventory:</span>
                        <span className={`font-black ${deskBook.availableCopies > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {deskBook.availableCopies} of {deskBook.totalCopies} copies in stock
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-slate-400 text-xs font-semibold">
                      Use laser barcode scanner or press Enter after typing barcode.
                    </div>
                  )}
                </div>

                {/* ── Right: Scan Student ── */}
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                      <User className="w-4 h-4 text-indigo-600" />
                      Step 2: Scan Student ID Card
                    </span>
                    {deskStudent && (
                      <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                        deskStudent.stats.isEligible ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                      }`}>
                        {deskStudent.stats.isEligible ? "Eligible" : "Suspended"}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2 mb-4">
                    <div className="relative flex-1">
                      <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        ref={studentInputRef}
                        type="text"
                        placeholder="Scan Student ID or enter Email"
                        value={scannedStudentInput}
                        onChange={(e) => setScannedStudentInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleLookupStudent();
                        }}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                      />
                    </div>
                    <button
                      onClick={handleLookupStudent}
                      disabled={isLookingUpStudent || !scannedStudentInput.trim()}
                      className="px-5 py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all shadow-sm"
                    >
                      {isLookingUpStudent ? "Verifying..." : "Verify"}
                    </button>
                  </div>

                  {deskStudent ? (
                    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-extrabold text-sm text-slate-900">{deskStudent.student.name}</h4>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">{deskStudent.student.studentId || deskStudent.student.email}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-slate-500">Quota:</span>
                          <div className="text-sm font-black text-indigo-600">
                            {deskStudent.stats.currentlyBorrowed} / {deskStudent.stats.maxBorrowLimit} Books
                          </div>
                        </div>
                      </div>

                      {/* Unpaid Fine Warning */}
                      {deskStudent.unpaidFines.length > 0 ? (
                        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 font-semibold space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-rose-900 flex items-center gap-1.5">
                              <AlertTriangle className="w-4 h-4 text-rose-600" />
                              Overdue Dues: {deskStudent.stats.totalUnpaidFineBDT} BDT
                            </span>
                            <button
                              onClick={() => handleOpenFineModal(deskStudent.unpaidFines[0])}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[11px] transition-all shadow-sm"
                            >
                              Settle Fine
                            </button>
                          </div>
                          <p className="text-[11px] text-rose-700">
                            Student must pay outstanding dues via Cash or Bank Chalan before borrowing.
                          </p>
                        </div>
                      ) : (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-xs text-emerald-800 font-bold flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Zero outstanding fines. Account clear.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-slate-400 text-xs font-semibold">
                      Scan student badge barcode or type student ID number.
                    </div>
                  )}
                </div>
              </div>

              {/* ── Complete Issue Action Bar ── */}
              <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-500">
                  ⚡ <strong>Auto-Policy:</strong> Issues book for <strong>10 days</strong>. Generates email confirmation immediately.
                </div>

                <button
                  onClick={handleDeskDirectIssue}
                  disabled={
                    !deskBook ||
                    !deskStudent ||
                    !deskStudent.stats.isEligible ||
                    deskBook.availableCopies < 1 ||
                    isIssuingFromDesk
                  }
                  className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white text-sm font-extrabold rounded-2xl transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {isIssuingFromDesk ? "Processing Issue..." : "Confirm & Issue Book (10 Days)"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* ── 2. CIRCULATION LIST VIEWS ──────────────────────────────────── */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab !== "desk" && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="py-20 text-center text-slate-400 font-semibold text-sm">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                Loading circulation records...
              </div>
            ) : filteredLoans.length === 0 ? (
              <div className="py-20 text-center text-slate-400 font-medium text-sm">
                No circulation records found matching current criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                      <th className="py-3.5 px-5">Book Details</th>
                      <th className="py-3.5 px-4">Student</th>
                      <th className="py-3.5 px-4">Borrow & Due Date</th>
                      <th className="py-3.5 px-4">Status & Fine</th>
                      <th className="py-3.5 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                    {filteredLoans.map((loan) => {
                      const isOverdue = loan.status === "overdue" || (loan.status === "issued" && new Date(loan.dueDate) < new Date());
                      const daysOverdue = isOverdue ? Math.max(1, Math.ceil((Date.now() - new Date(loan.dueDate).getTime()) / (1000 * 60 * 60 * 24))) : 0;

                      return (
                        <tr key={loan.id} className="hover:bg-slate-50/60 transition-colors">
                          {/* Book info */}
                          <td className="py-4 px-5">
                            <div className="font-extrabold text-slate-900 text-sm leading-snug">{loan.book?.title}</div>
                            <div className="text-slate-500 mt-0.5">By {loan.book?.author}</div>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                              {loan.book?.barcode && (
                                <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-mono font-bold">
                                  {loan.book.barcode}
                                </span>
                              )}
                              <span className="text-[11px] text-slate-400 font-medium">
                                {loan.book?.block} • {loan.book?.shelfNumber}
                              </span>
                            </div>
                          </td>

                          {/* Student info */}
                          <td className="py-4 px-4">
                            <div className="font-bold text-slate-900">{loan.user?.name}</div>
                            <div className="text-slate-500 font-mono text-[11px]">{loan.user?.studentId || loan.user?.email}</div>
                          </td>

                          {/* Dates */}
                          <td className="py-4 px-4">
                            <div className="text-slate-600">
                              Issued: {new Date(loan.borrowDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </div>
                            <div className={`font-bold mt-0.5 ${isOverdue ? "text-rose-600" : "text-indigo-600"}`}>
                              Due: {new Date(loan.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </div>
                            {loan.renewCount > 0 && (
                              <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                                Renewed: {loan.renewCount}x
                              </span>
                            )}
                          </td>

                          {/* Status & Fine */}
                          <td className="py-4 px-4">
                            <div className="flex flex-col gap-1.5">
                              {loan.status === "requested" && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 w-fit">
                                  <Clock className="w-3 h-3" /> Requested
                                </span>
                              )}
                              {loan.status === "issued" && !isOverdue && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 w-fit">
                                  <BookOpen className="w-3 h-3" /> Issued
                                </span>
                              )}
                              {isOverdue && loan.status !== "returned" && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 w-fit">
                                  <AlertTriangle className="w-3 h-3" /> Overdue ({daysOverdue}d)
                                </span>
                              )}
                              {loan.status === "returned" && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 w-fit">
                                  <CheckCircle2 className="w-3 h-3" /> Returned
                                </span>
                              )}

                              {/* Fine Badge */}
                              {loan.fineAmount > 0 && (
                                <div className="mt-1">
                                  {loan.fineStatus === "paid" ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      <Check className="w-3 h-3" /> Paid: {loan.fineAmount} BDT
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                      Fine Due: {loan.fineAmount} BDT
                                    </span>
                                  )}
                                  {loan.chalanNumber && (
                                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                      Chalan: {loan.chalanNumber}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {loan.status === "requested" && (
                                <>
                                  <button
                                    onClick={() => handleApproveRequest(loan.id)}
                                    disabled={processingLoanId === loan.id}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                                  >
                                    <Check className="w-3.5 h-3.5" /> Approve & Issue
                                  </button>
                                  <button
                                    onClick={() => handleRejectRequest(loan.id)}
                                    disabled={processingLoanId === loan.id}
                                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}

                              {(loan.status === "issued" || loan.status === "overdue") && (
                                <button
                                  onClick={() => handleReturnBook(loan.id)}
                                  disabled={processingLoanId === loan.id}
                                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Return Book
                                </button>
                              )}

                              {loan.fineStatus === "unpaid" && loan.fineAmount > 0 && (
                                <button
                                  onClick={() => handleOpenFineModal(loan)}
                                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                                >
                                  <Receipt className="w-3.5 h-3.5" /> Settle Fine
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
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── 3. FINE SETTLEMENT MODAL (Cash / Bank Chalan) ──────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {fineModalLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 sm:p-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div>
                <div className="text-xs font-extrabold uppercase tracking-wider text-rose-600 flex items-center gap-1 mb-1">
                  <Receipt className="w-3.5 h-3.5" />
                  Overdue Fine Clearance
                </div>
                <h3 className="text-lg font-black text-slate-900">Settle Student Dues</h3>
              </div>
              <button
                onClick={() => setFineModalLoan(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {fineModalError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold">
                {fineModalError}
              </div>
            )}

            {fineModalSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold">
                {fineModalSuccess}
              </div>
            )}

            <form onSubmit={handleConfirmFinePayment} className="space-y-5">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Student:</span>
                  <span className="font-bold text-slate-900">{fineModalLoan.user?.name} ({fineModalLoan.user?.studentId || fineModalLoan.user?.email})</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Book:</span>
                  <span className="font-bold text-slate-900 truncate max-w-[200px]">{fineModalLoan.book?.title}</span>
                </div>
                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200">
                  <span className="font-bold text-slate-700">Total Outstanding Fine:</span>
                  <span className="text-lg font-black text-rose-600">{fineModalLoan.fineAmount} BDT</span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-2">
                  Payment Collection Method
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cash")}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      paymentMethod === "cash"
                        ? "bg-emerald-50 border-emerald-400 text-emerald-800 ring-2 ring-emerald-400"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    Cash at Counter
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("chalan")}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      paymentMethod === "chalan"
                        ? "bg-indigo-50 border-indigo-400 text-indigo-800 ring-2 ring-indigo-400"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Building className="w-4 h-4 text-indigo-600" />
                    Bank Chalan
                  </button>
                </div>
              </div>

              {/* Chalan Number if Bank Chalan */}
              {paymentMethod === "chalan" && (
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                    Bank Chalan / Slip Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CHALAN-DIU-2026-8899"
                    value={chalanNumber}
                    onChange={(e) => setChalanNumber(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                  Librarian Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Receipt verified at counter"
                  value={fineNotes}
                  onChange={(e) => setFineNotes(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setFineModalLoan(null)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSettlingFine}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-md shadow-emerald-200 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  {isSettlingFine ? "Recording Payment..." : "Mark as Paid & Restore Quota"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
