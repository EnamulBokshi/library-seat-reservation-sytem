"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

import { bookingService } from "@/services/booking-service";
import { Booking, ApiError, BookingStatus } from "@/lib/types";
import {
  BookOpen, QrCode, Calendar, MapPin, Loader2, AlertCircle,
  CheckCircle2, XCircle, Clock, Ban, AlertTriangle, ArrowLeft, Download,
  Copy, Check, Info, User
} from "lucide-react";
import Link from "next/link";

const STATUS_CONFIG: Record<BookingStatus, { label: string; className: string; Icon: React.ElementType }> = {
  pending: { label: "Pending", className: "bg-slate-100 border-slate-200 text-slate-700", Icon: Clock },
  confirmed: { label: "Confirmed", className: "bg-indigo-50 border-indigo-100 text-indigo-700", Icon: CheckCircle2 },
  checked_in: { label: "Checked In", className: "bg-emerald-50 border-emerald-100 text-emerald-700", Icon: CheckCircle2 },
  completed: { label: "Completed", className: "bg-slate-100 border-slate-200 text-slate-600", Icon: CheckCircle2 },
  cancelled: { label: "Cancelled", className: "bg-rose-50 border-rose-100 text-rose-700", Icon: XCircle },
  no_show: { label: "No Show", className: "bg-amber-50 border-amber-100 text-amber-800", Icon: AlertTriangle },
};

const SLOT_TIMES: Record<string, string> = {
  morning: "08:00 AM – 12:00 PM",
  noon: "12:00 PM – 02:00 PM",
  afternoon: "02:00 PM – 06:00 PM",
  evening: "06:00 PM – 09:00 PM",
};

export function BookingDetailsPageView({ bookingId }: { bookingId: string }) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchBooking = useCallback(async () => {
    if (!bookingId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await bookingService.getById(bookingId);
      setBooking(res.data);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setError(apiErr?.message ?? "Failed to load booking details.");
    } finally {
      setIsLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  const handleCancel = async () => {
    if (!booking || !confirm("Cancel this booking?")) return;
    try {
      await bookingService.cancel(booking.id);
      setBooking((prev) => prev ? { ...prev, status: "cancelled" } : null);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      alert(apiErr?.message ?? "Failed to cancel booking.");
    }
  };

  const handleCopyToken = () => {
    if (!booking?.qrToken) return;
    navigator.clipboard.writeText(booking.qrToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!booking?.qrCodeImage) return;
    const link = document.createElement("a");
    link.href = booking.qrCodeImage;
    link.download = `library-pass-${booking.seat?.seatNumber ?? "seat"}-${booking.id.slice(0, 6)}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const statusInfo = booking ? STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.pending : null;
  const StatusIcon = statusInfo?.Icon;
  const canCancel = booking && (booking.status === "confirmed" || booking.status === "pending");

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-slate-900">
      <div className="mx-auto max-w-3xl px-6 py-8 space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/bookings"
              className="pulse-button-secondary py-1.5 px-3 text-xs shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Link>
            <div>
              <p className="kicker-label">RESERVATIONS &rsaquo; PASS DETAILS</p>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">
                Booking Details
              </h1>
            </div>
          </div>
          {statusInfo && StatusIcon && (
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold shrink-0 ${statusInfo.className}`}>
              <StatusIcon className="h-3.5 w-3.5" />
              {statusInfo.label}
            </span>
          )}
        </div>
        {isLoading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
          </div>
        ) : error || !booking ? (
          <div className="flex flex-col items-center gap-3 pulse-card py-24 text-center">
            <AlertCircle className="h-10 w-10 text-rose-500" />
            <p className="text-slate-500 text-sm">{error ?? "Booking not found."}</p>
            <Link href="/bookings" className="pulse-button-primary mt-2 text-xs">
              Go to My Bookings
            </Link>
          </div>
        ) : (
          <>
            {/* ── Main QR Card ── */}
            <div className="pulse-card p-6 sm:p-8 text-center shadow-xs">
              <div className="flex items-center justify-center gap-2 text-slate-700 mb-4">
                <QrCode className="h-6 w-6 text-slate-900" />
                <h2 className="font-extrabold text-base text-slate-900">Official Entry Pass QR Code</h2>
              </div>

              {booking.qrCodeImage ? (
                <div className="mx-auto w-56 h-56 relative rounded-2xl overflow-hidden border border-slate-200 bg-white p-3 shadow-2xs">
                  <img
                    src={booking.qrCodeImage}
                    alt="QR Code Pass"
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="mx-auto flex h-56 w-56 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-slate-400">
                  <span className="font-mono text-xs font-bold px-4">{booking.qrToken}</span>
                </div>
              )}

              {/* Token & Copy */}
              <div className="mt-4 flex items-center justify-center gap-2">
                <span className="font-mono text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 font-bold truncate max-w-sm">
                  {booking.qrToken}
                </span>
                <button
                  onClick={handleCopyToken}
                  className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                  title="Copy Token UUID"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>

              {booking.qrCodeImage && (
                <button
                  onClick={handleDownloadQr}
                  className="pulse-button-secondary mt-4 text-xs py-2 px-5"
                >
                  <Download className="h-4 w-4" />
                  <span>Download Pass Image (PNG)</span>
                </button>
              )}
            </div>

            {/* ── Info Cards Grid ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="pulse-card p-5">
                <p className="kicker-label mb-1">RESERVED SEAT</p>
                <p className="text-2xl font-extrabold text-slate-900">
                  {booking.seat?.seatNumber ?? "—"}
                </p>
                <p className="text-xs text-slate-500 font-semibold mt-1">
                  Zone: {booking.seat?.zone?.name ?? "—"}
                </p>
              </div>

              <div className="pulse-card p-5">
                <p className="kicker-label mb-1">SCHEDULE SLOT</p>
                {booking.schedule ? (
                  <>
                    <p className="text-lg font-extrabold text-slate-900">
                      {new Date(booking.schedule.date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                    <p className="text-xs text-slate-500 font-semibold capitalize mt-1">
                      {booking.schedule.slot} slot ({SLOT_TIMES[booking.schedule.slot] ?? "Scheduled"})
                    </p>
                  </>
                ) : (
                  <p className="text-slate-400">—</p>
                )}
              </div>

              <div className="pulse-card p-5 sm:col-span-2">
                <p className="kicker-label mb-2">RESERVATION OWNER</p>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-extrabold text-slate-900 text-sm">{booking.user?.name ?? "Student"}</p>
                    <p className="text-xs text-slate-500">{booking.user?.email ?? "—"}</p>
                  </div>
                  {booking.user?.studentId && (
                    <span className="font-mono text-xs font-bold bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700">
                      Student ID: {booking.user.studentId}
                    </span>
                  )}
                </div>
              </div>

              <div className="pulse-card p-5 sm:col-span-2 space-y-3">
                <p className="kicker-label">AUDIT TIMELINE LOGS</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Booked At</span>
                    <span className="font-bold text-slate-800">
                      {new Date(booking.bookedAt).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Checked In</span>
                    <span className="font-bold text-slate-800">
                      {booking.checkedInAt ? new Date(booking.checkedInAt).toLocaleString() : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Checked Out</span>
                    <span className="font-bold text-slate-800">
                      {booking.checkedOutAt ? new Date(booking.checkedOutAt).toLocaleString() : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Cancelled</span>
                    <span className="font-bold text-slate-800">
                      {booking.cancelledAt ? new Date(booking.cancelledAt).toLocaleString() : "—"}
                    </span>
                  </div>
                </div>
                {booking.cancelReason && (
                  <p className="text-xs text-rose-600 font-semibold border-t border-slate-100 pt-2">
                    Cancellation Reason: {booking.cancelReason}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            {canCancel && (
              <div className="flex justify-end">
                <button
                  onClick={handleCancel}
                  className="pulse-button-secondary text-xs text-rose-600 border-rose-200 hover:bg-rose-50 py-2.5 px-5"
                >
                  <Ban className="h-4 w-4" />
                  <span>Cancel Reservation</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default BookingDetailsPageView;
