"use client";

import React, { useCallback, useEffect, useState } from "react";
import { waiverService } from "@/services/waiver-service";
import {
  ApiError,
  FineWaiverRequest,
  PetitionableFine,
  StudentFineLookup,
  WaiverRequestStatus,
} from "@/lib/types";
import {
  AlertCircle,
  Armchair,
  BookOpen,
  CheckCircle2,
  Clock,
  Loader2,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";

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
 * Faculty privilege screen: look a student up by ID or email, then petition an
 * admin to clear one of their outstanding fines. Only unpaid fines are listed.
 */
export function FacultyWaiversView() {
  const [identifier, setIdentifier] = useState("");
  const [lookup, setLookup] = useState<StudentFineLookup | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [myRequests, setMyRequests] = useState<FineWaiverRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [petitionTarget, setPetitionTarget] = useState<PetitionableFine | null>(null);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadMyRequests = useCallback(async () => {
    setIsLoadingRequests(true);
    try {
      const res = await waiverService.getMyRequests();
      setMyRequests(res.data ?? []);
    } catch (err: unknown) {
      setError((err as ApiError)?.message || "Could not load your waiver requests.");
    } finally {
      setIsLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    loadMyRequests();
  }, [loadMyRequests]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!identifier.trim()) {
      setError("Enter a student ID, email address or account id.");
      return;
    }

    setIsSearching(true);
    try {
      const res = await waiverService.lookupStudentFines(identifier.trim());
      setLookup(res.data ?? null);
    } catch (err: unknown) {
      setLookup(null);
      setError((err as ApiError)?.message || "Could not find that account.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmitPetition = async () => {
    if (!petitionTarget || !lookup) return;

    if (reason.trim().length < 10) {
      setError("Explain the request in at least 10 characters.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await waiverService.createRequest({
        targetUserId: lookup.student.id,
        bookingId: petitionTarget.source === "booking" ? petitionTarget.id : undefined,
        loanId: petitionTarget.source === "loan" ? petitionTarget.id : undefined,
        reason: reason.trim(),
      });

      setNotice(
        `Waiver request for ${petitionTarget.amount} BDT sent to the administrators for review.`
      );
      setPetitionTarget(null);
      setReason("");

      // Refresh both panes so the fine shows as already petitioned.
      const res = await waiverService.lookupStudentFines(lookup.student.id);
      setLookup(res.data ?? null);
      await loadMyRequests();
    } catch (err: unknown) {
      setError((err as ApiError)?.message || "Could not submit the request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
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

      {/* ── Student lookup ── */}
      <div className="pulse-card space-y-4 p-5">
        <div>
          <p className="kicker-label">STEP 1</p>
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900">Find the student</h2>
          <p className="mt-1 text-xs text-slate-500">
            Search by student ID, email address or account id to list their outstanding fines.
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex flex-wrap gap-2">
          <div className="relative min-w-[240px] flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="STU-12345 or student@university.edu"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-10 pr-4 text-sm font-medium text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
          <button type="submit" disabled={isSearching} className="pulse-button-primary px-6 py-3 text-xs">
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            <span>Search</span>
          </button>
        </form>
      </div>

      {/* ── Fines found ── */}
      {lookup && (
        <div className="pulse-card space-y-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="kicker-label">STEP 2</p>
              <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
                {lookup.student.name}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {lookup.student.email}
                {lookup.student.studentId ? ` · ${lookup.student.studentId}` : ""}
              </p>
            </div>
            <div className="rounded-xl bg-slate-900 px-4 py-2 text-right text-white">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                Unpaid dues
              </p>
              <p className="text-lg font-extrabold">{lookup.totalUnpaid} BDT</p>
            </div>
          </div>

          {lookup.fines.length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-4 text-xs font-medium text-slate-500">
              This account has no unpaid fines to petition.
            </p>
          ) : (
            <div className="space-y-2">
              {lookup.fines.map((fine) => {
                const FineIcon = fine.source === "booking" ? Armchair : BookOpen;
                return (
                  <div
                    key={`${fine.source}-${fine.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                        <FineIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-extrabold text-slate-900">
                          {fine.amount} BDT · {fine.subject}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {fine.reason || "—"} · {formatDate(fine.incurredAt)}
                        </p>
                      </div>
                    </div>

                    {fine.hasPendingRequest ? (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                        <Clock className="h-3 w-3" />
                        REQUEST PENDING
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setPetitionTarget(fine);
                          setReason("");
                          setError(null);
                        }}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-slate-300"
                      >
                        Request waiver
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── My requests ── */}
      <div className="pulse-card space-y-4 p-5">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="kicker-label">MY PETITIONS</p>
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
              Waiver requests you raised
            </h2>
          </div>
        </div>

        {isLoadingRequests ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-5 w-5 animate-spin text-slate-900" />
          </div>
        ) : myRequests.length === 0 ? (
          <p className="rounded-xl bg-slate-50 p-4 text-xs font-medium text-slate-500">
            You have not requested any waivers yet.
          </p>
        ) : (
          <div className="space-y-2">
            {myRequests.map((request) => (
              <div key={request.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-extrabold text-slate-900">
                    {request.amount} BDT · {request.targetUser.name}
                  </p>
                  <span
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase ${
                      STATUS_BADGE[request.status]
                    }`}
                  >
                    {request.status}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">{request.reason}</p>
                <p className="mt-1 text-[11px] text-slate-400">
                  Raised {formatDate(request.createdAt)}
                  {request.decidedAt ? ` · Decided ${formatDate(request.decidedAt)}` : ""}
                </p>
                {request.decisionNote && (
                  <p className="mt-1 text-[11px] font-medium text-slate-500">
                    Note: {request.decisionNote}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {petitionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="pulse-card w-full max-w-md space-y-4 bg-white p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="kicker-label">REQUEST WAIVER</p>
                <h3 className="text-lg font-extrabold text-slate-900">
                  {petitionTarget.amount} BDT · {petitionTarget.subject}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPetitionTarget(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="kicker-label mb-1.5 block">Justification *</label>
              <textarea
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why should this fine be cleared? An administrator reads this."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm font-medium text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSubmitPetition}
                disabled={isSubmitting}
                className="pulse-button-primary flex-1 py-2.5 text-xs"
              >
                {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                <span>Submit request</span>
              </button>
              <button
                type="button"
                onClick={() => setPetitionTarget(null)}
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

export default FacultyWaiversView;
