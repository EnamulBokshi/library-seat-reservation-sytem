"use client";

import React, { useState } from "react";
import { checkinService } from "@/services/checkin-service";
import { CheckInResponseData, ApiError } from "@/lib/types";
import {
  QrCode, Loader2, AlertCircle, CheckCircle2, LogIn, LogOut,
  MapPin, ScanLine,
} from "lucide-react";

export function CheckInView() {
  const [qrToken, setQrToken] = useState("");
  const [result, setResult] = useState<CheckInResponseData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrToken.trim()) return;
    setResult(null);
    setError(null);
    setIsScanning(true);
    try {
      const res = await checkinService.scan({ qrToken: qrToken.trim() });
      setResult(res.data);
      setQrToken("");
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setError(apiErr?.message ?? "Failed to process QR token.");
    } finally {
      setIsScanning(false);
    }
  };

  const isCheckIn  = result?.action === "check_in";
  const isCheckOut = result?.action === "check_out";

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-slate-900">
      <div className="mx-auto max-w-2xl px-6 py-8 space-y-6">
        {/* Header Section */}
        <div>
          <p className="kicker-label">ADMINISTRATION &rsaquo; ENTRANCE SCANNER</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">QR Check-In / Check-Out</h1>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
            Scan or input a student's QR pass token to process entry or exit
          </p>
        </div>

        {/* Scanner Card */}
        <div className="pulse-card p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
              <ScanLine className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-slate-900 text-base">Scan QR Token</h2>
              <p className="text-xs text-slate-500 font-medium">Enter the token from the student's pass</p>
            </div>
          </div>

          <form onSubmit={handleScan} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <QrCode className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={qrToken}
                onChange={(e) => setQrToken(e.target.value)}
                placeholder="Paste or type QR token UUID…"
                autoFocus
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-10 pr-4 font-mono text-sm text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 font-medium"
              />
            </div>
            <button
              type="submit"
              disabled={isScanning || !qrToken.trim()}
              className="pulse-button-primary py-3 shrink-0"
            >
              {isScanning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ScanLine className="h-4 w-4" />
              )}
              {isScanning ? "Processing…" : "Process Token"}
            </button>
          </form>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Scan Error</p>
              <p className="text-xs mt-0.5 text-rose-600 font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className={`pulse-card p-6 border ${
            isCheckIn
              ? "border-emerald-200 bg-emerald-50/30"
              : "border-indigo-200 bg-indigo-50/30"
          }`}>
            <div className="flex items-center gap-3 mb-5">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                isCheckIn ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-700"
              }`}>
                {isCheckIn
                  ? <LogIn className="h-6 w-6" />
                  : <LogOut className="h-6 w-6" />
                }
              </div>
              <div>
                <p className={`text-lg font-extrabold ${isCheckIn ? "text-emerald-900" : "text-indigo-900"}`}>
                  {isCheckIn ? "✓ Check-In Successful" : "✓ Check-Out Successful"}
                </p>
                <p className="text-xs text-slate-500 font-medium">
                  {isCheckIn ? "Student has been checked in and assigned their seat." : "Seat occupancy released and session completed."}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-medium">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-slate-400 text-[11px] mb-0.5">Seat Number</p>
                <p className="font-extrabold text-slate-900 text-sm">
                  {result.booking.seat?.seatNumber ?? "—"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-slate-400 text-[11px] mb-0.5">Zone</p>
                <p className="font-bold text-slate-800 text-sm">
                  {result.booking.seat?.zone?.name ?? "—"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-slate-400 text-[11px] mb-0.5">Updated Status</p>
                <p className="font-bold capitalize text-slate-900">
                  {result.booking.status.replace("_", " ")}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-slate-400 text-[11px] mb-0.5">
                  {isCheckIn ? "Checked In At" : "Checked Out At"}
                </p>
                <p className="font-bold text-slate-800 text-xs">
                  {isCheckIn
                    ? result.booking.checkedInAt
                      ? new Date(result.booking.checkedInAt).toLocaleString()
                      : "—"
                    : result.booking.checkedOutAt
                    ? new Date(result.booking.checkedOutAt).toLocaleString()
                    : "—"
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        {!result && !error && (
          <div className="pulse-card border-dashed p-6 text-center text-slate-400">
            <QrCode className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            <p className="text-xs font-medium text-slate-500">Enter a QR token above to process entry check-in or exit check-out.</p>
            <p className="text-[11px] mt-1 text-slate-400">The system automatically calculates status based on current reservation state.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default CheckInView;

