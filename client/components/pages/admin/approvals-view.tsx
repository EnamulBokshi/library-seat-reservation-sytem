"use client";

import React, { useCallback, useEffect, useState } from "react";
import { userService } from "@/services/user-service";
import { ApiError, UserProfile } from "@/lib/types";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  IdCard,
  Loader2,
  Mail,
  RefreshCw,
  ShieldCheck,
  UserRoundCheck,
  X,
} from "lucide-react";

const formatDate = (value?: string | null): string =>
  value
    ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "—";

/**
 * Admin queue of faculty signups that verified their email and now wait for a
 * decision. Approving activates the account; rejecting records a reason the
 * applicant sees when they try to sign in.
 */
export function AdminApprovalsView() {
  const [pending, setPending] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<UserProfile | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const loadPending = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await userService.getPendingApprovals();
      setPending(res.data ?? []);
    } catch (err: unknown) {
      setError((err as ApiError)?.message || "Could not load pending approvals.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  const handleApprove = async (user: UserProfile) => {
    setBusyId(user.id);
    setError(null);
    setNotice(null);
    try {
      await userService.approveUser(user.id);
      setNotice(`${user.name} is approved and can sign in now.`);
      setPending((prev) => prev.filter((u) => u.id !== user.id));
    } catch (err: unknown) {
      setError((err as ApiError)?.message || "Could not approve this account.");
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;

    if (rejectReason.trim().length < 5) {
      setError("Give the applicant a reason of at least 5 characters.");
      return;
    }

    setBusyId(rejectTarget.id);
    setError(null);
    setNotice(null);
    try {
      await userService.rejectUser(rejectTarget.id, rejectReason.trim());
      setNotice(`${rejectTarget.name}'s request was declined.`);
      setPending((prev) => prev.filter((u) => u.id !== rejectTarget.id));
      setRejectTarget(null);
      setRejectReason("");
    } catch (err: unknown) {
      setError((err as ApiError)?.message || "Could not reject this account.");
    } finally {
      setBusyId(null);
    }
  };

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
              Pending Faculty Approvals
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={loadPending}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-slate-300"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
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

      {isLoading ? (
        <div className="pulse-card flex items-center justify-center p-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-900" />
        </div>
      ) : pending.length === 0 ? (
        <div className="pulse-card p-12 text-center">
          <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-bold text-slate-900">No requests waiting</p>
          <p className="mt-1 text-xs text-slate-500">
            Verified faculty signups appear here for approval.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {pending.map((user) => (
            <div key={user.id} className="pulse-card space-y-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-extrabold text-slate-900">{user.name}</p>
                  <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-slate-500">
                    <Mail className="h-3.5 w-3.5" />
                    {user.email}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                  <Clock className="h-3 w-3" />
                  PENDING
                </span>
              </div>

              <div className="space-y-1.5 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                <p className="inline-flex items-center gap-1.5">
                  <IdCard className="h-3.5 w-3.5 text-slate-400" />
                  Faculty ID: <span className="font-bold text-slate-900">{user.facultyId || "—"}</span>
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
              </div>

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
                    setRejectTarget(user);
                    setRejectReason("");
                    setError(null);
                  }}
                  disabled={busyId === user.id}
                  className="flex-1 rounded-xl border border-rose-200 bg-white py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="pulse-card w-full max-w-md space-y-4 bg-white p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="kicker-label">DECLINE REQUEST</p>
                <h3 className="text-lg font-extrabold text-slate-900">{rejectTarget.name}</h3>
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
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm font-medium text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleReject}
                disabled={busyId === rejectTarget.id}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-60"
              >
                {busyId === rejectTarget.id ? "Declining..." : "Confirm decline"}
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
  );
}

export default AdminApprovalsView;
