"use client"

import React, { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/context/auth-context"
import { AuthGuard } from "@/components/shared/auth-guard"
import { markNoticesSeen } from "@/lib/notice-seen"
import { announcementService } from "@/services/announcement-service"
import { AnnouncementPriority, ApiError, Announcement } from "@/lib/types"
import {
  AUDIENCE_LABELS,
  PRIORITY_LABELS,
  PRIORITY_STYLES,
  formatNoticeDate,
} from "@/lib/announcement-labels"
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Megaphone,
  Pin,
  RefreshCw,
  Search,
  X,
} from "lucide-react"

const PRIORITY_FILTERS: {
  value: AnnouncementPriority | "all"
  label: string
}[] = [
  { value: "all", label: "All" },
  { value: "urgent", label: "Urgent" },
  { value: "important", label: "Important" },
  { value: "info", label: "Info" },
]

/**
 * The reader's notice feed. The API only ever returns live notices aimed at
 * this account's role, so nothing here needs to hide rows after the fact.
 */
/**
 * Public notice board at /notice. Opening it stamps "seen", which clears the
 * unread count on the navbar badge.
 */
export function NoticesView() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#f4f5f7] text-slate-900">
        <main className="mx-auto max-w-4xl px-4 pt-8 pb-24 sm:px-6 lg:px-8">
          <NoticeFeed />
        </main>
      </div>
    </AuthGuard>
  )
}

function NoticeFeed() {
  const { user } = useAuth()
  const [notices, setNotices] = useState<Announcement[]>([])
  const [priority, setPriority] = useState<AnnouncementPriority | "all">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(handler)
  }, [searchQuery])

  const loadNotices = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await announcementService.getMyAnnouncements({
        page,
        limit: 10,
        priority: priority === "all" ? undefined : priority,
        searchTerm: debouncedSearch || undefined,
      })
      setNotices(res.data ?? [])
      setTotalPages(res.meta?.totalPages ?? 1)
      setTotalCount(res.meta?.total ?? 0)
    } catch (err: unknown) {
      setError((err as ApiError)?.message || "Could not load notices.")
    } finally {
      setIsLoading(false)
    }
  }, [page, priority, debouncedSearch])

  useEffect(() => {
    loadNotices()
  }, [loadNotices])

  // Reading the board is what marks notices seen; the badge recounts from here.
  useEffect(() => {
    markNoticesSeen(user?.id)
  }, [user?.id])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
            <Megaphone className="h-5 w-5" />
          </div>
          <div>
            <p className="kicker-label">FROM THE LIBRARY</p>
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
              Notices{" "}
              {totalCount > 0 && (
                <span className="text-slate-400">({totalCount})</span>
              )}
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={loadNotices}
          disabled={isLoading}
          className="pulse-button-secondary px-3 py-1.5 text-xs"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
          />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">{error}</div>
        </div>
      )}

      <div className="pulse-card flex flex-wrap items-center gap-2.5 p-4">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notices..."
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

        <div className="flex items-center gap-1.5 rounded-xl bg-slate-100/80 p-1">
          {PRIORITY_FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setPriority(option.value)
                setPage(1)
              }}
              className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-black transition-all ${
                priority === option.value
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="pulse-card flex items-center justify-center p-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-900" />
        </div>
      ) : notices.length === 0 ? (
        <div className="pulse-card p-12 text-center">
          <Megaphone className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-bold text-slate-900">
            No notices right now
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Library announcements aimed at your account appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notices.map((notice) => {
            const style = PRIORITY_STYLES[notice.priority]
            return (
              <article
                key={notice.id}
                className={`pulse-card border-l-4 p-5 ${style.accent}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {notice.isPinned && (
                      <Pin className="h-3.5 w-3.5 text-slate-400" />
                    )}
                    <h3 className="text-sm font-extrabold text-slate-900">
                      {notice.title}
                    </h3>
                  </div>
                  <span
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase ${style.badge}`}
                  >
                    {PRIORITY_LABELS[notice.priority]}
                  </span>
                </div>

                <p className="mt-2.5 text-xs leading-relaxed whitespace-pre-line text-slate-600">
                  {notice.content}
                </p>

                <p className="mt-3 text-[11px] text-slate-400">
                  {formatNoticeDate(notice.publishedAt)}
                  {notice.createdBy ? ` · ${notice.createdBy.name}` : ""} ·{" "}
                  {AUDIENCE_LABELS[notice.audience]}
                  {notice.expiresAt
                    ? ` · until ${formatNoticeDate(notice.expiresAt)}`
                    : ""}
                </p>
              </article>
            )
          })}

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
    </div>
  )
}

export default NoticesView
