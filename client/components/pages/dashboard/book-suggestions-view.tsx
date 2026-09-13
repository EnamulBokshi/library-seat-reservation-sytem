"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { bookSuggestionService } from "@/services/book-suggestion-service";
import {
  ApiError,
  BookSuggestion,
  CreateBookSuggestionPayload,
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
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Tag,
  Trash2,
  X,
} from "lucide-react";

const STATUS_FILTERS: { value: SuggestionStatus | "all"; label: string }[] = [
  { value: "all", label: "All Suggestions" },
  { value: "pending", label: "Under Review" },
  { value: "approved", label: "In Acquisition" },
  { value: "fulfilled", label: "Added to Library" },
  { value: "rejected", label: "Declined" },
];

const STATUS_CONFIG: Record<
  SuggestionStatus,
  { label: string; badgeClass: string; icon: React.ElementType }
> = {
  pending: {
    label: "Under Review",
    badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800/60",
    icon: Clock,
  },
  approved: {
    label: "Approved for Acquisition",
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

export function BookSuggestionsView() {
  const { user } = useAuth();

  const [suggestions, setSuggestions] = useState<BookSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Filters & Controls
  const [statusFilter, setStatusFilter] = useState<SuggestionStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [onlyMine, setOnlyMine] = useState(false);
  const [sortBy, setSortBy] = useState<"upvoteCount" | "createdAt">("upvoteCount");

  // Voting state tracker for optimistic feedback
  const [votingId, setVotingId] = useState<string | null>(null);

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BookSuggestion | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [formData, setFormData] = useState<CreateBookSuggestionPayload>({
    title: "",
    author: "",
    publisher: "",
    edition: "",
    isbn: "",
    department: user?.department || "",
    courseCode: "",
    reason: "",
  });

  const loadSuggestions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await bookSuggestionService.getAll({
        status: statusFilter === "all" ? undefined : statusFilter,
        searchTerm: searchQuery.trim() || undefined,
        onlyMySuggestions: onlyMine || undefined,
        sortBy,
        sortOrder: "desc",
        limit: 100,
      });
      setSuggestions(res.data ?? []);
    } catch (err: unknown) {
      setError((err as ApiError)?.message || "Failed to load book recommendations.");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchQuery, onlyMine, sortBy]);

  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  // Handle Upvote Toggle
  const handleToggleVote = async (id: string) => {
    if (votingId) return;
    setVotingId(id);

    // Optimistic UI update
    setSuggestions((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const nextHasUpvoted = !item.hasUpvoted;
        return {
          ...item,
          hasUpvoted: nextHasUpvoted,
          upvoteCount: nextHasUpvoted ? item.upvoteCount + 1 : Math.max(0, item.upvoteCount - 1),
        };
      })
    );

    try {
      const res = await bookSuggestionService.toggleVote(id);
      if (res.data) {
        const { hasUpvoted, upvoteCount } = res.data;
        setSuggestions((prev) =>
          prev.map((item) => (item.id === id ? { ...item, hasUpvoted, upvoteCount } : item))
        );
      }
    } catch (err: unknown) {
      // Revert on error
      setError((err as ApiError)?.message || "Could not record your vote.");
      loadSuggestions();
    } finally {
      setVotingId(null);
    }
  };

  // Submit Recommendation
  const handleCreateSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.author.trim()) {
      setError("Please provide both the book title and author name.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await bookSuggestionService.create(formData);
      setNotice(`"${formData.title}" was submitted to the acquisition queue with your vote!`);
      setIsCreateOpen(false);
      setFormData({
        title: "",
        author: "",
        publisher: "",
        edition: "",
        isbn: "",
        department: user?.department || "",
        courseCode: "",
        reason: "",
      });
      await loadSuggestions();
    } catch (err: unknown) {
      setError((err as ApiError)?.message || "Failed to submit recommendation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete
  const handleDeleteSuggestion = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setError(null);
    try {
      await bookSuggestionService.delete(deleteTarget.id);
      setNotice(`Recommendation "${deleteTarget.title}" was withdrawn.`);
      setDeleteTarget(null);
      await loadSuggestions();
    } catch (err: unknown) {
      setError((err as ApiError)?.message || "Failed to remove recommendation.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Analytics / KPI Computations
  const stats = useMemo(() => {
    const total = suggestions.length;
    const fulfilled = suggestions.filter((s) => s.status === "fulfilled").length;
    const myCount = user ? suggestions.filter((s) => s.userId === user.id).length : 0;
    const topVoted = [...suggestions].sort((a, b) => b.upvoteCount - a.upvoteCount)[0];

    return {
      total,
      fulfilled,
      myCount,
      topBook: topVoted && topVoted.upvoteCount > 0 ? topVoted : null,
    };
  }, [suggestions, user]);

  return (
    <div className="space-y-6 pb-12">
      {/* Alert Banners */}
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

      {/* Hero Header */}
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white via-slate-50/50 to-emerald-50/30 p-6 shadow-sm dark:border-slate-800/80 dark:from-slate-900 dark:via-slate-900/80 dark:to-emerald-950/20 md:flex-row md:items-center md:justify-between md:p-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold tracking-wider uppercase text-emerald-700 dark:border-emerald-800/70 dark:bg-emerald-950/50 dark:text-emerald-300">
              <Sparkles className="h-3 w-3" />
              Faculty Acquisition Portal
            </span>
            <span className="text-xs font-semibold text-slate-400">·</span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Daffodil International University
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 md:text-3xl">
            Book Recommendations & Faculty Voting
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Recommend textbooks, reference literature, and research monographs for the university
            catalogue. Faculty peer upvoting directs collection procurement priorities.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setError(null);
            setNotice(null);
            setFormData({
              title: "",
              author: "",
              publisher: "",
              edition: "",
              isbn: "",
              department: user?.department || "",
              courseCode: "",
              reason: "",
            });
            setIsCreateOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3.5 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition-all hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/30 active:scale-[0.98] dark:bg-emerald-500 dark:hover:bg-emerald-600"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          <span>Recommend a Book</span>
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold tracking-wider uppercase text-slate-400">
              Acquisition Queue
            </p>
            <div className="rounded-xl bg-slate-100 p-2 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-black text-slate-900 dark:text-slate-100">
            {stats.total}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Faculty proposals on record
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold tracking-wider uppercase text-slate-400">
              My Submissions
            </p>
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300">
              <GraduationCap className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-black text-emerald-600 dark:text-emerald-400">
            {stats.myCount}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Titles recommended by you
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold tracking-wider uppercase text-slate-400">
              Added to Library
            </p>
            <div className="rounded-xl bg-sky-50 p-2 text-sky-600 dark:bg-sky-950/60 dark:text-sky-300">
              <BookCheck className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-black text-sky-600 dark:text-sky-400">
            {stats.fulfilled}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Fulfilled and available on shelves
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold tracking-wider uppercase text-slate-400">
              Top Voted Volume
            </p>
            <div className="rounded-xl bg-amber-50 p-2 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300">
              <ChevronUp className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 truncate text-base font-extrabold text-slate-900 dark:text-slate-100">
            {stats.topBook ? stats.topBook.title : "No votes cast yet"}
          </p>
          <p className="mt-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
            {stats.topBook ? `${stats.topBook.upvoteCount} peer upvotes` : "Submit first vote"}
          </p>
        </div>
      </div>

      {/* Interactive Controls Bar */}
      <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by book title, author, publisher, ISBN, department..."
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

          {/* Quick Switches & Sort */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setOnlyMine((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all ${
                onlyMine
                  ? "border-emerald-600 bg-emerald-50 text-emerald-700 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              <GraduationCap className="h-3.5 w-3.5" />
              <span>My Proposals</span>
            </button>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "upvoteCount" | "createdAt")}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-slate-300 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="upvoteCount">Sort: Top Voted First</option>
              <option value="createdAt">Sort: Recently Added</option>
            </select>

            <button
              type="button"
              onClick={loadSuggestions}
              title="Refresh suggestions"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3 dark:border-slate-800/80">
          <span className="mr-1 text-xs font-semibold text-slate-400">Status:</span>
          {STATUS_FILTERS.map((tab) => {
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

      {/* Main List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200/80 bg-white py-16 text-center dark:border-slate-800 dark:bg-slate-900">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600 dark:text-emerald-400" />
          <p className="mt-3 text-sm font-semibold text-slate-600 dark:text-slate-400">
            Loading faculty recommendations...
          </p>
        </div>
      ) : suggestions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50/50 py-16 text-center dark:border-slate-800 dark:bg-slate-900/40">
          <div className="rounded-2xl bg-white p-4 shadow-xs dark:bg-slate-800">
            <BookOpen className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="mt-4 text-base font-extrabold text-slate-900 dark:text-slate-100">
            No Book Recommendations Found
          </h3>
          <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            {searchQuery || statusFilter !== "all" || onlyMine
              ? "Try adjusting your search criteria or clearing active filters."
              : "Be the first faculty member to propose an addition to the library!"}
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("all");
              setOnlyMine(false);
              setIsCreateOpen(true);
            }}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Submit a Recommendation</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {suggestions.map((item, index) => {
            const statusCfg = STATUS_CONFIG[item.status];
            const StatusIcon = statusCfg.icon;
            const isMine = user?.id === item.userId;
            const isTopRanked = sortBy === "upvoteCount" && index === 0 && item.upvoteCount > 0;

            return (
              <div
                key={item.id}
                className={`relative flex flex-col gap-4 rounded-3xl border bg-white p-5 shadow-xs transition-all hover:border-slate-300 dark:bg-slate-900 md:flex-row md:items-start md:p-6 ${
                  isTopRanked
                    ? "border-amber-300/80 bg-gradient-to-r from-amber-50/30 via-white to-white dark:border-amber-700/60 dark:from-amber-950/10 dark:via-slate-900 dark:to-slate-900"
                    : "border-slate-200/80 dark:border-slate-800"
                }`}
              >
                {/* Upvote Pill / Button */}
                <div className="flex shrink-0 items-center md:flex-col">
                  <button
                    type="button"
                    onClick={() => handleToggleVote(item.id)}
                    disabled={votingId === item.id}
                    className={`group flex items-center justify-center gap-1.5 rounded-2xl border px-3.5 py-2.5 transition-all md:w-16 md:flex-col md:py-3 ${
                      item.hasUpvoted
                        ? "border-amber-400 bg-amber-500/10 text-amber-700 shadow-xs dark:border-amber-600/80 dark:bg-amber-950/40 dark:text-amber-300"
                        : "border-slate-200 bg-slate-50/80 text-slate-600 hover:border-amber-300 hover:bg-amber-50/50 hover:text-amber-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:border-amber-600/60 dark:hover:bg-amber-950/30 dark:hover:text-amber-300"
                    }`}
                    title={item.hasUpvoted ? "Remove your upvote" : "Upvote this suggestion"}
                  >
                    <ChevronUp
                      className={`h-5 w-5 transition-transform group-hover:-translate-y-0.5 ${
                        item.hasUpvoted
                          ? "stroke-[3] text-amber-600 dark:text-amber-400"
                          : "text-slate-400 group-hover:text-amber-500"
                      }`}
                    />
                    <span className="text-sm font-black tracking-tight">{item.upvoteCount}</span>
                  </button>
                  {isTopRanked && (
                    <span className="ml-2 rounded-md bg-amber-100 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 md:mt-2 md:ml-0">
                      Top Choice
                    </span>
                  )}
                </div>

                {/* Main Suggestion Details */}
                <div className="min-w-0 flex-1 space-y-3">
                  {/* Title & Status */}
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h2 className="text-base font-black tracking-tight text-slate-900 dark:text-slate-100 md:text-lg">
                        {item.title}
                      </h2>
                      <p className="mt-0.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        by <span className="text-slate-900 dark:text-slate-100">{item.author}</span>
                        {item.publisher && <span> · Publisher: {item.publisher}</span>}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-bold ${statusCfg.badgeClass}`}
                      >
                        <StatusIcon className="h-3.5 w-3.5" />
                        {statusCfg.label}
                      </span>
                      {isMine && item.status === "pending" && (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(item)}
                          className="rounded-xl border border-slate-200 p-1.5 text-slate-400 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-700 dark:hover:border-rose-900/60 dark:hover:bg-rose-950/50 dark:hover:text-rose-300"
                          title="Withdraw your recommendation"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Badges / Meta Info */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {item.edition && (
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {item.edition}
                      </span>
                    )}
                    {item.isbn && (
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        ISBN: {item.isbn}
                      </span>
                    )}
                    {item.department && (
                      <span className="rounded-lg bg-indigo-50 px-2.5 py-1 font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                        {item.department}
                      </span>
                    )}
                    {item.courseCode && (
                      <span className="rounded-lg bg-purple-50 px-2.5 py-1 font-semibold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                        Course: {item.courseCode}
                      </span>
                    )}
                  </div>

                  {/* Academic Reason / Justification */}
                  {item.reason && (
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
                      <p className="font-semibold text-slate-500 dark:text-slate-400">
                        Academic Rationale:
                      </p>
                      <p className="mt-1 leading-relaxed italic">&ldquo;{item.reason}&rdquo;</p>
                    </div>
                  )}

                  {/* Proposer Info */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-[11px] text-slate-500 dark:border-slate-800/70 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <GraduationCap className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>
                        Recommended by{" "}
                        <strong className="text-slate-700 dark:text-slate-200">
                          {item.user?.name || "Faculty Member"}
                        </strong>{" "}
                        {item.user?.designation ? `(${item.user.designation})` : ""}
                      </span>
                    </div>
                    <span>Proposed on {formatDate(item.createdAt)}</span>
                  </div>

                  {/* Fulfilled Shelf Location Card */}
                  {item.status === "fulfilled" && item.book && (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50/40 p-3.5 dark:border-emerald-800/60 dark:from-emerald-950/40 dark:to-teal-950/20">
                      <div className="flex items-center gap-2.5">
                        <div className="rounded-xl bg-emerald-600 p-2 text-white shadow-xs">
                          <MapPin className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                            Available in Central Library Collection
                          </p>
                          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                            Shelf Location:{" "}
                            <strong>
                              Block {item.book.block || "A"}, Shelf {item.book.shelfNumber || "1"}
                            </strong>
                            {item.book.callNumber ? ` · Call: ${item.book.callNumber}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="rounded-lg bg-emerald-600/10 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-200">
                          {item.book.availableCopies} Copies Available
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Admin Note if declined or approved */}
                  {item.adminNotes && item.status !== "fulfilled" && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300">
                      <span className="font-bold text-slate-700 dark:text-slate-200">
                        Library Acquisition Note:
                      </span>{" "}
                      {item.adminNotes}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Recommend a Book */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 md:p-8">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold tracking-wider uppercase text-emerald-600 dark:text-emerald-400">
                  <Sparkles className="h-3 w-3" />
                  Collection Suggestion
                </span>
                <h3 className="mt-1 text-xl font-black text-slate-900 dark:text-slate-100">
                  Recommend a Book
                </h3>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Propose a textbook or reference work. Peers can vote to expedite procurement.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSuggestion} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-bold tracking-wider uppercase text-slate-700 dark:text-slate-300">
                  Book Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Design Patterns: Elements of Reusable Object-Oriented Software"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm font-medium text-slate-900 placeholder-slate-400 transition-colors focus:border-emerald-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold tracking-wider uppercase text-slate-700 dark:text-slate-300">
                  Author(s) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  placeholder="e.g. Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm font-medium text-slate-900 placeholder-slate-400 transition-colors focus:border-emerald-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold tracking-wider uppercase text-slate-700 dark:text-slate-300">
                    Publisher / Imprint
                  </label>
                  <input
                    type="text"
                    value={formData.publisher}
                    onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                    placeholder="e.g. Addison-Wesley"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm font-medium text-slate-900 placeholder-slate-400 transition-colors focus:border-emerald-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold tracking-wider uppercase text-slate-700 dark:text-slate-300">
                    Edition / Year
                  </label>
                  <input
                    type="text"
                    value={formData.edition}
                    onChange={(e) => setFormData({ ...formData, edition: e.target.value })}
                    placeholder="e.g. 2nd Edition, 2022"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm font-medium text-slate-900 placeholder-slate-400 transition-colors focus:border-emerald-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold tracking-wider uppercase text-slate-700 dark:text-slate-300">
                    ISBN / ISSN
                  </label>
                  <input
                    type="text"
                    value={formData.isbn}
                    onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                    placeholder="e.g. 978-0201633610"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm font-medium text-slate-900 placeholder-slate-400 transition-colors focus:border-emerald-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold tracking-wider uppercase text-slate-700 dark:text-slate-300">
                    Target Department
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="e.g. Computer Science & Engineering"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm font-medium text-slate-900 placeholder-slate-400 transition-colors focus:border-emerald-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold tracking-wider uppercase text-slate-700 dark:text-slate-300">
                  Associated Course Code (Optional)
                </label>
                <input
                  type="text"
                  value={formData.courseCode}
                  onChange={(e) => setFormData({ ...formData, courseCode: e.target.value })}
                  placeholder="e.g. CSE-323 / SWE-411"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm font-medium text-slate-900 placeholder-slate-400 transition-colors focus:border-emerald-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold tracking-wider uppercase text-slate-700 dark:text-slate-300">
                  Academic Rationale / Recommendation Note
                </label>
                <textarea
                  rows={3}
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Explain why this book is valuable for DIU academic curriculum or student research..."
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm font-medium text-slate-900 placeholder-slate-400 transition-colors focus:border-emerald-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 rounded-2xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting...
                    </span>
                  ) : (
                    "Submit Recommendation"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="rounded-2xl bg-rose-50 p-2.5 dark:bg-rose-950/60">
                <Trash2 className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                Withdraw Recommendation?
              </h3>
            </div>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              Are you sure you want to withdraw{" "}
              <strong className="text-slate-900 dark:text-slate-100">
                &ldquo;{deleteTarget.title}&rdquo;
              </strong>
              ? All peer votes on this title will also be removed.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={handleDeleteSuggestion}
                disabled={isDeleting}
                className="flex-1 rounded-2xl bg-rose-600 py-3 text-xs font-bold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50"
              >
                {isDeleting ? "Withdrawing..." : "Yes, Withdraw"}
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-2xl border border-slate-200 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Keep
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BookSuggestionsView;
