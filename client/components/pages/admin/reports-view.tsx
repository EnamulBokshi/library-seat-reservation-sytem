"use client"

import React, { useCallback, useEffect, useState } from "react"
import { reportService } from "@/services/report-service"
import {
  ApiError,
  Report,
  ReportCategory,
  ReportPriority,
  ReportStatus,
} from "@/lib/types"
import {
  REPORT_CATEGORY_LABELS,
  REPORT_STATUS_LABELS,
  REPORT_STATUS_STYLES,
  formatNoticeDate,
} from "@/lib/announcement-labels"
import {
  AlertCircle,
  ArrowDownUp,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flag,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  Inbox,
  X,
} from "lucide-react"

const STATUS_TABS: { value: ReportStatus | "all"; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "in_review", label: "Under review" },
  { value: "resolved", label: "Resolved" },
  { value: "dismissed", label: "Closed" },
  { value: "all", label: "All" },
]

const CATEGORIES: ReportCategory[] = [
  "bug",
  "service",
  "facilities",
  "environment",
  "book",
  "other",
]
const PRIORITIES: ReportPriority[] = ["low", "normal", "high"]

const PRIORITY_STYLES: Record<ReportPriority, string> = {
  low: "bg-slate-100 text-slate-600",
  normal: "bg-slate-200 text-slate-700",
  high: "bg-rose-100 text-rose-700",
}

const SORT_OPTIONS: {
  value: "createdAt" | "updatedAt" | "priority" | "status"
  label: string
}[] = [
  { value: "createdAt", label: "Filed date" },
  { value: "updatedAt", label: "Last update" },
  { value: "priority", label: "Priority" },
  { value: "status", label: "Status" },
]

/**
 * Staff triage queue. Every state change mails the reporter, so the note field
 * doubles as the reply they receive.
 */
export function AdminReportsView() {
  const [reports, setReports] = useState<Report[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})

  const [statusFilter, setStatusFilter] = useState<ReportStatus | "all">("open")
  const [categoryFilter, setCategoryFilter] = useState<ReportCategory | "any">(
    "any"
  )
  const [priorityFilter, setPriorityFilter] = useState<ReportPriority | "any">(
    "any"
  )
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [sortBy, setSortBy] = useState<
    "createdAt" | "updatedAt" | "priority" | "status"
  >("createdAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [target, setTarget] = useState<Report | null>(null)
  const [nextStatus, setNextStatus] = useState<ReportStatus>("in_review")
  const [staffNote, setStaffNote] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(handler)
  }, [searchQuery])

  const loadReports = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await reportService.getAll({
        page,
        limit: 12,
        status: statusFilter === "all" ? undefined : statusFilter,
        category: categoryFilter === "any" ? undefined : categoryFilter,
        priority: priorityFilter === "any" ? undefined : priorityFilter,
        searchTerm: debouncedSearch || undefined,
        sortBy,
        sortOrder,
      })
      setReports(res.data ?? [])
      setTotalPages(res.meta?.totalPages ?? 1)
      setTotalCount(res.meta?.total ?? 0)
      setCounts(res.meta?.counts ?? {})
    } catch (err: unknown) {
      setError((err as ApiError)?.message || "Could not load reports.")
    } finally {
      setIsLoading(false)
    }
  }, [
    page,
    statusFilter,
    categoryFilter,
    priorityFilter,
    debouncedSearch,
    sortBy,
    sortOrder,
  ])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  const openTriage = (report: Report) => {
    setTarget(report)
    // Default to the next sensible step rather than the state it already has.
    setNextStatus(report.status === "open" ? "in_review" : "resolved")
    setStaffNote(report.staffNote ?? "")
    setError(null)
  }

  const handleSave = async () => {
    if (!target) return

    setIsSaving(true)
    setError(null)
    try {
      await reportService.updateStatus(target.id, {
        status: nextStatus,
        staffNote: staffNote.trim() || undefined,
      })
      setNotice(
        `Report marked ${REPORT_STATUS_LABELS[nextStatus].toLowerCase()}. The reporter was emailed.`
      )
      setTarget(null)
      await loadReports()
    } catch (err: unknown) {
      setError((err as ApiError)?.message || "Could not update the report.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
            <Inbox className="h-5 w-5" />
          </div>
          <div>
            <p className="kicker-label">MEMBER FEEDBACK</p>
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
              Reports
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={loadReports}
          disabled={isLoading}
          className="pulse-button-secondary px-3 py-1.5 text-xs"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
          />
          <span>Refresh</span>
        </button>
      </div>

      {error && !target && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">{error}</div>
        </div>
      )}

      {notice && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">{notice}</div>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="pulse-card space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-100/80 p-1">
            {STATUS_TABS.map((tab) => {
              const tally = tab.value === "all" ? undefined : counts[tab.value]
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => {
                    setStatusFilter(tab.value)
                    setPage(1)
                  }}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-black transition-all ${
                    statusFilter === tab.value
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>{tab.label}</span>
                  {typeof tally === "number" && tally > 0 && (
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                        statusFilter === tab.value
                          ? "bg-slate-900 text-white"
                          : "bg-slate-200/80 text-slate-600"
                      }`}
                    >
                      {tally}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          <span className="text-xs font-semibold text-slate-400">
            {totalCount} shown
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search subject, detail, location or reporter..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pr-8 pl-10 text-xs font-bold text-slate-900 placeholder-slate-400 shadow-2xs focus:border-slate-900 focus:bg-white focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value as ReportCategory | "any")
              setPage(1)
            }}
            className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs focus:border-slate-900 focus:outline-none"
          >
            <option value="any">Every category</option>
            {CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {REPORT_CATEGORY_LABELS[value]}
              </option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value as ReportPriority | "any")
              setPage(1)
            }}
            className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs focus:border-slate-900 focus:outline-none"
          >
            <option value="any">Any priority</option>
            {PRIORITIES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as typeof sortBy)
              setPage(1)
            }}
            className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs focus:border-slate-900 focus:outline-none"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                Sort: {option.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() =>
              setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
            }
            className="pulse-button-secondary shrink-0 px-3 py-2 text-xs"
            title={`Sorted ${sortOrder === "asc" ? "oldest first" : "newest first"} — click to switch`}
          >
            <ArrowDownUp className="h-3.5 w-3.5" />
            <span>{sortOrder === "asc" ? "Asc" : "Desc"}</span>
          </button>
        </div>
      </div>

      {/* ── Queue ── */}
      {isLoading ? (
        <div className="pulse-card flex items-center justify-center p-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-900" />
        </div>
      ) : reports.length === 0 ? (
        <div className="pulse-card p-12 text-center">
          <Inbox className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-bold text-slate-900">
            Nothing in this queue
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Reports from students and faculty land here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div key={report.id} className="pulse-card space-y-3 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    {report.subject}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {report.reporter?.name}
                    {report.reporter?.role
                      ? ` · ${report.reporter.role}`
                      : ""}{" "}
                    · {formatNoticeDate(report.createdAt)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                    {REPORT_CATEGORY_LABELS[report.category]}
                  </span>
                  <span
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase ${
                      PRIORITY_STYLES[report.priority]
                    }`}
                  >
                    <Flag className="mr-1 inline h-3 w-3" />
                    {report.priority}
                  </span>
                  <span
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase ${
                      REPORT_STATUS_STYLES[report.status]
                    }`}
                  >
                    {REPORT_STATUS_LABELS[report.status]}
                  </span>
                </div>
              </div>

              <p className="rounded-xl bg-slate-50 p-3 text-xs leading-relaxed whitespace-pre-line text-slate-600">
                {report.description}
              </p>

              {report.location && (
                <p className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  {report.location}
                </p>
              )}

              {report.staffNote && (
                <p className="rounded-xl border border-slate-200 p-3 text-[11px] font-medium text-slate-600">
                  Reply sent: {report.staffNote}
                  {report.handledBy ? ` — ${report.handledBy.name}` : ""}
                </p>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => openTriage(report)}
                  className="pulse-button-primary px-4 py-2 text-xs"
                >
                  <span>Update status</span>
                </button>
              </div>
            </div>
          ))}

          {totalPages > 1 && (
            <div className="pulse-card flex items-center justify-between p-4 text-xs font-semibold text-slate-600">
              <span>
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Triage modal ── */}
      {target && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="pulse-card w-full max-w-md space-y-4 bg-white p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="kicker-label">UPDATE REPORT</p>
                <h3 className="text-lg font-extrabold text-slate-900">
                  {target.subject}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setTarget(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="flex-1">{error}</div>
              </div>
            )}

            <div>
              <label className="kicker-label mb-1.5 block">Status</label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    "open",
                    "in_review",
                    "resolved",
                    "dismissed",
                  ] as ReportStatus[]
                ).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setNextStatus(value)}
                    className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition-all ${
                      nextStatus === value
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-slate-50/50 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {REPORT_STATUS_LABELS[value]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="kicker-label mb-1.5 block">
                Reply to the reporter{" "}
                <span className="text-slate-400 normal-case">(Optional)</span>
              </label>
              <textarea
                rows={4}
                value={staffNote}
                onChange={(e) => setStaffNote(e.target.value)}
                placeholder="What was done, or what happens next. This goes to them by email."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm font-medium text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:outline-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="pulse-button-primary flex-1 py-2.5 text-xs"
              >
                {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Save and notify</span>
              </button>
              <button
                type="button"
                onClick={() => setTarget(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminReportsView
