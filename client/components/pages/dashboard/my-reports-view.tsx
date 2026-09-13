"use client"

import React, { useCallback, useEffect, useState } from "react"
import { reportService } from "@/services/report-service"
import { ApiError, Report, ReportStatus } from "@/lib/types"
import {
  REPORT_CATEGORY_LABELS,
  REPORT_STATUS_LABELS,
  REPORT_STATUS_STYLES,
  formatNoticeDate,
} from "@/lib/announcement-labels"
import { ReportIssueModal } from "@/components/shared/report-issue-modal"
import {
  AlertCircle,
  Inbox,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
} from "lucide-react"

const STATUS_TABS: { value: ReportStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "in_review", label: "Under review" },
  { value: "resolved", label: "Resolved" },
  { value: "dismissed", label: "Closed" },
]

/**
 * The reporter's own history. Writing a report happens in
 * `ReportIssueModal`, which every entry point in the app shares, so this page
 * is only ever a record of what was raised and what the library did with it.
 */
export function MyReportsView() {
  const [reports, setReports] = useState<Report[]>([])
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "all">("all")
  const [openCount, setOpenCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const loadReports = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await reportService.getMyReports({
        limit: 30,
        status: statusFilter === "all" ? undefined : statusFilter,
      })
      setReports(res.data ?? [])
      setOpenCount(res.meta?.counts?.open ?? 0)
    } catch (err: unknown) {
      setError((err as ApiError)?.message || "Could not load your reports.")
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
            <Inbox className="h-5 w-5" />
          </div>
          <div>
            <p className="kicker-label">MEMBER REPORTS</p>
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
              My reports{" "}
              {openCount > 0 && (
                <span className="text-slate-400">({openCount} open)</span>
              )}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="pulse-button-primary px-4 py-2 text-xs"
          >
            <Plus className="h-4 w-4" />
            <span>New report</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">{error}</div>
        </div>
      )}

      <div className="pulse-card flex flex-wrap items-center gap-1.5 p-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setStatusFilter(tab.value)}
            className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-black transition-all ${
              statusFilter === tab.value
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="pulse-card flex items-center justify-center p-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-900" />
        </div>
      ) : reports.length === 0 ? (
        <div className="pulse-card p-12 text-center">
          <Inbox className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-bold text-slate-900">
            Nothing reported yet
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Found a bug, a broken seat or anything else? Tell the library.
          </p>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="pulse-button-primary mt-4 px-4 py-2 text-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Report an issue</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map((report) => (
            <div key={report.id} className="pulse-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-extrabold text-slate-900">
                  {report.subject}
                </p>
                <span
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase ${
                    REPORT_STATUS_STYLES[report.status]
                  }`}
                >
                  {REPORT_STATUS_LABELS[report.status]}
                </span>
              </div>

              <p className="mt-1.5 text-[11px] leading-relaxed whitespace-pre-line text-slate-500">
                {report.description}
              </p>

              <p className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                <span>{REPORT_CATEGORY_LABELS[report.category]}</span>
                <span>·</span>
                <span>{formatNoticeDate(report.createdAt)}</span>
                {report.location && (
                  <>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {report.location}
                    </span>
                  </>
                )}
              </p>

              {report.staffNote && (
                <p className="mt-2.5 rounded-lg bg-slate-50 p-2.5 text-[11px] font-medium text-slate-600">
                  Library reply: {report.staffNote}
                  {report.handledBy ? ` — ${report.handledBy.name}` : ""}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <ReportIssueModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmitted={loadReports}
      />
    </div>
  )
}

export default MyReportsView
