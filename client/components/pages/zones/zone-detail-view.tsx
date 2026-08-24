"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { zoneService } from "@/services/zone-service";
import { seatService } from "@/services/seat-service";
import { bookingService } from "@/services/booking-service";
import { Zone, Seat, Schedule, ApiError, CreateSeatPayload, Booking } from "@/lib/types";
import {
  MapPin, Plus, Loader2, AlertCircle, Calendar, Clock, Download,
  Trash2, X, ChevronLeft, BookOpen, CheckCircle2, RefreshCw,
  Armchair, ArrowRight, Eye, EyeOff, ShieldCheck, Info, CircleAlert,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// ─── Download QR Helper Function ──────────────────────────────────────────────
export function downloadQrImage(base64Image: string, fileName: string = "library-pass-qr.png") {
  const link = document.createElement("a");
  link.href = base64Image;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ─── Seat Row Component ───────────────────────────────────────────────────────
interface SeatRowProps {
  seat: Seat;
  canManage: boolean;
  isStudent: boolean;
  onDelete: (id: string) => void;
  onBook: (seat: Seat) => void;
  zoneColor: string;
}

function SeatRow({ seat, canManage, isStudent, onDelete, onBook, zoneColor }: SeatRowProps) {
  const isAvailable = seat.isActive && !seat.isOccupied;
  const isOccupied = seat.isActive && seat.isOccupied;
  const isInactive = !seat.isActive;

  const statusDot = isInactive
    ? "bg-slate-300"
    : isOccupied
      ? "bg-amber-500"
      : "bg-emerald-500";

  const statusText = isInactive ? "Inactive" : isOccupied ? "Occupied" : "Available";
  const statusBadge = isInactive
    ? "bg-slate-100 text-slate-500 border-slate-200"
    : isOccupied
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-emerald-50 text-emerald-700 border-emerald-200";

  return (
    <div className="group pulse-card flex items-center gap-4 px-4 py-3.5 sm:px-5 hover:shadow-md transition-all">
      {/* Seat icon */}
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-105"
        style={{
          backgroundColor: isAvailable ? `${zoneColor}12` : isOccupied ? "#fef3c710" : "#f1f5f9",
          border: `1.5px solid ${isAvailable ? `${zoneColor}30` : isOccupied ? "#fbbf2440" : "#e2e8f0"}`,
        }}
      >
        <Armchair className="h-4 w-4" style={{ color: isAvailable ? zoneColor : isOccupied ? "#d97706" : "#94a3b8" }} />
      </div>

      {/* Seat number + status */}
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <span className="font-mono text-sm font-extrabold text-slate-900">{seat.seatNumber}</span>
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold shrink-0 ${statusBadge}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${statusDot}`} />
          {statusText}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {canManage && (
          <button
            onClick={() => onDelete(seat.id)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 opacity-0 transition-all group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-600"
            title="Remove seat"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
        {isStudent && isAvailable && (
          <button
            onClick={() => onBook(seat)}
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 active:scale-95 transition-all shadow-xs"
          >
            <BookOpen className="h-3 w-3" />
            <span>Book</span>
          </button>
        )}
        {isStudent && isOccupied && (
          <span className="text-[11px] font-semibold text-amber-600">In use</span>
        )}
      </div>
    </div>
  );
}

// ─── Success & QR Code Modal Component ────────────────────────────────────────
interface BookingSuccessModalProps {
  booking: Booking;
  qrCodeImage: string;
  zoneName: string;
  onClose: () => void;
}

function BookingSuccessModal({ booking, qrCodeImage, zoneName, onClose }: BookingSuccessModalProps) {
  const router = useRouter();

  const handleDownload = () => {
    const filename = `library-pass-${booking.seat?.seatNumber ?? "seat"}.png`;
    downloadQrImage(qrCodeImage, filename);
  };

  const formattedDate = booking.schedule
    ? new Date(booking.schedule.date).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
    : "—";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs p-4 sm:p-6">
      <div className="flex min-h-full items-center justify-center">
        <div className="pulse-card relative w-full max-w-sm p-6 text-center shadow-2xl my-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
          <CheckCircle2 className="h-7 w-7" />
        </div>

        <h3 className="text-xl font-extrabold text-slate-900">Booking Confirmed!</h3>
        <p className="mt-1 text-xs text-slate-500">
          Your seat pass has been dispatched to your email.
        </p>

        {/* QR Code Display */}
        <div className="my-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="mx-auto w-44 h-44 relative rounded-xl overflow-hidden bg-white p-2 border border-slate-200 shadow-2xs">
            <img src={qrCodeImage} alt="QR Code Pass" className="w-full h-full object-contain" />
          </div>

          <button
            onClick={handleDownload}
            className="pulse-button-secondary mt-3 text-xs py-1.5 px-3"
          >
            <Download className="h-3.5 w-3.5" />
            Download QR Pass (PNG)
          </button>
        </div>

        {/* Pass Details */}
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-left space-y-1.5 text-xs mb-5 font-medium">
          <div className="flex justify-between">
            <span className="text-slate-400">Seat</span>
            <span className="font-extrabold text-slate-900">{booking.seat?.seatNumber ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Zone</span>
            <span className="text-slate-700">{zoneName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Date</span>
            <span className="text-slate-700">{formattedDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Slot</span>
            <span className="capitalize text-slate-700">{booking.schedule?.slot ?? "—"}</span>
          </div>
        </div>

        {/* Notice */}
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-left text-[11px] text-amber-800 font-medium">
          ⏰ <strong>Check-in notice:</strong> Scan this QR code at the library entrance within 15 minutes of slot start time.
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => router.push("/bookings")}
            className="pulse-button-primary w-full py-2.5 text-xs"
          >
            View My Bookings
          </button>
        </div>
      </div>
    </div>
  </div>
);
}

// ─── Booking Modal Component ──────────────────────────────────────────────────
interface BookSeatModalProps {
  seat: Seat;
  zoneName: string;
  onClose: () => void;
  onSuccess: (booking: Booking, qrCodeImage: string) => void;
}

function BookSeatModal({ seat, zoneName, onClose, onSuccess }: BookSeatModalProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>("");
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSchedules() {
      setIsLoadingSchedules(true);
      try {
        const res = await bookingService.getSchedules();
        const rawList = res.data ?? [];
        const todayStr = new Date().toISOString().split("T")[0];
        const list = rawList.filter((s) => {
          const sDateStr = new Date(s.date).toISOString().split("T")[0];
          return sDateStr >= todayStr;
        });
        setSchedules(list);
        if (list.length > 0) {
          setSelectedScheduleId(list[0].id);
        }
      } catch (err: unknown) {
        const apiErr = err as ApiError;
        setError(apiErr?.message ?? "Failed to load schedule slots.");
      } finally {
        setIsLoadingSchedules(false);
      }
    }
    loadSchedules();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScheduleId) {
      setError("Please select a schedule slot.");
      return;
    }
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await bookingService.create({
        seatId: seat.id,
        scheduleId: selectedScheduleId,
      });
      if (res.data?.booking && res.data?.qrCodeImage) {
        onSuccess(res.data.booking, res.data.qrCodeImage);
      } else {
        onSuccess({} as Booking, "");
      }
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setError(apiErr?.message ?? "Failed to reserve seat.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs p-4 sm:p-6">
      <div className="flex min-h-full items-center justify-center">
        <div className="pulse-card relative w-full max-w-md p-6 shadow-2xl my-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-6 pb-3 border-b border-slate-100">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Reserve Seat {seat.seatNumber}</h2>
            <p className="text-xs text-slate-500">{zoneName}</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isLoadingSchedules ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-slate-900" />
          </div>
        ) : schedules.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-sm">
            No active schedule slots available for booking.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="kicker-label mb-2 block">
                Select Date & Time Slot
              </label>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {schedules.map((sch) => {
                  const dateStr = new Date(sch.date).toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  });
                  const isSelected = selectedScheduleId === sch.id;

                  return (
                    <button
                      key={sch.id}
                      type="button"
                      onClick={() => setSelectedScheduleId(sch.id)}
                      className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-all ${isSelected
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-slate-50/50 text-slate-700 hover:border-slate-300 hover:bg-white"
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <Calendar className={`h-4 w-4 ${isSelected ? "text-white" : "text-slate-400"}`} />
                        <div>
                          <p className="text-sm font-bold">{dateStr}</p>
                          <p className={`text-xs capitalize flex items-center gap-1 mt-0.5 ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                            <Clock className="h-3 w-3" />
                            {sch.slot} slot
                          </p>
                        </div>
                      </div>
                      {isSelected && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="pulse-button-secondary flex-1 py-2.5"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !selectedScheduleId}
                className="pulse-button-primary flex-1 py-2.5"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <BookOpen className="h-4 w-4" />
                )}
                {isSubmitting ? "Confirming..." : "Confirm Booking"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  </div>
);
}

// ─── Main Zone Detail View ─────────────────────────────────────────────────────
interface ZoneDetailViewProps {
  zoneId: string;
}

export function ZoneDetailView({ zoneId }: ZoneDetailViewProps) {
  const { user } = useAuth();
  const [zone, setZone] = useState<Zone | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [isLoadingZone, setIsLoadingZone] = useState(true);
  const [isLoadingSeats, setIsLoadingSeats] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newSeatNumber, setNewSeatNumber] = useState("");
  const [isAddingSeat, setIsAddingSeat] = useState(false);
  const [addSeatError, setAddSeatError] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  // Modals state
  const [selectedSeatForBooking, setSelectedSeatForBooking] = useState<Seat | null>(null);
  const [completedBookingData, setCompletedBookingData] = useState<{
    booking: Booking;
    qrCodeImage: string;
  } | null>(null);

  const canManage = user?.role === "admin" || user?.role === "librarian" || user?.role === "super_admin";
  const isStudent = user?.role === "student";

  const fetchZone = useCallback(async () => {
    setIsLoadingZone(true);
    try {
      const res = await zoneService.getById(zoneId);
      setZone(res.data);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setError(apiErr?.message ?? "Failed to load zone.");
    } finally {
      setIsLoadingZone(false);
    }
  }, [zoneId]);

  const fetchSeats = useCallback(async () => {
    setIsLoadingSeats(true);
    try {
      const res = await zoneService.getSeatsByZone(zoneId, canManage && showInactive);
      setSeats(res.data ?? []);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setError(apiErr?.message ?? "Failed to load seats.");
    } finally {
      setIsLoadingSeats(false);
    }
  }, [zoneId, canManage, showInactive]);

  useEffect(() => { fetchZone(); }, [fetchZone]);
  useEffect(() => { fetchSeats(); }, [fetchSeats]);

  const handleAddSeat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSeatNumber.trim()) return;
    setAddSeatError(null);
    setIsAddingSeat(true);
    try {
      const payload: CreateSeatPayload = { seatNumber: newSeatNumber.trim() };
      const res = await zoneService.createSeat(zoneId, payload);
      if (res.data) {
        setSeats((prev) => [...prev, res.data!]);
        setNewSeatNumber("");
      }
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setAddSeatError(apiErr?.message ?? "Failed to add seat.");
    } finally {
      setIsAddingSeat(false);
    }
  };

  const handleDeleteSeat = async (id: string) => {
    if (!confirm("Remove this seat?")) return;
    try {
      await seatService.delete(id);
      setSeats((prev) => prev.filter((s) => s.id !== id));
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      alert(apiErr?.message ?? "Failed to remove seat.");
    }
  };

  const handleBookingSuccess = (booking: Booking, qrCodeImage: string) => {
    setSelectedSeatForBooking(null);
    setCompletedBookingData({ booking, qrCodeImage });
    fetchSeats();
  };

  const freeSeats = seats.filter((s) => s.isActive && !s.isOccupied).length;
  const occupiedSeats = seats.filter((s) => s.isOccupied).length;
  const totalSeats = seats.length;
  const occupancyPercent = totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 0;
  const zoneColor = zone?.color ?? "#0f172a";

  if (isLoadingZone) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f5f7]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
      </div>
    );
  }

  if (error || !zone) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f4f5f7]">
        <AlertCircle className="h-10 w-10 text-rose-500" />
        <p className="text-slate-500 font-medium">{error ?? "Zone not found."}</p>
        <Link href="/zones" className="pulse-button-secondary">
          Back to Zones
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-slate-900">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 pt-6 pb-24 md:pb-8 space-y-6">

        {/* Header */}
        <div>
          <Link href="/zones" className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors">
            <ChevronLeft className="h-4 w-4" />
            Back to Zones
          </Link>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${zoneColor}12`, border: `1.5px solid ${zoneColor}30` }}
              >
                <MapPin className="h-5 w-5" style={{ color: zoneColor }} />
              </div> */}
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">{zone.name}</h1>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${zone.isActive ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-slate-100 border-slate-200 text-slate-500"
                    }`}>
                    {zone.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                {zone.description && (
                  <p className="mt-0.5 text-xs sm:text-sm text-slate-500">{zone.description}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => { fetchZone(); fetchSeats(); }}
                disabled={isLoadingSeats}
                className="pulse-button-secondary py-2.5 px-3 text-xs"
                title="Refresh"
              >
                <RefreshCw className={`h-4 w-4 ${isLoadingSeats ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Summary Stats Strip */}
        <div className="pulse-card flex flex-wrap items-center gap-x-8 gap-y-3 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 border border-emerald-100">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Available</p>
              <p className="text-lg font-extrabold text-emerald-600 leading-tight">{freeSeats}</p>
            </div>
          </div>
          <div className="h-8 w-px bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 border border-amber-100">
              <Armchair className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Occupied</p>
              <p className="text-lg font-extrabold text-amber-600 leading-tight">{occupiedSeats}</p>
            </div>
          </div>
          <div className="h-8 w-px bg-slate-200 hidden sm:block" />
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Seats</p>
            <p className="text-lg font-extrabold text-slate-900 leading-tight">{totalSeats}</p>
          </div>
          <div className="h-8 w-px bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-3">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Occupancy</p>
              <p className="text-lg font-extrabold text-slate-900 leading-tight">{occupancyPercent}%</p>
            </div>
            <div className="w-20 h-2 rounded-full bg-slate-100 overflow-hidden hidden sm:block">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${occupancyPercent}%`,
                  backgroundColor: occupancyPercent >= 85 ? "#f59e0b" : occupancyPercent >= 50 ? "#6366f1" : "#10b981",
                }}
              />
            </div>
          </div>
        </div>

        {/* Zone Rules & Useful Information */}


        {/* Add Seat Form (admin/librarian) */}
        {canManage && (
          <div className="pulse-card p-5">
            <span className="kicker-label mb-3 block">ADD NEW SEAT</span>
            {addSeatError && (
              <div className="mb-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-medium">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {addSeatError}
              </div>
            )}
            <form onSubmit={handleAddSeat} className="flex gap-3">
              <input
                type="text"
                value={newSeatNumber}
                onChange={(e) => setNewSeatNumber(e.target.value)}
                placeholder="e.g. A-101"
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 font-medium"
              />
              <button
                type="submit"
                disabled={isAddingSeat || !newSeatNumber.trim()}
                className="pulse-button-primary"
              >
                {isAddingSeat ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add Seat
              </button>
            </form>
          </div>
        )}
        {/* Check-in Notice */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <CircleAlert className="h-4 w-4 text-amber-600 shrink-0" />
            <span className="text-xs font-bold text-amber-800">Check-in Reminder</span>
          </div>
          <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
            After booking a seat, scan your QR pass at the library entrance within <strong>15 minutes</strong> of your slot start time. Failure to check in will mark your pass as a no-show.
          </p>
        </div>
        {/* Seat List */}
        <div className="space-y-2">
          {/* List header */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="kicker-label">SEAT LIST</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                {totalSeats} total
              </span>
            </div>
            {canManage && (
              <button
                onClick={() => setShowInactive(!showInactive)}
                className="pulse-button-secondary py-1.5 px-3 text-xs"
              >
                {showInactive ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                <span>{showInactive ? "Hide" : "Show"} Inactive</span>
              </button>
            )}
          </div>

          {/* Column headers (desktop) */}
          {!isLoadingSeats && seats.length > 0 && (
            <div className="hidden sm:flex items-center px-5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <span className="w-9 shrink-0 mr-4" />
              <span className="flex-1">Seat</span>
              <span className="w-24 text-right mr-2">Action</span>
            </div>
          )}

          {isLoadingSeats ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-slate-900" />
            </div>
          ) : seats.length === 0 ? (
            <div className="flex flex-col items-center gap-2 pulse-card py-16 text-center">
              <Armchair className="h-10 w-10 text-slate-300" />
              <p className="text-sm text-slate-500 font-medium">No seats configured in this zone yet.</p>
              {canManage && (
                <p className="text-xs text-slate-400">Use the form above to add seats.</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {seats.map((seat) => (
                <SeatRow
                  key={seat.id}
                  seat={seat}
                  canManage={canManage}
                  isStudent={isStudent}
                  onDelete={handleDeleteSeat}
                  onBook={setSelectedSeatForBooking}
                  zoneColor={zoneColor}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Rules & Regulations — larger column */}
        <div className="lg:col-span-3 pulse-card p-5 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Rules & Regulations</h2>
              <p className="text-[11px] text-slate-400 font-medium">Please adhere to these while using this zone</p>
            </div>
          </div>

          {zone.rules && zone.rules.length > 0 ? (
            <ul className="space-y-2">
              {zone.rules.map((rule, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  <span
                    className="mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-extrabold text-white"
                    style={{ backgroundColor: zoneColor }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-slate-600 font-medium leading-relaxed">{rule}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <ShieldCheck className="h-8 w-8 text-slate-300" />
              <p className="text-xs text-slate-400 font-medium">No specific rules configured for this zone yet.</p>
            </div>
          )}
        </div>

        {/* Useful Information — smaller sidebar column */}
        <div className="lg:col-span-2 space-y-4">

          {/* Zone Info Card */}
          <div className="pulse-card p-5 space-y-3">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
              <Info className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-bold text-slate-900">Zone Information</span>
            </div>
            <div className="space-y-2.5 text-xs font-medium">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Zone Name</span>
                <span className="text-slate-900 font-bold">{zone.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Status</span>
                <span className={zone.isActive ? "text-emerald-600 font-bold" : "text-slate-500 font-bold"}>                    {zone.isActive ? "Open & Active" : "Currently Closed"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Total Capacity</span>
                <span className="text-slate-900 font-bold">{totalSeats} seats</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Available Now</span>
                <span className="text-emerald-600 font-bold">{freeSeats} seats</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Created</span>
                <span className="text-slate-700">{new Date(zone.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
              </div>
            </div>
          </div>



          {/* Booking Tip */}
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 space-y-2 mb-20">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-indigo-600 shrink-0" />
              <span className="text-xs font-bold text-indigo-800">Booking Info</span>
            </div>
            <p className="text-[11px] text-indigo-700 font-medium leading-relaxed">
              Select an available seat below and choose a time slot to reserve it. Your QR pass will be generated instantly for check-in.
            </p>
          </div>

        </div>
      </div>
      {/* Book Seat Modal */}
      {selectedSeatForBooking && zone && (
        <BookSeatModal
          seat={selectedSeatForBooking}
          zoneName={zone.name}
          onClose={() => setSelectedSeatForBooking(null)}
          onSuccess={handleBookingSuccess}
        />
      )}

      {/* Success QR Pass Modal */}
      {completedBookingData && zone && (
        <BookingSuccessModal
          booking={completedBookingData.booking}
          qrCodeImage={completedBookingData.qrCodeImage}
          zoneName={zone.name}
          onClose={() => setCompletedBookingData(null)}
        />
      )}
    </div>
  );
}

export default ZoneDetailView;
