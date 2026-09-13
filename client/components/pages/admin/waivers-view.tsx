"use client";

import React, { useCallback, useEffect, useState } from "react";
import { waiverService } from "@/services/waiver-service";
import { ApiError, FineWaiverRequest, WaiverRequestStatus } from "@/lib/types";
import {
  AlertCircle,
  Armchair,
  BookOpen,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";

const STATUS_TABS: { value: WaiverRequestStatus | "all"; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Declined" },
  { value: "all", label: "All" },
];

const STATUS_BADGE: Record<WaiverRequestStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
};

const formatDate = (value?: string | null): string =>
  value
    ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "—";

/**
 * Admin review queue for faculty fine-waiver petitions. Approving here waives
 * the underlying seat or loan fine through the normal fine settlement path.
 */
export function AdminWaiversView() {
  const [requests, setRequests] = useState<FineWaiverRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<WaiverRequestStatus | "all">("pending");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [declineTarget, setDeclineTarget] = useState<FineWaiverRequest | null>(null);
  const [decisionNote, setDecisionNote] = useState("");

  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await waiverService.getAllRequests(
        statusFilter === "all" ? { limit: 50 } : { status: statusFilter, limit: 50 }
      );
      setRequests(res.data ?? []);
    } catch (err: unknown) {
      setError((err as ApiError)?.message || "Could not load waiver requests.");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const decide = async (
    request: FineWaiverRequest,
    status: "approved" | "rejected",
    note?: string
  ) => {
    setBusyId(request.id);
    setError(null);
    setNotice(null);
    try {
      await waiverService.decideRequest(request.id, { status, decisionNote: note });
      setNotice(
        status === "approved"
          ? `Waived ${request.amount} BDT for ${request.targetUser.name}.`
          : `Declined the request for ${request.targetUser.name}.`
      );
      setDeclineTarget(null);
      setDecisionNote("");
      await loadRequests();
    } catch (err: unknown) {
      setError((err as ApiError)?.message || "Could not record that decision.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="kicker-label">WAIVER QUEUE</p>
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
              Faculty Fine Waiver Requests
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={loadRequests}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-slate-300"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setStatusFilter(tab.value)}
            className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
              statusFilter === tab.value
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
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
      ) : requests.length === 0 ? (
        <div className="pulse-card p-12 text-center">
          <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-bold text-slate-900">Nothing in this queue</p>
          <p className="mt-1 text-xs text-slate-500">Faculty petitions appear here for a decision.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => {
            const isSeatFine = Boolean(request.bookingId);
            const FineIcon = isSeatFine ? Armchair : BookOpen;

            return (
              <div key={request.id} className="pulse-card space-y-4 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                      <FineIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-slate-900">
                        {request.amount} BDT · {request.targetUser.name}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {isSeatFine ? "Seat reservation fine" : "Book loan fine"} · requested by{" "}
                        {request.requestedBy.name}
                        {request.requestedBy.department ? ` (${request.requestedBy.department})` : ""}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase ${
                      STATUS_BADGE[request.status]
                    }`}
                  >
                    {request.status === "pending" && <Clock className="h-3 w-3" />}
                    {request.status}
                  </span>
                </div>

                <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                  <p className="font-medium text-slate-900">{request.reason}</p>
                  <p className="mt-1.5 text-[11px] text-slate-400">
                    Raised {formatDate(request.createdAt)}
                    {request.decidedAt ? ` · Decided ${formatDate(request.decidedAt)}` : ""}
                  </p>
                  {request.decisionNote && (
                    <p className="mt-1.5 text-[11px] font-medium text-slate-500">
                      Note: {request.decisionNote}
                    </p>
                  )}
                </div>

                {request.status === "pending" && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => decide(request, "approved")}
                      disabled={busyId === request.id}
                      className="pulse-button-primary flex-1 py-2.5 text-xs"
                    >
                      {busyId === request.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      <span>Approve &amp; waive fine</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeclineTarget(request);
                        setDecisionNote("");
                      }}
                      disabled={busyId === request.id}
                      className="flex-1 rounded-xl border border-rose-200 bg-white py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50"
                    >
                      Decline
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {declineTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="pulse-card w-full max-w-md space-y-4 bg-white p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="kicker-label">DECLINE WAIVER</p>
                <h3 className="text-lg font-extrabold text-slate-900">
                  {declineTarget.amount} BDT · {declineTarget.targetUser.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDeclineTarget(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="kicker-label mb-1.5 block">
                Note <span className="normal-case text-slate-400">(Optional)</span>
              </label>
              <textarea
                rows={4}
                value={decisionNote}
                onChange={(e) => setDecisionNote(e.target.value)}
                placeholder="The requesting faculty member receives this note by email."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm font-medium text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => decide(declineTarget, "rejected", decisionNote.trim() || undefined)}
                disabled={busyId === declineTarget.id}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-60"
              >
                {busyId === declineTarget.id ? "Declining..." : "Confirm decline"}
              </button>
              <button
                type="button"
                onClick={() => setDeclineTarget(null)}
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

export default AdminWaiversView;
