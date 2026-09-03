"use client";

import React, { useState } from "react";
import { Booking, BookingStatus } from "@/lib/types";
import {
  X, QrCode, Download, Calendar, Clock, MapPin, User, CheckCircle2,
  XCircle, AlertTriangle, Ban, Copy, Check, Shield, Info
} from "lucide-react";

interface BookingDetailsModalProps {
  booking: Booking;
  onClose: () => void;
  onCancel?: (id: string) => void;
}

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

export function BookingDetailsModal({ booking, onClose, onCancel }: BookingDetailsModalProps) {
  const [copied, setCopied] = useState(false);

  const statusInfo = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.pending;
  const StatusIcon = statusInfo.Icon;

  const canCancel =
    (booking.status === "confirmed" || booking.status === "pending") && !!onCancel;

  const handleCopyToken = () => {
    if (!booking.qrToken) return;
    navigator.clipboard.writeText(booking.qrToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!booking.qrCodeImage) return;
    const link = document.createElement("a");
    link.href = booking.qrCodeImage;
    link.download = `library-pass-${booking.seat?.seatNumber ?? "seat"}-${booking.id.slice(0, 6)}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs p-4 sm:p-6">
      <div className="flex min-h-full items-center justify-center">
        <div className="pulse-card relative w-full max-w-xl p-6 sm:p-7 shadow-2xl my-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-6 border-b border-slate-100 pb-4">
          <p className="kicker-label">RESERVATION PASS &rsaquo; DETAILS</p>
          <div className="flex flex-wrap items-center justify-between gap-3 mt-1">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">
                Seat {booking.seat?.seatNumber ?? "—"} Pass
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                ID: #{booking.id}
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${statusInfo.className}`}
            >
              <StatusIcon className="h-3.5 w-3.5" />
              {statusInfo.label}
            </span>
          </div>
        </div>

        <div className="space-y-6">
          {/* ── QR Code Pass Box ── */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 text-center">
            <div className="flex items-center justify-center gap-2 text-slate-700 mb-3">
              <QrCode className="h-5 w-5 text-slate-900" />
              <span className="font-extrabold text-sm text-slate-900">Entrance QR Pass</span>
            </div>

            {booking.qrCodeImage ? (
              <div className="mx-auto w-48 h-48 relative rounded-2xl overflow-hidden border border-slate-200 bg-white p-3 shadow-2xs">
                <img
                  src={booking.qrCodeImage}
                  alt="QR Pass Code"
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-slate-400">
                <span className="font-mono text-xs font-bold text-center px-4">
                  {booking.qrToken}
                </span>
              </div>
            )}

            {/* Token String & Copy */}
            <div className="mt-3 flex items-center justify-center gap-2">
              <span className="font-mono text-[11px] bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-600 font-semibold truncate max-w-xs">
                {booking.qrToken}
              </span>
              <button
                onClick={handleCopyToken}
                className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                title="Copy Token"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>

            {/* Download Button */}
            {booking.qrCodeImage && (
              <button
                onClick={handleDownloadQr}
                className="pulse-button-secondary mt-3 text-xs py-1.5 px-4"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download PNG Pass</span>
              </button>
            )}

            <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
              <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>Show this QR pass at the library main gate scanner for entry & exit</span>
            </div>
          </div>

          {/* ── Reservation Details Grid ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-medium">
            {/* Seat & Zone */}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="kicker-label mb-1">SEAT & ZONE</p>
              <p className="font-extrabold text-slate-900 text-base">
                {booking.seat?.seatNumber ?? "—"}
              </p>
              <p className="text-slate-600 font-semibold mt-0.5">
                {booking.seat?.zone?.name ?? "—"}
              </p>
            </div>

            {/* Date & Slot */}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="kicker-label mb-1">SCHEDULE SLOT</p>
              {booking.schedule ? (
                <>
                  <p className="font-extrabold text-slate-900 text-base">
                    {new Date(booking.schedule.date).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-slate-600 font-semibold capitalize mt-0.5">
                    {booking.schedule.slot} slot ({SLOT_TIMES[booking.schedule.slot] ?? "Scheduled"})
                  </p>
                </>
              ) : (
                <p className="text-slate-500">—</p>
              )}
            </div>

            {/* Student Info */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:col-span-2">
              <p className="kicker-label mb-1">STUDENT RESERVED BY</p>
              <div className="flex flex-wrap items-center justify-between gap-2 mt-1">
                <div>
                  <p className="font-bold text-slate-900 text-sm">{booking.user?.name ?? "Current User"}</p>
                  <p className="text-slate-500 text-xs">{booking.user?.email ?? "—"}</p>
                </div>
                {booking.user?.studentId && (
                  <span className="font-mono text-xs font-bold bg-slate-100 border border-slate-200 rounded-md px-2 py-0.5 text-slate-700">
                    ID: {booking.user.studentId}
                  </span>
                )}
              </div>
            </div>

            {/* Timeline Timestamps */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:col-span-2 space-y-2">
              <p className="kicker-label mb-2">TIMELINE LOGS</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400 block">Booked At</span>
                  <span className="font-bold text-slate-800">
                    {new Date(booking.bookedAt).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Checked In</span>
                  <span className="font-bold text-slate-800">
                    {booking.checkedInAt ? new Date(booking.checkedInAt).toLocaleString() : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Checked Out</span>
                  <span className="font-bold text-slate-800">
                    {booking.checkedOutAt ? new Date(booking.checkedOutAt).toLocaleString() : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Cancelled</span>
                  <span className="font-bold text-slate-800">
                    {booking.cancelledAt ? new Date(booking.cancelledAt).toLocaleString() : "—"}
                  </span>
                </div>
              </div>
              {booking.cancelReason && (
                <p className="text-[11px] text-rose-600 font-semibold pt-1">
                  Reason: {booking.cancelReason}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          {canCancel && (
            <button
              onClick={() => onCancel(booking.id)}
              className="pulse-button-secondary text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
            >
              <Ban className="h-3.5 w-3.5" />
              <span>Cancel Booking</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="pulse-button-primary text-xs py-2 px-5"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
);
}

export default BookingDetailsModal;
