"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { userService } from "@/services/user-service"
import {
  ApiError,
  ApprovalSortField,
  ApprovalStatus,
  SelfRegisterRole,
  UserProfile,
} from "@/lib/types"
import {
  AlertCircle,
  ArrowDownUp,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  IdCard,
  Loader2,
  Mail,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRoundCheck,
  X,
} from "lucide-react"

const STATUS_TABS: { value: ApprovalStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Declined" },
]

const ROLE_OPTIONS: { value: SelfRegisterRole | "all"; label: string }[] = [
  { value: "all", label: "All account types" },
  { value: "faculty", label: "Faculty" },
  { value: "student", label: "Student" },
]

const SORT_OPTIONS: { value: ApprovalSortField; label: string }[] = [
  { value: "createdAt", label: "Requested date" },
  { value: "emailVerifiedAt", label: "Verified date" },
  { value: "name", label: "Name" },
  { value: "email", label: "Email" },
  { value: "department", label: "Department" },
]

const PAGE_SIZE_OPTIONS = [6, 12, 24, 48]

const STATUS_BADGE: Record<ApprovalStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
}

const formatDate = (value?: string | null): string =>
  value
    ? new Date(value).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—"

/**
 * Admin queue of account requests. Pending faculty signups that verified their
 * email lead; the status tabs open the decided history with the same search,
 * filter, sort and paging controls.
 */
export function AdminApprovalsView() {
  const [requests, setRequests] = useState<UserProfile[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})

  const [statusFilter, setStatusFilter] = useState<ApprovalStatus>("pending")
  const [roleFilter, setRoleFilter] = useState<SelfRegisterRole | "all">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [sortBy, setSortBy] = useState<ApprovalSortField>("createdAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(12)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<UserProfile | null>(null)
  const [rejectReason, setRejectReason] = useState("")

  // Debounce the search box so typing does not fire a request per keystroke.
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(handler)
  }, [searchQuery])

  const loadRequests = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await userService.getPendingApprovals({
        approvalStatus: statusFilter,
        role: roleFilter === "all" ? undefined : roleFilter,
        searchTerm: debouncedSearch || undefined,
        sortBy,
        sortOrder,
        page,
        limit,
      })

      setRequests(res.data ?? [])
      setTotalCount(res.meta?.total ?? 0)
      setTotalPages(res.meta?.totalPages ?? 1)
      setCounts(res.meta?.counts ?? {})
    } catch (err: unknown) {
      setError(
        (err as ApiError)?.message || "Could not load account approvals."
      )
    } finally {
      setIsLoading(false)
    }
  }, [
    statusFilter,
    roleFilter,
    debouncedSearch,
    sortBy,
    sortOrder,
    page,
    limit,
  ])

  useEffect(() => {
    loadRequests()
  }, [loadRequests])

  const handleApprove = async (user: UserProfile) => {
    setBusyId(user.id)
    setError(null)
    setNotice(null)
    try {
      await userService.approveUser(user.id)
      setNotice(`${user.name} is approved and can sign in now.`)
      await loadRequests()
    } catch (err: unknown) {
      setError((err as ApiError)?.message || "Could not approve this account.")
    } finally {
      setBusyId(null)
    }
  }

  const handleReject = async () => {
    if (!rejectTarget) return

    if (rejectReason.trim().length < 5) {
      setError("Give the applicant a reason of at least 5 characters.")
      return
    }

    setBusyId(rejectTarget.id)
    setError(null)
    setNotice(null)
    try {
      await userService.rejectUser(rejectTarget.id, rejectReason.trim())
      setNotice(`${rejectTarget.name}'s request was declined.`)
      setRejectTarget(null)
      setRejectReason("")
      await loadRequests()
    } catch (err: unknown) {
      setError((err as ApiError)?.message || "Could not reject this account.")
    } finally {
      setBusyId(null)
    }
  }

  const handleClearFilters = () => {
    setSearchQuery("")
    setDebouncedSearch("")
    setRoleFilter("all")
    setSortBy("createdAt")
    setSortOrder("asc")
    setPage(1)
  }

  const hasActiveFilters = Boolean(
    debouncedSearch ||
    roleFilter !== "all" ||
    sortBy !== "createdAt" ||
    sortOrder !== "asc"
  )

  const startItem = totalCount === 0 ? 0 : (page - 1) * limit + 1
  const endItem = Math.min(totalCount, page * limit)

  const emptyMessage = useMemo(() => {
    if (debouncedSearch || roleFilter !== "all") {
      return "No account matches these filters."
    }
    if (statusFilter === "pending") {
      return "Verified faculty signups appear here for approval."
    }
    return `No ${statusFilter} account requests yet.`
  }, [debouncedSearch, roleFilter, statusFilter])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
            <UserRoundCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="kicker-label">ACCESS CONTROL</p>
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
              Account Approvals
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={loadRequests}
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

      {notice && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">{notice}</div>
        </div>
      )}

      {/* ── Filter toolbar ── */}
      <div className="pulse-card space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-100/80 p-1">
            {STATUS_TABS.map((tab) => {
              const isSelected = statusFilter === tab.value
              const tally = counts[tab.value]
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => {
                    setStatusFilter(tab.value)
                    setPage(1)
                  }}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-black transition-all ${
                    isSelected
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>{tab.label}</span>
                  {typeof tally === "number" && (
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                        isSelected
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

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="pulse-button-secondary px-3 py-1.5 text-xs"
            >
              <X className="h-3.5 w-3.5" />
              <span>Clear filters</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, email, faculty ID, department..."
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
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value as SelfRegisterRole | "all")
              setPage(1)
            }}
            className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs focus:border-slate-900 focus:outline-none"
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as ApprovalSortField)
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

      {/* ── Results ── */}
      {isLoading ? (
        <div className="pulse-card flex items-center justify-center p-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-900" />
        </div>
      ) : requests.length === 0 ? (
        <div className="pulse-card p-12 text-center">
          <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-bold text-slate-900">Nothing to show</p>
          <p className="mt-1 text-xs text-slate-500">{emptyMessage}</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {requests.map((user) => (
              <div key={user.id} className="pulse-card space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-extrabold text-slate-900">
                      {user.name}
                    </p>
                    <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-slate-500">
                      <Mail className="h-3.5 w-3.5" />
                      {user.email}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase ${
                      STATUS_BADGE[
                        (user.approvalStatus ?? "pending") as ApprovalStatus
                      ]
                    }`}
                  >
                    {user.approvalStatus === "pending" && (
                      <Clock className="h-3 w-3" />
                    )}
                    {user.approvalStatus ?? "pending"}
                  </span>
                </div>

                <div className="space-y-1.5 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                  <p className="inline-flex items-center gap-1.5">
                    <IdCard className="h-3.5 w-3.5 text-slate-400" />
                    {user.role === "faculty"
                      ? "Faculty ID"
                      : "Student ID"}:{" "}
                    <span className="font-bold text-slate-900">
                      {user.facultyId || user.studentId || "—"}
                    </span>
                  </p>
                  <p className="inline-flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                    {user.department || "—"}
                    {user.designation ? ` · ${user.designation}` : ""}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Requested {formatDate(user.createdAt)} · Email verified{" "}
                    {formatDate(user.emailVerifiedAt)}
                  </p>
                  {user.approvalStatus === "rejected" &&
                    user.rejectionReason && (
                      <p className="text-[11px] font-medium text-rose-600">
                        Reason: {user.rejectionReason}
                      </p>
                    )}
                </div>

                {user.approvalStatus === "pending" && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleApprove(user)}
                      disabled={busyId === user.id}
                      className="pulse-button-primary flex-1 py-2.5 text-xs"
                    >
                      {busyId === user.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      <span>Approve</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRejectTarget(user)
                        setRejectReason("")
                        setError(null)
                      }}
                      disabled={busyId === user.id}
                      className="flex-1 rounded-xl border border-rose-200 bg-white py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50"
                    >
                      Decline
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ── Pagination footer ── */}
          <div className="pulse-card flex flex-col items-center justify-between gap-3 p-4 text-xs font-semibold text-slate-600 sm:flex-row">
            <div className="flex items-center gap-3">
              <span>
                Showing <strong>{startItem}</strong> to{" "}
                <strong>{endItem}</strong> of <strong>{totalCount}</strong>{" "}
                request{totalCount === 1 ? "" : "s"}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Rows:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value))
                    setPage(1)
                  }}
                  className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-700 focus:outline-none"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage(1)}
                disabled={page <= 1}
                className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-transparent"
                title="First page"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-transparent"
                title="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="px-2.5 py-1 text-xs font-black text-slate-800">
                Page {page} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-transparent"
                title="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setPage(totalPages)}
                disabled={page >= totalPages}
                className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-transparent"
                title="Last page"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}

      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="pulse-card w-full max-w-md space-y-4 bg-white p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="kicker-label">DECLINE REQUEST</p>
                <h3 className="text-lg font-extrabold text-slate-900">
                  {rejectTarget.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="kicker-label mb-1.5 block">Reason *</label>
              <textarea
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="The applicant sees this message when they try to sign in."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm font-medium text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:outline-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleReject}
                disabled={busyId === rejectTarget.id}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-60"
              >
                {busyId === rejectTarget.id
                  ? "Declining..."
                  : "Confirm decline"}
              </button>
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
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

export default AdminApprovalsView
