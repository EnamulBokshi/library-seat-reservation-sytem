"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { bookSuggestionService } from "@/services/book-suggestion-service";
import {
  ApiError,
  BookSuggestion,
  FulfillSuggestionPayload,
  SuggestionStatus,
} from "@/lib/types";
import {
  AlertCircle,
  BookCheck,
  BookOpen,
  CheckCircle2,
  ChevronUp,
  Clock,
  Filter,
  GraduationCap,
  Layers,
  Library,
  Loader2,
  Mail,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Tag,
  Trash2,
  X,
} from "lucide-react";

const STATUS_TABS: { value: SuggestionStatus | "all"; label: string }[] = [
  { value: "pending", label: "Pending Review" },
  { value: "approved", label: "In Acquisition" },
  { value: "fulfilled", label: "Added to Library" },
  { value: "rejected", label: "Declined" },
  { value: "all", label: "All Suggestions" },
];

const STATUS_CONFIG: Record<
  SuggestionStatus,
  { label: string; badgeClass: string; icon: React.ElementType }
> = {
  pending: {
    label: "Pending Review",
    badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800/60",
    icon: Clock,
  },
  approved: {
    label: "In Acquisition",
    badgeClass: "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800/60",
    icon: BookCheck,
  },
  fulfilled: {
    label: "Added to Library",
    badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Declined",
    badgeClass: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800/60",
    icon: AlertCircle,
  },
};

const formatDate = (value?: string | null): string =>
  value
    ? new Date(value).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

const CATEGORY_PRESETS = [
  "Computer Science & Engineering",
  "Software Engineering",
  "Information Technology",
  "Electrical & Electronic Engineering",
  "Business & Economics",
  "Mathematics & Statistics",
  "English & Humanities",
  "General Reference & Research",
];

export function BookSuggestionsAdminView() {
  const [suggestions, setSuggestions] = useState<BookSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Filters & Sorting
  const [statusFilter, setStatusFilter] = useState<SuggestionStatus | "all">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"upvoteCount" | "createdAt">("upvoteCount");

  // Modal: Fulfill
  const [fulfillTarget, setFulfillTarget] = useState<BookSuggestion | null>(null);
  const [fulfillData, setFulfillData] = useState<FulfillSuggestionPayload>({
    category: "Computer Science & Engineering",
    block: "A",
    shelfNumber: "01",
    callNumber: "",
    totalCopies: 1,
    adminNotes: "",
  });
  const [isFulfilling, setIsFulfilling] = useState(false);

  // Modal: Decline
  const [declineTarget, setDeclineTarget] = useState<BookSuggestion | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [isDeclining, setIsDeclining] = useState(false);

  // Modal: Quick Status
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadSuggestions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await bookSuggestionService.getAll({
        status: statusFilter === "all" ? undefined : statusFilter,
        searchTerm: searchQuery.trim() || undefined,
        sortBy,
        sortOrder: "desc",
        limit: 100,
      });
      setSuggestions(res.data ?? []);
    } catch (err: unknown) {
      setError((err as ApiError)?.message || "Failed to load faculty recommendations.");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchQuery, sortBy]);

  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  // Handle Mark as In Acquisition (Approved)
  const handleApprove = async (suggestion: BookSuggestion) => {
    setBusyId(suggestion.id);
    setError(null);
    setNotice(null);
    try {
      await bookSuggestionService.updateStatus(suggestion.id, {
        status: "approved",
        adminNotes: "Approved for library procurement. Purchase order in progress.",
      });
      setNotice(`"${suggestion.title}" approved and moved to In Acquisition.`);
      await loadSuggestions();
    } catch (err: unknown) {
      setError((err as ApiError)?.message || "Failed to approve suggestion.");
    } finally {
      setBusyId(null);
    }
  };

  // Handle Fulfill & Create Book & Send Gratitude Email
  const handleFulfillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fulfillTarget) return;

    if (!fulfillData.category?.trim() || !fulfillData.block?.trim() || !fulfillData.shelfNumber?.trim()) {
      setError("Category, Block, and Shelf Number are required to catalog the book.");
      return;
    }

    setIsFulfilling(true);
    setError(null);
    try {
      await bookSuggestionService.fulfill(fulfillTarget.id, fulfillData);
      setNotice(
        `Successfully added "${fulfillTarget.title}" to Library shelf (Block ${fulfillData.block}, Shelf ${fulfillData.shelfNumber})! Formal appreciation email dispatched to ${fulfillTarget.user?.name || "proposer"}.`
      );
      setFulfillTarget(null);
      await loadSuggestions();
    } catch (err: unknown) {
      setError((err as ApiError)?.message || "Failed to catalog and fulfill book suggestion.");
    } finally {
      setIsFulfilling(false);
    }
  };

  // Handle Decline
  const handleDeclineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!declineTarget) return;

    setIsDeclining(true);
    setError(null);
    try {
      await bookSuggestionService.updateStatus(declineTarget.id, {
        status: "rejected",
        adminNotes: declineReason.trim() || "Declined by library administration.",
      });
      setNotice(`Suggestion "${declineTarget.title}" marked as declined.`);
      setDeclineTarget(null);
      setDeclineReason("");
      await loadSuggestions();
    } catch (err: unknown) {
      setError((err as ApiError)?.message || "Failed to decline suggestion.");
    } finally {
      setIsDeclining(false);
    }
  };

  // Analytics
  const stats = useMemo(() => {
    const total = suggestions.length;
    const pending = suggestions.filter((s) => s.status === "pending").length;
    const approved = suggestions.filter((s) => s.status === "approved").length;
    const fulfilled = suggestions.filter((s) => s.status === "fulfilled").length;
    const topVoted = [...suggestions].sort((a, b) => b.upvoteCount - a.upvoteCount)[0];

    return {
      total,
      pending,
      approved,
      fulfilled,
      topCandidate: topVoted && topVoted.upvoteCount > 0 ? topVoted : null,
    };
  }, [suggestions]);

  return (
    <div className="space-y-6 pb-12">
      {/* Alert Notices */}
      {error && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-sm font-semibold text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-rose-500 hover:text-rose-800 dark:hover:text-rose-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {notice && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-sm font-semibold text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{notice}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-emerald-500 hover:text-emerald-800 dark:hover:text-emerald-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header & Kicker */}
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white via-slate-50/60 to-sky-50/30 p-6 shadow-sm dark:border-slate-800/80 dark:from-slate-900 dark:via-slate-900 dark:to-sky-950/20 md:flex-row md:items-center md:justify-between md:p-8">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[11px] font-bold tracking-wider uppercase text-sky-700 dark:border-sky-800/70 dark:bg-sky-950/50 dark:text-sky-300">
              <Sparkles className="h-3 w-3" />
              Acquisition Pipeline
            </span>
            <span className="text-xs font-semibold text-slate-400">·</span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Central Library DIU
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 md:text-3xl">
            Faculty Book Recommendations
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Review recommendations submitted by faculty members, sorted by peer upvotes. Fulfilling
            a request adds the volume to the library catalogue with shelf coordinates and sends an
            official DIU letter of appreciation to the proposer.
          </p>
        </div>

        <button
          type="button"
          onClick={loadSuggestions}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700 shadow-xs hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold tracking-wider uppercase text-slate-400">
              Pending Review
            </p>
            <div className="rounded-xl bg-amber-50 p-2 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-black text-amber-600 dark:text-amber-400">
            {stats.pending}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Awaiting librarian evaluation
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold tracking-wider uppercase text-slate-400">
              In Acquisition
            </p>
            <div className="rounded-xl bg-sky-50 p-2 text-sky-600 dark:bg-sky-950/60 dark:text-sky-300">
              <BookCheck className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-black text-sky-600 dark:text-sky-400">{stats.approved}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Purchase orders authorized
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold tracking-wider uppercase text-slate-400">
              Fulfilled & Shelved
            </p>
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300">
              <Library className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-black text-emerald-600 dark:text-emerald-400">
            {stats.fulfilled}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Available in library stacks
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold tracking-wider uppercase text-slate-400">
              Highest Upvoted
            </p>
            <div className="rounded-xl bg-purple-50 p-2 text-purple-600 dark:bg-purple-950/60 dark:text-purple-300">
              <ChevronUp className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 truncate text-base font-extrabold text-slate-900 dark:text-slate-100">
            {stats.topCandidate ? stats.topCandidate.title : "No proposals"}
          </p>
          <p className="mt-1 text-xs font-semibold text-purple-600 dark:text-purple-400">
            {stats.topCandidate
              ? `${stats.topCandidate.upvoteCount} votes · Top Priority`
              : "No active votes"}
          </p>
        </div>
      </div>

      {/* Search & Tabs */}
      <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by book title, author, proposer name, department, ISBN..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pr-4 pl-10 text-sm font-medium text-slate-900 placeholder-slate-400 transition-colors focus:border-slate-900 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-slate-400 dark:focus:bg-slate-800"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "upvoteCount" | "createdAt")}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-slate-300 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="upvoteCount">Sort: Top Voted (Priority)</option>
              <option value="createdAt">Sort: Submission Date</option>
            </select>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3 dark:border-slate-800/80">
          <span className="mr-1 text-xs font-semibold text-slate-400">Filter Queue:</span>
          {STATUS_TABS.map((tab) => {
            const isActive = statusFilter === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setStatusFilter(tab.value)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  isActive
                    ? "bg-slate-900 text-white shadow-xs dark:bg-slate-100 dark:text-slate-900"
                    : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Queue Items */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200/80 bg-white py-16 text-center dark:border-slate-800 dark:bg-slate-900">
          <Loader2 className="h-8 w-8 animate-spin text-slate-900 dark:text-slate-100" />
          <p className="mt-3 text-sm font-semibold text-slate-600 dark:text-slate-400">
            Loading recommendation queue...
          </p>
        </div>
      ) : suggestions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50/50 py-16 text-center dark:border-slate-800 dark:bg-slate-900/40">
          <div className="rounded-2xl bg-white p-4 shadow-xs dark:bg-slate-800">
            <BookOpen className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="mt-4 text-base font-extrabold text-slate-900 dark:text-slate-100">
            No Recommendations In This View
          </h3>
          <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            There are currently no proposals matching the selected filter.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {suggestions.map((item, index) => {
            const statusCfg = STATUS_CONFIG[item.status];
            const StatusIcon = statusCfg.icon;
            const isTopRanked = sortBy === "upvoteCount" && index === 0 && item.upvoteCount > 0;
            const isBusy = busyId === item.id;

            return (
              <div
                key={item.id}
                className={`relative flex flex-col gap-4 rounded-3xl border bg-white p-5 shadow-xs transition-all hover:border-slate-300 dark:bg-slate-900 md:flex-row md:items-start md:p-6 ${
                  isTopRanked
                    ? "border-amber-300/80 bg-gradient-to-r from-amber-50/20 via-white to-white dark:border-amber-700/60 dark:from-amber-950/10 dark:via-slate-900 dark:to-slate-900"
                    : "border-slate-200/80 dark:border-slate-800"
                }`}
              >
                {/* Upvote Pill / Count */}
                <div className="flex shrink-0 items-center md:flex-col">
                  <div className="flex items-center justify-center gap-1.5 rounded-2xl border border-amber-300/80 bg-amber-50/80 px-3.5 py-2.5 text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-300 md:w-16 md:flex-col md:py-3">
                    <ChevronUp className="h-5 w-5 stroke-[3] text-amber-600 dark:text-amber-400" />
                    <span className="text-sm font-black tracking-tight">{item.upvoteCount}</span>
                  </div>
                  {isTopRanked && (
                    <span className="ml-2 rounded-md bg-amber-100 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 md:mt-2 md:ml-0">
                      Top Priority
                    </span>
                  )}
                </div>

                {/* Main Content */}
                <div className="min-w-0 flex-1 space-y-3">
                  {/* Title & Status */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-black tracking-tight text-slate-900 dark:text-slate-100 md:text-lg">
                        {item.title}
                      </h2>
                      <p className="mt-0.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Author: <span className="text-slate-900 dark:text-slate-100">{item.author}</span>
                        {item.publisher && <span> · Publisher: {item.publisher}</span>}
                      </p>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-bold ${statusCfg.badgeClass}`}
                    >
                      <StatusIcon className="h-3.5 w-3.5" />
                      {statusCfg.label}
                    </span>
                  </div>

                  {/* Metadata Chips */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {item.edition && (
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        Edition: {item.edition}
                      </span>
                    )}
                    {item.isbn && (
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        ISBN: {item.isbn}
                      </span>
                    )}
                    {item.department && (
                      <span className="rounded-lg bg-indigo-50 px-2.5 py-1 font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                        Dept: {item.department}
                      </span>
                    )}
                    {item.courseCode && (
                      <span className="rounded-lg bg-purple-50 px-2.5 py-1 font-semibold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                        Course: {item.courseCode}
                      </span>
                    )}
                  </div>

                  {/* Academic Rationale */}
                  {item.reason && (
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
                      <p className="font-semibold text-slate-500 dark:text-slate-400">
                        Faculty Justification:
                      </p>
                      <p className="mt-1 leading-relaxed italic">&ldquo;{item.reason}&rdquo;</p>
                    </div>
                  )}

                  {/* Proposer Info */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-[11px] text-slate-500 dark:border-slate-800/70 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <GraduationCap className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>
                        Proposer:{" "}
                        <strong className="text-slate-700 dark:text-slate-200">
                          {item.user?.name || "Faculty Member"}
                        </strong>{" "}
                        ({item.user?.email || "No email"}
                        {item.user?.department ? ` · ${item.user.department}` : ""})
                      </span>
                    </div>
                    <span>Submitted on {formatDate(item.createdAt)}</span>
                  </div>

                  {/* Fulfilled Shelf Card */}
                  {item.status === "fulfilled" && item.book && (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50/40 p-3.5 dark:border-emerald-800/60 dark:from-emerald-950/40 dark:to-teal-950/20">
                      <div className="flex items-center gap-2.5">
                        <div className="rounded-xl bg-emerald-600 p-2 text-white shadow-xs">
                          <MapPin className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                            Central Library Catalogue Record Created
                          </p>
                          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                            Location:{" "}
                            <strong>
                              Block {item.book.block || "A"}, Shelf {item.book.shelfNumber || "01"}
                            </strong>
                            {item.book.callNumber ? ` · Call No: ${item.book.callNumber}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="rounded-lg bg-emerald-600/10 px-2.5 py-1 font-bold text-emerald-800 dark:text-emerald-200">
                          {item.book.availableCopies} / {item.book.totalCopies} Copies
                        </span>
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-300">
                          <Mail className="h-3.5 w-3.5" />
                          Gratitude Email Sent
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Admin Note if declined */}
                  {item.adminNotes && item.status !== "fulfilled" && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300">
                      <span className="font-bold text-slate-700 dark:text-slate-200">
                        Admin Note:
                      </span>{" "}
                      {item.adminNotes}
                    </div>
                  )}

                  {/* Admin Action Buttons */}
                  {item.status !== "fulfilled" && (
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      {/* Fulfill Action */}
                      <button
                        type="button"
                        onClick={() => {
                          setFulfillTarget(item);
                          setFulfillData({
                            category: item.department || "Computer Science & Engineering",
                            block: "A",
                            shelfNumber: "01",
                            callNumber: "",
                            totalCopies: 1,
                            adminNotes: "",
                          });
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-[0.98] dark:bg-emerald-500 dark:hover:bg-emerald-600"
                      >
                        <Library className="h-3.5 w-3.5" />
                        <span>Fulfill & Add to Library</span>
                      </button>

                      {/* Approve for Acquisition */}
                      {item.status === "pending" && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleApprove(item)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-800 hover:bg-sky-100 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-300 dark:hover:bg-sky-900/60"
                        >
                          <BookCheck className="h-3.5 w-3.5" />
                          <span>Mark In Acquisition</span>
                        </button>
                      )}

                      {/* Decline */}
                      {item.status !== "rejected" && (
                        <button
                          type="button"
                          onClick={() => {
                            setDeclineTarget(item);
                            setDeclineReason("");
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 dark:border-slate-700 dark:text-slate-400 dark:hover:border-rose-800/60 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
                        >
                          <X className="h-3.5 w-3.5" />
                          <span>Decline</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Fulfill & Add to Library */}
      {fulfillTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 md:p-8">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold tracking-wider uppercase text-emerald-600 dark:text-emerald-400">
                  <Library className="h-3 w-3" />
                  Catalogue Acquisition
                </span>
                <h3 className="mt-1 text-xl font-black text-slate-900 dark:text-slate-100">
                  Fulfill & Add to Library
                </h3>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Adds book to central catalog, registers shelf coordinates, and dispatches a formal
                  gratitude letter to {fulfillTarget.user?.name || "faculty member"}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFulfillTarget(null)}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Book Preview Summary */}
            <div className="mt-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/50">
              <p className="text-sm font-black text-slate-900 dark:text-slate-100">
                {fulfillTarget.title}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                Author: {fulfillTarget.author}
                {fulfillTarget.publisher ? ` · ${fulfillTarget.publisher}` : ""}
              </p>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Proposed by: {fulfillTarget.user?.name} ({fulfillTarget.user?.email}) ·{" "}
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {fulfillTarget.upvoteCount} votes
                </span>
              </p>
            </div>

            <form onSubmit={handleFulfillSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold tracking-wider uppercase text-slate-700 dark:text-slate-300">
                  Academic Category <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  list="category-presets"
                  value={fulfillData.category}
                  onChange={(e) => setFulfillData({ ...fulfillData, category: e.target.value })}
                  placeholder="e.g. Computer Science & Engineering"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm font-medium text-slate-900 placeholder-slate-400 transition-colors focus:border-emerald-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100"
                />
                <datalist id="category-presets">
                  {CATEGORY_PRESETS.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold tracking-wider uppercase text-slate-700 dark:text-slate-300">
                    Shelf Block <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fulfillData.block}
                    onChange={(e) => setFulfillData({ ...fulfillData, block: e.target.value })}
                    placeholder="e.g. A, B, C, D"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm font-medium text-slate-900 placeholder-slate-400 transition-colors focus:border-emerald-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold tracking-wider uppercase text-slate-700 dark:text-slate-300">
                    Shelf Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fulfillData.shelfNumber}
                    onChange={(e) =>
                      setFulfillData({ ...fulfillData, shelfNumber: e.target.value })
                    }
                    placeholder="e.g. 04 or 12"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm font-medium text-slate-900 placeholder-slate-400 transition-colors focus:border-emerald-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold tracking-wider uppercase text-slate-700 dark:text-slate-300">
                    Call Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={fulfillData.callNumber}
                    onChange={(e) => setFulfillData({ ...fulfillData, callNumber: e.target.value })}
                    placeholder="e.g. QA76.73.J38"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm font-medium text-slate-900 placeholder-slate-400 transition-colors focus:border-emerald-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold tracking-wider uppercase text-slate-700 dark:text-slate-300">
                    Copies Acquired <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    required
                    value={fulfillData.totalCopies}
                    onChange={(e) =>
                      setFulfillData({
                        ...fulfillData,
                        totalCopies: parseInt(e.target.value, 10) || 1,
                      })
                    }
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm font-medium text-slate-900 placeholder-slate-400 transition-colors focus:border-emerald-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold tracking-wider uppercase text-slate-700 dark:text-slate-300">
                  Note to Proposer (Optional)
                </label>
                <textarea
                  rows={2}
                  value={fulfillData.adminNotes}
                  onChange={(e) => setFulfillData({ ...fulfillData, adminNotes: e.target.value })}
                  placeholder="Additional message included in the appreciation email..."
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm font-medium text-slate-900 placeholder-slate-400 transition-colors focus:border-emerald-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100"
                />
              </div>

              <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-3 text-xs text-sky-800 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-300">
                <div className="flex items-center gap-2 font-bold">
                  <Mail className="h-3.5 w-3.5" />
                  <span>Automatic Formal Gratitude Notification</span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed">
                  Upon fulfillment, a formal DIU Library letter will be automatically dispatched to{" "}
                  <strong>{fulfillTarget.user?.email}</strong> thanking them for their academic
                  recommendation and detailing the book&apos;s physical shelf coordinates.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="submit"
                  disabled={isFulfilling}
                  className="flex-1 rounded-2xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isFulfilling ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cataloging & Notifying...
                    </span>
                  ) : (
                    "Fulfill & Dispatch Gratitude Letter"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setFulfillTarget(null)}
                  className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Decline Suggestion */}
      {declineTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="rounded-2xl bg-rose-50 p-2.5 dark:bg-rose-950/60">
                <AlertCircle className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                Decline Recommendation
              </h3>
            </div>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              Provide a rationale for declining{" "}
              <strong className="text-slate-900 dark:text-slate-100">
                &ldquo;{declineTarget.title}&rdquo;
              </strong>
              . This note will be recorded for the proposer.
            </p>

            <form onSubmit={handleDeclineSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold tracking-wider uppercase text-slate-700 dark:text-slate-300">
                  Decline Reason
                </label>
                <textarea
                  rows={3}
                  required
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="e.g. Edition currently out of print, or duplicate volume already present under alternative ISBN..."
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm font-medium text-slate-900 placeholder-slate-400 transition-colors focus:border-rose-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isDeclining}
                  className="flex-1 rounded-2xl bg-rose-600 py-3 text-xs font-bold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50"
                >
                  {isDeclining ? "Updating..." : "Decline Recommendation"}
                </button>
                <button
                  type="button"
                  onClick={() => setDeclineTarget(null)}
                  className="flex-1 rounded-2xl border border-slate-200 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default BookSuggestionsAdminView;
