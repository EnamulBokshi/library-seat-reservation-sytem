import {
  AnnouncementAudience,
  AnnouncementPriority,
  ReportCategory,
  ReportStatus,
} from "./types"

/** Who a notice targets, in words. */
export const AUDIENCE_LABELS: Record<AnnouncementAudience, string> = {
  all: "Everyone",
  students: "Students",
  faculty: "Faculty",
  staff: "Library staff",
}

export const PRIORITY_LABELS: Record<AnnouncementPriority, string> = {
  info: "Info",
  important: "Important",
  urgent: "Urgent",
}

/** Tailwind classes per priority, used on both the feed and the admin list. */
export const PRIORITY_STYLES: Record<
  AnnouncementPriority,
  { badge: string; accent: string }
> = {
  info: { badge: "bg-slate-200 text-slate-700", accent: "border-l-slate-300" },
  important: {
    badge: "bg-amber-100 text-amber-700",
    accent: "border-l-amber-400",
  },
  urgent: { badge: "bg-rose-100 text-rose-700", accent: "border-l-rose-500" },
}

export const REPORT_CATEGORY_LABELS: Record<ReportCategory, string> = {
  bug: "System bug",
  service: "Library service",
  facilities: "Facilities",
  environment: "Study environment",
  book: "Book or catalogue",
  other: "Other",
}

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  open: "Open",
  in_review: "Under review",
  resolved: "Resolved",
  dismissed: "Closed",
}

export const REPORT_STATUS_STYLES: Record<ReportStatus, string> = {
  open: "bg-amber-100 text-amber-700",
  in_review: "bg-indigo-100 text-indigo-700",
  resolved: "bg-emerald-100 text-emerald-700",
  dismissed: "bg-slate-200 text-slate-600",
}

/** Absolute date, or a relative phrase for anything inside the last week. */
export const formatNoticeDate = (value?: string | null): string => {
  if (!value) return "—"

  const date = new Date(value)
  const diffMs = Date.now() - date.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)

  if (diffHours < 1 && diffHours >= 0) return "Just now"
  if (diffHours < 24 && diffHours >= 0) return `${Math.floor(diffHours)}h ago`
  if (diffHours < 24 * 7 && diffHours >= 0)
    return `${Math.floor(diffHours / 24)}d ago`

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}
