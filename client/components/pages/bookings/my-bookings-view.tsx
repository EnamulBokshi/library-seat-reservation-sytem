"use client";

import React, { useState, useEffect, useCallback } from "react";
import { bookingService } from "@/services/booking-service";
import { Booking, ApiError, BookingStatus } from "@/lib/types";
import { BookingDetailsModal } from "@/components/shared/booking-details-modal";
import {
  BookOpen, QrCode, Calendar, MapPin, Loader2, AlertCircle,
  CheckCircle2, XCircle, Clock, Ban, AlertTriangle, RefreshCw, Eye
} from "lucide-react";

// ─── Status Badge ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<BookingStatus, { label: string; className: string; Icon: React.ElementType }> = {
  pending:    { label: "Pending",    className: "bg-slate-100 border-slate-200 text-slate-700",   Icon: Clock },
  confirmed:  { label: "Confirmed",  className: "bg-indigo-50 border-indigo-100 text-indigo-700", Icon: CheckCircle2 },
  checked_in: { label: "Checked In", className: "bg-emerald-50 border-emerald-100 text-emerald-700", Icon: CheckCircle2 },
  completed:  { label: "Completed",  className: "bg-slate-100 border-slate-200 text-slate-600",   Icon: CheckCircle2 },
  cancelled:  { label: "Cancelled",  className: "bg-rose-50 border-rose-100 text-rose-700",       Icon: XCircle },
  no_show:    { label: "No Show",    className: "bg-amber-50 border-amber-100 text-amber-800",    Icon: AlertTriangle },
};

function StatusBadge({ status }: { status: BookingStatus }) {
  const { label, className, Icon } = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${className}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

// ─── Booking Card ─────────────────────────────────────────────────────────────
interface BookingCardProps {
  booking: Booking;
  onCancel: (id: string) => void;
  onSelectBooking: (booking: Booking) => void;
}

function BookingCard({ booking, onCancel, onSelectBooking }: BookingCardProps) {
  const canCancel = booking.status === "confirmed" || booking.status === "pending";

  return (
    <div className="pulse-card p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shrink-0">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <p className="font-extrabold text-slate-900 text-base">
              {booking.bookingSeats && booking.bookingSeats.length > 0
                ? booking.bookingSeats.map((bs) => bs.seat.seatNumber).join(", ")
                : booking.seat?.seatNumber ?? "—"}
            </p>
            <p className="text-xs text-slate-500 font-medium">
              {booking.bookingSeats && booking.bookingSeats.length > 0
                ? booking.bookingSeats[0].seat?.zone?.name ?? booking.seat?.zone?.name ?? "—"
                : booking.seat?.zone?.name ?? "—"}
              {booking.bookingSeats && booking.bookingSeats.length > 1 && (
                <span className="ml-1.5 rounded-full bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 text-[9px] font-black text-indigo-700">
                  {booking.bookingSeats.length} Seats
                </span>
              )}
            </p>
          </div>
        </div>
        <StatusBadge status={booking.status} />
      </div>

      {booking.schedule && (
        <div className="mb-4 flex items-center gap-4 text-xs font-semibold text-slate-500 border-t border-slate-100 pt-3">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span>{new Date(booking.schedule.date).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <span className="capitalize">{booking.schedule.slot} slot</span>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => onSelectBooking(booking)}
          className="pulse-button-primary flex-1 py-2 text-xs"
        >
          <QrCode className="h-3.5 w-3.5" />
          View Details & QR
        </button>
        {canCancel && (
          <button
            onClick={() => onCancel(booking.id)}
            className="pulse-button-secondary py-2 px-3 text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
            title="Cancel Reservation"
          >
            <Ban className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── My Bookings View ─────────────────────────────────────────────────────────
export function MyBookingsView() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const fetchBookings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await bookingService.getMyBookings();
      setBookings(res.data ?? []);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setError(apiErr?.message ?? "Failed to load your bookings.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const handleCancel = async (id: string) => {
    if (!confirm("Cancel this booking?")) return;
    try {
      await bookingService.cancel(id);
      setBookings((prev) =>
        prev.map((b) => b.id === id ? { ...b, status: "cancelled" as BookingStatus } : b)
      );
      if (selectedBooking?.id === id) {
        setSelectedBooking((prev) => prev ? { ...prev, status: "cancelled" as BookingStatus } : null);
      }
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      alert(apiErr?.message ?? "Failed to cancel booking.");
    }
  };

  const active = bookings.filter((b) => ["pending","confirmed","checked_in"].includes(b.status));
  const past   = bookings.filter((b) => ["completed","cancelled","no_show"].includes(b.status));

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-slate-900">
      {/* Content */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 pt-6 pb-24 md:pb-8 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="kicker-label">RESERVATIONS &rsaquo; STUDENT PASSES</p>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">My Bookings</h1>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500">Manage your active seat passes and check-in QR codes</p>
          </div>
          <button
            onClick={fetchBookings}
            className="pulse-button-secondary shrink-0"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-24 text-center">
            <AlertCircle className="h-10 w-10 text-rose-500" />
            <p className="text-slate-500 text-sm">{error}</p>
            <button onClick={fetchBookings} className="pulse-button-secondary">Retry</button>
          </div>
        ) : bookings.length === 0 ? (
          <div className="flex flex-col items-center gap-3 pulse-card py-24 text-center">
            <BookOpen className="h-10 w-10 text-slate-400" />
            <p className="text-slate-500 text-sm">No reservations found.</p>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <section>
                <span className="kicker-label mb-4 block">ACTIVE PASSES</span>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {active.map((b) => (
                    <BookingCard key={b.id} booking={b} onCancel={handleCancel} onSelectBooking={setSelectedBooking} />
                  ))}
                </div>
              </section>
            )}
            {past.length > 0 && (
              <section>
                <span className="kicker-label mb-4 block">PAST HISTORY</span>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {past.map((b) => (
                    <BookingCard key={b.id} booking={b} onCancel={handleCancel} onSelectBooking={setSelectedBooking} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {selectedBooking && (
        <BookingDetailsModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}

export default MyBookingsView;


