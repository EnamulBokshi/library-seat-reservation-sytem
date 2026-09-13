"use client"

import React, { useCallback, useEffect, useState } from "react"
import { announcementService } from "@/services/announcement-service"
import {
  Announcement,
  AnnouncementAudience,
  AnnouncementPriority,
  ApiError,
  CreateAnnouncementPayload,
} from "@/lib/types"
import {
  AUDIENCE_LABELS,
  PRIORITY_LABELS,
  PRIORITY_STYLES,
  formatNoticeDate,
} from "@/lib/announcement-labels"
import {
  AlertCircle,
  Archive,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Megaphone,
  Pencil,
  Pin,
  PinOff,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react"

const AUDIENCES: AnnouncementAudience[] = [
  "all",
  "students",
  "faculty",
  "staff",
]
const PRIORITIES: AnnouncementPriority[] = ["info", "important", "urgent"]

const STATE_TABS: { value: "live" | "retired" | "all"; label: string }[] = [
  { value: "live", label: "Active" },
  { value: "retired", label: "Retired" },
  { value: "all", label: "All" },
]

const FIELD_CLASS =
  "w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"

const emptyDraft: CreateAnnouncementPayload = {
  title: "",
  content: "",
  audience: "all",
  priority: "info",
  isPinned: false,
  expiresAt: null,
}

/** Editor state: a new notice, or an existing one being edited. */
type EditorState = { mode: "create" } | { mode: "edit"; notice: Announcement }

/**
 * Staff console for library notices: publish, schedule, pin, edit and retire.
 * Retiring is a soft action — a notice the library has already shown is part
 * of the record, so it is never deleted outright.
 */
export function AdminAnnouncementsView() {
  const [notices, setNotices] = useState<Announcement[]>([])
  const [stateTab, setStateTab] = useState<"live" | "retired" | "all">("live")
  const [audienceFilter, setAudienceFilter] = useState<
    AnnouncementAudience | "all-audiences"
  >("all-audiences")
  const [priorityFilter, setPriorityFilter] = useState<
    AnnouncementPriority | "any"
  >("any")
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [liveCount, setLiveCount] = useState(0)

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [editor, setEditor] = useState<EditorState | null>(null)
  const [draft, setDraft] = useState<CreateAnnouncementPayload>(emptyDraft)
  const [isSaving, setIsSaving] = useState(false)

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
      const res = await announcementService.getAll({
        page,
        limit: 12,
        isActive: stateTab === "all" ? undefined : stateTab === "live",
        audience:
          audienceFilter === "all-audiences" ? undefined : audienceFilter,
        priority: priorityFilter === "any" ? undefined : priorityFilter,
        searchTerm: debouncedSearch || undefined,
      })
      setNotices(res.data ?? [])
      setTotalPages(res.meta?.totalPages ?? 1)
      setTotalCount(res.meta?.total ?? 0)
      setLiveCount(res.meta?.counts?.live ?? 0)
    } catch (err: unknown) {
      setError((err as ApiError)?.message || "Could not load notices.")
    } finally {
      setIsLoading(false)
    }
  }, [page, stateTab, audienceFilter, priorityFilter, debouncedSearch])

  useEffect(() => {
    loadNotices()
  }, [loadNotices])

  const openCreate = () => {
    setDraft(emptyDraft)
    setEditor({ mode: "create" })
    setError(null)
  }

  const openEdit = (target: Announcement) => {
    setDraft({
      title: target.title,
      content: target.content,
      audience: target.audience,
      priority: target.priority,
      isPinned: target.isPinned,
      // The date input wants YYYY-MM-DD, never a full ISO timestamp.
      expiresAt: target.expiresAt ? target.expiresAt.slice(0, 10) : null,
    })
    setEditor({ mode: "edit", notice: target })
    setError(null)
  }

  const handleSave = async () => {
    if (!editor) return

    if (draft.title.trim().length < 4 || draft.content.trim().length < 10) {
      setError("A notice needs a title of 4+ characters and text of 10+.")
      return
    }

    const payload: CreateAnnouncementPayload = {
      ...draft,
      title: draft.title.trim(),
      content: draft.content.trim(),
      // A bare date means end of that day, not midnight at its start.
      expiresAt: draft.expiresAt
        ? new Date(`${draft.expiresAt}T23:59:59`).toISOString()
        : null,
    }

    setIsSaving(true)
    setError(null)
    try {
      if (editor.mode === "create") {
        await announcementService.create(payload)
        setNotice("Notice published.")
      } else {
        await announcementService.update(editor.notice.id, payload)
        setNotice("Notice updated.")
      }
      setEditor(null)
      await loadNotices()
    } catch (err: unknown) {
      setError((err as ApiError)?.message || "Could not save the notice.")
    } finally {
      setIsSaving(false)
    }
  }

  const togglePin = async (target: Announcement) => {
    setBusyId(target.id)
    try {
      await announcementService.update(target.id, {
        isPinned: !target.isPinned,
      })
      await loadNotices()
    } catch (err: unknown) {
      setError((err as ApiError)?.message || "Could not change the pin.")
    } finally {
      setBusyId(null)
    }
  }

  const retire = async (target: Announcement) => {
    setBusyId(target.id)
    try {
      await announcementService.retire(target.id)
      setNotice(`"${target.title}" is retired. Readers no longer see it.`)
      await loadNotices()
    } catch (err: unknown) {
      setError((err as ApiError)?.message || "Could not retire the notice.")
    } finally {
      setBusyId(null)
    }
  }

  const republish = async (target: Announcement) => {
    setBusyId(target.id)
    try {
      await announcementService.update(target.id, { isActive: true })
      setNotice(`"${target.title}" is live again.`)
      await loadNotices()
    } catch (err: unknown) {
      setError((err as ApiError)?.message || "Could not republish the notice.")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
            <Megaphone className="h-5 w-5" />
          </div>
          <div>
            <p className="kicker-label">LIBRARY NOTICES</p>
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
              Announcements{" "}
              <span className="text-slate-400">({liveCount} live)</span>
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
          <button
            type="button"
            onClick={openCreate}
            className="pulse-button-primary px-4 py-2 text-xs"
          >
            <Plus className="h-4 w-4" />
            <span>New notice</span>
          </button>
        </div>
      </div>

      {error && !editor && (
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
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-100/80 p-1">
            {STATE_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => {
                  setStateTab(tab.value)
                  setPage(1)
                }}
                className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-black transition-all ${
                  stateTab === tab.value
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <span className="text-xs font-semibold text-slate-400">
            {totalCount} total
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title or text..."
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
            value={audienceFilter}
            onChange={(e) => {
              setAudienceFilter(
                e.target.value as AnnouncementAudience | "all-audiences"
              )
              setPage(1)
            }}
            className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs focus:border-slate-900 focus:outline-none"
          >
            <option value="all-audiences">Every audience</option>
            {AUDIENCES.map((value) => (
              <option key={value} value={value}>
                {AUDIENCE_LABELS[value]}
              </option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value as AnnouncementPriority | "any")
              setPage(1)
            }}
            className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs focus:border-slate-900 focus:outline-none"
          >
            <option value="any">Any priority</option>
            {PRIORITIES.map((value) => (
              <option key={value} value={value}>
                {PRIORITY_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── List ── */}
      {isLoading ? (
        <div className="pulse-card flex items-center justify-center p-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-900" />
        </div>
      ) : notices.length === 0 ? (
        <div className="pulse-card p-12 text-center">
          <Megaphone className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-bold text-slate-900">No notices here</p>
          <p className="mt-1 text-xs text-slate-500">
            Publish one and it reaches its audience immediately.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notices.map((item) => {
            const style = PRIORITY_STYLES[item.priority]
            const isExpired = Boolean(
              item.expiresAt && new Date(item.expiresAt) <= new Date()
            )
            const isScheduled = new Date(item.publishedAt) > new Date()

            return (
              <div
                key={item.id}
                className={`pulse-card border-l-4 p-5 ${style.accent}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {item.isPinned && (
                      <Pin className="h-3.5 w-3.5 text-slate-400" />
                    )}
                    <h3 className="text-sm font-extrabold text-slate-900">
                      {item.title}
                    </h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase ${style.badge}`}
                    >
                      {PRIORITY_LABELS[item.priority]}
                    </span>
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                      {AUDIENCE_LABELS[item.audience]}
                    </span>
                    {!item.isActive && (
                      <span className="rounded-lg bg-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-600 uppercase">
                        Retired
                      </span>
                    )}
                    {item.isActive && isScheduled && (
                      <span className="rounded-lg bg-indigo-100 px-2.5 py-1 text-[11px] font-bold text-indigo-700 uppercase">
                        Scheduled
                      </span>
                    )}
                    {item.isActive && isExpired && (
                      <span className="rounded-lg bg-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-600 uppercase">
                        Expired
                      </span>
                    )}
                  </div>
                </div>

                <p className="mt-2.5 text-xs leading-relaxed whitespace-pre-line text-slate-600">
                  {item.content}
                </p>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] text-slate-400">
                    {isScheduled ? "Publishes" : "Published"}{" "}
                    {formatNoticeDate(item.publishedAt)}
                    {item.createdBy ? ` · ${item.createdBy.name}` : ""}
                    {item.expiresAt
                      ? ` · expires ${formatNoticeDate(item.expiresAt)}`
                      : ""}
                  </p>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => togglePin(item)}
                      disabled={busyId === item.id || !item.isActive}
                      className="pulse-button-secondary px-2.5 py-1.5 text-xs"
                      title={
                        item.isPinned ? "Unpin" : "Pin to the top of the feed"
                      }
                    >
                      {item.isPinned ? (
                        <PinOff className="h-3.5 w-3.5" />
                      ) : (
                        <Pin className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      disabled={busyId === item.id}
                      className="pulse-button-secondary px-2.5 py-1.5 text-xs"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    {item.isActive ? (
                      <button
                        type="button"
                        onClick={() => retire(item)}
                        disabled={busyId === item.id}
                        className="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50"
                      >
                        <Archive className="mr-1 inline h-3.5 w-3.5" />
                        Retire
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => republish(item)}
                        disabled={busyId === item.id}
                        className="pulse-button-secondary px-3 py-1.5 text-xs"
                      >
                        Republish
                      </button>
                    )}
                  </div>
                </div>
              </div>
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

      {/* ── Editor ── */}
      {editor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4">
          <div className="pulse-card my-8 w-full max-w-lg space-y-4 bg-white p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="kicker-label">
                  {editor.mode === "create" ? "NEW NOTICE" : "EDIT NOTICE"}
                </p>
                <h3 className="text-lg font-extrabold text-slate-900">
                  {editor.mode === "create"
                    ? "Publish a notice"
                    : editor.notice.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditor(null)}
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
              <label className="kicker-label mb-1.5 block">Title *</label>
              <input
                type="text"
                value={draft.title}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, title: e.target.value }))
                }
                placeholder="Library closes early on Friday"
                className={FIELD_CLASS}
              />
            </div>

            <div>
              <label className="kicker-label mb-1.5 block">Notice *</label>
              <textarea
                rows={5}
                value={draft.content}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, content: e.target.value }))
                }
                placeholder="What readers need to know, in plain words."
                className={FIELD_CLASS}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="kicker-label mb-1.5 block">Audience</label>
                <select
                  value={draft.audience}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      audience: e.target.value as AnnouncementAudience,
                    }))
                  }
                  className={`${FIELD_CLASS} cursor-pointer`}
                >
                  {AUDIENCES.map((value) => (
                    <option key={value} value={value}>
                      {AUDIENCE_LABELS[value]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="kicker-label mb-1.5 block">Priority</label>
                <select
                  value={draft.priority}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      priority: e.target.value as AnnouncementPriority,
                    }))
                  }
                  className={`${FIELD_CLASS} cursor-pointer`}
                >
                  {PRIORITIES.map((value) => (
                    <option key={value} value={value}>
                      {PRIORITY_LABELS[value]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="kicker-label mb-1.5 block">
                  Expires{" "}
                  <span className="text-slate-400 normal-case">(Optional)</span>
                </label>
                <input
                  type="date"
                  value={draft.expiresAt ?? ""}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      expiresAt: e.target.value || null,
                    }))
                  }
                  className={FIELD_CLASS}
                />
              </div>

              <label className="flex cursor-pointer items-center gap-2.5 self-end rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5">
                <input
                  type="checkbox"
                  checked={draft.isPinned ?? false}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, isPinned: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-slate-300 accent-slate-900"
                />
                <span className="text-xs font-bold text-slate-700">
                  Pin to the top
                </span>
              </label>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="pulse-button-primary flex-1 py-2.5 text-xs"
              >
                {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>
                  {editor.mode === "create" ? "Publish notice" : "Save changes"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setEditor(null)}
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

export default AdminAnnouncementsView
