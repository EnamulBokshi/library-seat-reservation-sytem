"use client"

import React, { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { announcementService } from "@/services/announcement-service"
import { Announcement } from "@/lib/types"
import {
  PRIORITY_LABELS,
  PRIORITY_STYLES,
  formatNoticeDate,
} from "@/lib/announcement-labels"
import { ArrowRight, Loader2, Megaphone, Pin } from "lucide-react"

/** How many notices the home board shows before deferring to the full feed. */
const HOME_NOTICE_LIMIT = 3

/**
 * Notice board on the library home page.
 *
 * The feed endpoint needs a session and scopes notices to the reader's role,
 * so the board renders only for signed-in accounts and disappears entirely
 * when there is nothing to show — an empty card on the home page would be
 * noise, not information.
 */
export function NoticeBoard({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [notices, setNotices] = useState<Announcement[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [hasFailed, setHasFailed] = useState(false)

  const loadNotices = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const res = await announcementService.getMyAnnouncements({
        limit: HOME_NOTICE_LIMIT,
      })
      setNotices(res.data ?? [])
      setTotal(res.meta?.total ?? 0)
      setHasFailed(false)
    } catch {
      // The home page must still render without notices.
      setHasFailed(true)
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    loadNotices()
  }, [loadNotices])

  if (!isAuthenticated || hasFailed) {
    return null
  }

  if (isLoading) {
    return (
      <section className="pulse-card flex items-center justify-center p-10">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </section>
    )
  }

  if (notices.length === 0) {
    return null
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white">
            <Megaphone className="h-4 w-4" />
          </span>
          <div>
            <p className="kicker-label">FROM THE LIBRARY</p>
            <h2 className="text-base font-extrabold tracking-tight text-slate-900">
              Notices{" "}
              {total > 0 && <span className="text-slate-400">({total})</span>}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/notice"
            className="pulse-button-secondary px-3 py-1.5 text-xs"
          >
            <span>All notices</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {notices.map((notice) => {
          const style = PRIORITY_STYLES[notice.priority]
          return (
            <Link
              key={notice.id}
              href="/notice"
              className={`pulse-card border-l-4 p-4 transition-shadow hover:shadow-sm ${style.accent}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {notice.isPinned && (
                    <Pin className="h-3 w-3 shrink-0 text-slate-400" />
                  )}
                  <h3 className="text-xs leading-snug font-extrabold text-slate-900">
                    {notice.title}
                  </h3>
                </div>
                <span
                  className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${style.badge}`}
                >
                  {PRIORITY_LABELS[notice.priority]}
                </span>
              </div>

              <p className="mt-2 line-clamp-3 text-[11px] leading-relaxed text-slate-600">
                {notice.content}
              </p>

              <p className="mt-2.5 text-[10px] font-semibold text-slate-400">
                {formatNoticeDate(notice.publishedAt)}
              </p>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

export default NoticeBoard
