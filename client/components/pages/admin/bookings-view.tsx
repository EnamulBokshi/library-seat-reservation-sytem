"use client";

import React, { useState, useEffect, useCallback } from "react";
import { bookingService } from "@/services/booking-service";
import { Booking, BookingStatus, BookingQueryParams, ApiError } from "@/lib/types";
import { BookingDetailsModal } from "@/components/shared/booking-details-modal";
import {
  ClipboardList, Loader2, AlertCircle, RefreshCw,
  User, Calendar, MapPin, Clock, Search, Filter, X,
  CheckCircle2, XCircle, AlertTriangle, Ban, Eye,
} from "lucide-react";

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_OPTIONS: { value: BookingStatus | ""; label: string }[] = [
  { value: "",           label: "All Statuses" },
  { value: "pending",    label: "Pending" },
  { value: "confirmed",  label: "Confirmed" },
  { value: "checked_in", label: "Checked In" },
  { value: "completed",  label: "Completed" },
  { value: "cancelled",  label: "Cancelled" },
  { value: "no_show",    label: "No Show" },
];

const STATUS_BADGE: Record<BookingStatus, { className: string; Icon: React.ElementType }> = {
  pending:    { className: "bg-slate-100 border-slate-200 text-slate-700",   Icon: Clock },
  confirmed:  { className: "bg-indigo-50 border-indigo-100 text-indigo-700", Icon: CheckCircle2 },
  checked_in: { className: "bg-emerald-50 border-emerald-100 text-emerald-700", Icon: CheckCircle2 },
  completed:  { className: "bg-slate-100 border-slate-200 text-slate-600",   Icon: CheckCircle2 },
  cancelled:  { className: "bg-rose-50 border-rose-100 text-rose-700",       Icon: XCircle },
  no_show:    { className: "bg-amber-50 border-amber-100 text-amber-800",    Icon: AlertTriangle },
};

function StatusBadge({ status }: { status: BookingStatus }) {
  const { className, Icon } = STATUS_BADGE[status];
  const label = STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${className}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

// ─── Booking Row ──────────────────────────────────────────────────────────────
interface BookingRowProps {
  booking: Booking;
  onCancel: (id: string) => void;
  onSelectBooking: (booking: Booking) => void;
}

function BookingRow({ booking, onCancel, onSelectBooking }: BookingRowProps) {
  const canCancel = booking.status === "confirmed" || booking.status === "pending";
  return (
    <tr
      onClick={() => onSelectBooking(booking)}
      className="border-t border-slate-100 transition-colors hover:bg-slate-50/80 cursor-pointer"
    >
      <td className="px-4 py-3.5">
        <div>
          <p className="font-bold text-slate-900 text-sm">{booking.user?.name ?? "—"}</p>
          <p className="text-xs text-slate-500">{booking.user?.email ?? "—"}</p>
          {booking.user?.studentId && (
            <p className="font-mono text-[10px] text-slate-400 font-semibold">{booking.user.studentId}</p>
          )}
        </div>
      </td>
      <td className="px-4 py-3.5">
        <div>
          <p className="font-extrabold text-slate-900 text-sm">{booking.seat?.seatNumber ?? "—"}</p>
          <p className="text-xs text-slate-500 font-medium">{booking.seat?.zone?.name ?? "—"}</p>
        </div>
      </td>
      <td className="px-4 py-3.5 text-xs font-medium text-slate-700">
        {booking.schedule ? (
          <div>
            <p className="font-bold">{new Date(booking.schedule.date).toLocaleDateString()}</p>
            <p className="capitalize text-slate-400 text-[11px]">{booking.schedule.slot} slot</p>
          </div>
        ) : "—"}
      </td>
      <td className="px-4 py-3.5">
        <StatusBadge status={booking.status} />
      </td>
      <td className="px-4 py-3.5 text-xs text-slate-500 font-medium">
        {new Date(booking.bookedAt).toLocaleString()}
      </td>
      <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelectBooking(booking)}
            className="pulse-button-secondary py-1 px-3 text-xs"
            title="View Booking Details & QR"
          >
            <Eye className="h-3 w-3" />
            <span>Details</span>
          </button>
          {canCancel && (
            <button
              onClick={() => onCancel(booking.id)}
              className="pulse-button-secondary py-1 px-2.5 text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
              title="Cancel Booking"
            >
              <Ban className="h-3 w-3" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Admin Bookings View ──────────────────────────────────────────────────────
export function AdminBookingsView() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "">("");
  const [dateFilter, setDateFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchBookings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: BookingQueryParams = {};
      if (statusFilter) params.status = statusFilter;
      if (dateFilter) params.date = dateFilter;
      const res = await bookingService.getAll(params);
      setBookings(res.data ?? []);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setError(apiErr?.message ?? "Failed to load bookings.");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, dateFilter]);

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

  const clearFilters = () => { setStatusFilter(""); setDateFilter(""); setSearchQuery(""); };

  const filtered = bookings.filter((b) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      b.user?.name?.toLowerCase().includes(q) ||
      b.user?.email?.toLowerCase().includes(q) ||
      b.user?.studentId?.toLowerCase().includes(q) ||
      b.seat?.seatNumber?.toLowerCase().includes(q) ||
      b.seat?.zone?.name?.toLowerCase().includes(q)
    );
  });

  const hasFilters = statusFilter || dateFilter || searchQuery;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="kicker-label">ADMINISTRATION &rsaquo; RESERVATION LOGS</p>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">All Bookings</h1>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
              Monitor and manage all student seat reservations across the library
            </p>
          </div>
          <button onClick={fetchBookings} className="pulse-button-secondary shrink-0">
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name, email, seat…"
              className="w-full rounded-full border border-slate-200 bg-white py-2 pl-10 pr-4 text-xs font-medium text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:outline-none shadow-2xs"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as BookingStatus | "")}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 focus:border-slate-900 focus:outline-none shadow-2xs"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Date Filter */}
          <input
            type="date" value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 focus:border-slate-900 focus:outline-none shadow-2xs"
          />

          {hasFilters && (
            <button onClick={clearFilters} className="pulse-button-secondary py-1.5 px-3 text-xs">
              <X className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
        </div>

        {/* Summary */}
        <p className="text-xs text-slate-500 font-medium">
          Showing <strong className="text-slate-900 font-extrabold">{filtered.length}</strong> reservation{filtered.length !== 1 ? "s" : ""}
        </p>

        {/* Table */}
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
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 pulse-card py-24 text-center">
            <ClipboardList className="h-10 w-10 text-slate-400" />
            <p className="text-slate-500 text-sm">No reservations match your query.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View (md+) */}
            <div className="hidden md:block pulse-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="px-4 py-3 kicker-label">Student</th>
                      <th className="px-4 py-3 kicker-label">Seat / Zone</th>
                      <th className="px-4 py-3 kicker-label">Date / Slot</th>
                      <th className="px-4 py-3 kicker-label">Status</th>
                      <th className="px-4 py-3 kicker-label">Booked At</th>
                      <th className="px-4 py-3 kicker-label">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((b) => (
                      <BookingRow key={b.id} booking={b} onCancel={handleCancel} onSelectBooking={setSelectedBooking} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards View (< md) */}
            <div className="space-y-3 md:hidden">
              {filtered.map((b) => {
                const dateStr = b.schedule
                  ? new Date(b.schedule.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                  : "—";

                return (
                  <div key={b.id} className="pulse-card p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-extrabold text-slate-900 text-sm">{b.user?.name ?? "Student"}</p>
                        <p className="text-xs text-slate-500">{b.user?.studentId || b.user?.email || "—"}</p>
                      </div>
                      <StatusBadge status={b.status} />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 font-medium">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Seat & Zone</span>
                        <span className="font-bold text-slate-900">{b.seat?.seatNumber ?? "—"}</span>
                        <span className="text-slate-500 block text-[11px]">{b.seat?.zone?.name ?? "—"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Schedule</span>
                        <span className="font-bold text-slate-900">{dateStr}</span>
                        <span className="text-slate-500 block text-[11px] capitalize">{b.schedule?.slot ?? "—"} slot</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => setSelectedBooking(b)}
                        className="pulse-button-secondary py-1.5 px-3 text-xs"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Pass & Details</span>
                      </button>
                      {(b.status === "confirmed" || b.status === "pending") && (
                        <button
                          onClick={() => handleCancel(b.id)}
                          className="pulse-button-secondary py-1.5 px-3 text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                        >
                          <X className="h-3.5 w-3.5" />
                          <span>Cancel</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
    </div>
  );
}

export default AdminBookingsView;


