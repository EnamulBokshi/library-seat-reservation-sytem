"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { bookingService } from "@/services/booking-service";
import { zoneService } from "@/services/zone-service";
import {
  Booking,
  BookingStatus,
  SlotType,
  Zone,
  BookingQueryParams,
  ApiError,
} from "@/lib/types";
import { BookingDetailsModal } from "@/components/shared/booking-details-modal";
import {
  ClipboardList,
  Loader2,
  AlertCircle,
  RefreshCw,
  Search,
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Ban,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  SlidersHorizontal,
  MapPin,
  Calendar,
  Clock,
  User,
} from "lucide-react";

// ─── Status Config ────────────────────────────────────────────────────────────
const STATUS_OPTIONS: { value: BookingStatus | ""; label: string }[] = [
  { value: "", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "checked_in", label: "Checked In" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No Show" },
];

const SLOT_OPTIONS: { value: SlotType | ""; label: string }[] = [
  { value: "", label: "All Slots" },
  { value: "morning", label: "Morning" },
  { value: "noon", label: "Noon" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const STATUS_BADGE: Record<BookingStatus, { className: string; Icon: React.ElementType }> = {
  pending: { className: "bg-slate-100 border-slate-200 text-slate-700", Icon: Clock },
  confirmed: { className: "bg-indigo-50 border-indigo-100 text-indigo-700", Icon: CheckCircle2 },
  checked_in: { className: "bg-emerald-50 border-emerald-100 text-emerald-700", Icon: CheckCircle2 },
  completed: { className: "bg-slate-100 border-slate-200 text-slate-600", Icon: CheckCircle2 },
  cancelled: { className: "bg-rose-50 border-rose-100 text-rose-700", Icon: XCircle },
  no_show: { className: "bg-amber-50 border-amber-100 text-amber-800", Icon: AlertTriangle },
};

function StatusBadge({ status }: { status: BookingStatus }) {
  const meta = STATUS_BADGE[status] ?? {
    className: "bg-slate-100 border-slate-200 text-slate-700",
    Icon: Clock,
  };
  const Icon = meta.Icon;
  const label = STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${meta.className}`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

// ─── Booking Row Component ────────────────────────────────────────────────────
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
      {/* Student Details */}
      <td className="px-4 py-3.5">
        <div>
          <p className="font-bold text-slate-900 text-sm">{booking.user?.name ?? "—"}</p>
          <p className="text-xs text-slate-500 font-medium">{booking.user?.email ?? "—"}</p>
          {booking.user?.studentId && (
            <p className="font-mono text-[10px] text-slate-400 font-semibold mt-0.5">
              ID: {booking.user.studentId}
            </p>
          )}
        </div>
      </td>

      {/* Seat & Zone */}
      <td className="px-4 py-3.5">
        <div>
          <p className="font-extrabold text-slate-900 text-sm">
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
      </td>

      {/* Schedule & Slot */}
      <td className="px-4 py-3.5 text-xs font-medium text-slate-700">
        {booking.schedule ? (
          <div>
            <p className="font-bold">
              {new Date(booking.schedule.date).toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            <p className="capitalize text-indigo-600 font-bold text-[11px]">
              {booking.schedule.slot} slot
            </p>
          </div>
        ) : (
          "—"
        )}
      </td>

      {/* Status */}
      <td className="px-4 py-3.5">
        <StatusBadge status={booking.status} />
      </td>

      {/* Booked Timestamp */}
      <td className="px-4 py-3.5 text-xs text-slate-500 font-medium">
        {new Date(booking.bookedAt).toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </td>

      {/* Actions */}
      <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelectBooking(booking)}
            className="pulse-button-secondary py-1 px-2.5 text-xs"
            title="View Booking Pass & Details"
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
              <span>Cancel</span>
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Main Admin Bookings View ─────────────────────────────────────────────────
export function AdminBookingsView() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // ── Server-side Filter States ──
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "">("");
  const [slotFilter, setSlotFilter] = useState<SlotType | "">("");
  const [zoneFilter, setZoneFilter] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>("");

  // ── Server-side Pagination States ──
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // Reset to page 1 on search change
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load Zones for dropdown
  useEffect(() => {
    zoneService
      .getAll()
      .then((res) => setZones(res.data ?? []))
      .catch((err) => console.error("Failed to load zones filter:", err));
  }, []);

  // Fetch Bookings with Server-side Query Parameters
  const fetchBookings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: BookingQueryParams = {
        page,
        limit,
      };

      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (statusFilter) params.status = statusFilter;
      if (slotFilter) params.slot = slotFilter;
      if (zoneFilter) params.zoneId = zoneFilter;
      if (dateFilter) params.date = dateFilter;

      const res = await bookingService.getAll(params);
      setBookings(res.data ?? []);

      if (res.meta) {
        setTotalCount(res.meta.total);
        setTotalPages(res.meta.totalPages);
      } else {
        setTotalCount(res.data?.length ?? 0);
        setTotalPages(1);
      }
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setError(apiErr?.message ?? "Failed to load bookings from server.");
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, debouncedSearch, statusFilter, slotFilter, zoneFilter, dateFilter]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Cancel handler
  const handleCancel = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    try {
      await bookingService.cancel(id);
      fetchBookings();
      if (selectedBooking?.id === id) {
        setSelectedBooking((prev) =>
          prev ? { ...prev, status: "cancelled" as BookingStatus } : null
        );
      }
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      alert(apiErr?.message ?? "Failed to cancel booking.");
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setDebouncedSearch("");
    setStatusFilter("");
    setSlotFilter("");
    setZoneFilter("");
    setDateFilter("");
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    debouncedSearch || statusFilter || slotFilter || zoneFilter || dateFilter
  );

  // Pagination calculation
  const startItem = totalCount === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(totalCount, page * limit);

  return (
    <div className="space-y-6 pb-12">
      {/* ── Top Header Section ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="kicker-label">ADMINISTRATION &rsaquo; RESERVATION LEDGER</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">
            All Bookings
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
            Search, filter, and inspect all student seat reservations across library study halls
          </p>
        </div>

        <button
          onClick={fetchBookings}
          disabled={isLoading}
          className="pulse-button-secondary shrink-0 py-2 px-3.5 text-xs"
          title="Reload server data"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ── Multi-Faceted Server-side Filters Toolbar ── */}
      <div className="pulse-card p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student, email, ID, seat..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2 pl-10 pr-8 text-xs font-bold text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as BookingStatus | "");
              setPage(1);
            }}
            className="rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 focus:border-slate-900 focus:outline-none shadow-2xs cursor-pointer"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          {/* Slot Dropdown */}
          <select
            value={slotFilter}
            onChange={(e) => {
              setSlotFilter(e.target.value as SlotType | "");
              setPage(1);
            }}
            className="rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 focus:border-slate-900 focus:outline-none shadow-2xs cursor-pointer"
          >
            {SLOT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          {/* Zone Dropdown */}
          <select
            value={zoneFilter}
            onChange={(e) => {
              setZoneFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 focus:border-slate-900 focus:outline-none shadow-2xs cursor-pointer"
          >
            <option value="">All Zones</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>

          {/* Date Picker */}
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 focus:border-slate-900 focus:outline-none shadow-2xs cursor-pointer"
          />

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="pulse-button-secondary py-1.5 px-3 text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
            >
              <X className="h-3.5 w-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* ── Active Filter Summary & Page Size Controls ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500 font-medium">
          <div>
            Showing <strong className="text-slate-900 font-extrabold">{startItem}</strong> &ndash;{" "}
            <strong className="text-slate-900 font-extrabold">{endItem}</strong> of{" "}
            <strong className="text-slate-900 font-extrabold">{totalCount}</strong> total reservations
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">Rows per page:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-700 shadow-2xs cursor-pointer focus:border-slate-900 focus:outline-none"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Data Display Table ── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Fetching reservations from database...
          </p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-24 text-center pulse-card">
          <AlertCircle className="h-10 w-10 text-rose-500" />
          <p className="text-slate-700 text-sm font-semibold">{error}</p>
          <button onClick={fetchBookings} className="pulse-button-primary mt-2 text-xs">
            Retry
          </button>
        </div>
      ) : bookings.length === 0 ? (
        <div className="flex flex-col items-center gap-3 pulse-card py-24 text-center">
          <ClipboardList className="h-10 w-10 text-slate-400" />
          <p className="text-slate-700 font-bold text-sm">No reservations match your filters</p>
          <p className="text-slate-400 text-xs">Try adjusting your search criteria or resetting filters.</p>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="pulse-button-secondary mt-2 text-xs">
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
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
                  {bookings.map((b) => (
                    <BookingRow
                      key={b.id}
                      booking={b}
                      onCancel={handleCancel}
                      onSelectBooking={setSelectedBooking}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards View */}
          <div className="space-y-3 md:hidden">
            {bookings.map((b) => {
              const dateStr = b.schedule
                ? new Date(b.schedule.date).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })
                : "—";

              return (
                <div key={b.id} className="pulse-card p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-extrabold text-slate-900 text-sm">
                        {b.user?.name ?? "Student"}
                      </p>
                      <p className="text-xs text-slate-500 font-medium">
                        {b.user?.studentId || b.user?.email || "—"}
                      </p>
                    </div>
                    <StatusBadge status={b.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 font-medium">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Seat & Zone
                      </span>
                      <span className="font-bold text-slate-900">
                        {b.seat?.seatNumber ?? "—"}
                      </span>
                      <span className="text-slate-500 block text-[11px]">
                        {b.seat?.zone?.name ?? "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Schedule
                      </span>
                      <span className="font-bold text-slate-900">{dateStr}</span>
                      <span className="text-slate-500 block text-[11px] capitalize">
                        {b.schedule?.slot ?? "—"} slot
                      </span>
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

          {/* ── Server-Side Pagination Bar ── */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <p className="text-xs text-slate-500 font-medium">
                Page <strong className="text-slate-900 font-extrabold">{page}</strong> of{" "}
                <strong className="text-slate-900 font-extrabold">{totalPages}</strong>
              </p>

              <div className="flex items-center gap-1.5">
                {/* First Page */}
                <button
                  onClick={() => setPage(1)}
                  disabled={page <= 1}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  title="First Page"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>

                {/* Prev Page */}
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  title="Previous Page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {/* Dynamic Page Buttons */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .map((p, idx, arr) => {
                    const prevP = arr[idx - 1];
                    const isGap = prevP && p - prevP > 1;

                    return (
                      <React.Fragment key={p}>
                        {isGap && <span className="px-1 text-slate-400 text-xs">&hellip;</span>}
                        <button
                          onClick={() => setPage(p)}
                          className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-black transition-all ${
                            page === p
                              ? "bg-slate-900 text-white shadow-xs"
                              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    );
                  })}

                {/* Next Page */}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  title="Next Page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>

                {/* Last Page */}
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={page >= totalPages}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  title="Last Page"
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Booking Details & Pass Modal ── */}
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

export default AdminBookingsView;
