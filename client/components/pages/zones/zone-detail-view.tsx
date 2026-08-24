"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/context/auth-context";
import { zoneService } from "@/services/zone-service";
import { seatService } from "@/services/seat-service";
import { bookingService } from "@/services/booking-service";
import { Zone, Seat, Schedule, ApiError, CreateSeatPayload, Booking, SlotType } from "@/lib/types";
import {
  MapPin, Plus, Loader2, AlertCircle, Calendar, Clock, Download,
  Trash2, X, ChevronLeft, BookOpen, CheckCircle2, RefreshCw,
  Armchair, ArrowRight, Eye, EyeOff, ShieldCheck, Info, CircleAlert,
  Sparkles, Lock, Check,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// ─── Slot Meta Config ─────────────────────────────────────────────────────────
const SLOT_META: Record<SlotType, { label: string; time: string; icon: string }> = {
  morning: { label: "Morning", time: "08:00 AM – 12:00 PM", icon: "🌅" },
  noon: { label: "Noon", time: "12:00 PM – 02:00 PM", icon: "☀️" },
  afternoon: { label: "Afternoon", time: "02:00 PM – 06:00 PM", icon: "🌇" },
  evening: { label: "Evening", time: "06:00 PM – 10:00 PM", icon: "🌙" },
};

// ─── Download QR Helper Function ──────────────────────────────────────────────
export function downloadQrImage(base64Image: string, fileName: string = "library-pass-qr.png") {
  const link = document.createElement("a");
  link.href = base64Image;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-4 sm:p-6 flex items-center justify-center">
      <div className="pulse-card relative w-full max-w-sm p-6 text-center shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
          <CheckCircle2 className="h-7 w-7" />
        </div>

        <h3 className="text-xl font-extrabold text-slate-900">Seat Reserved!</h3>
        <p className="mt-1 text-xs text-slate-500">
          Your seat pass QR code has been generated and emailed to you.
        </p>

        {/* QR Code Display */}
        <div className="my-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="mx-auto w-44 h-44 relative rounded-xl overflow-hidden bg-white p-2 border border-slate-200 shadow-2xs">
            <img src={qrCodeImage} alt="QR Code Pass" className="w-full h-full object-contain" />
          </div>

          <button
            onClick={handleDownload}
            className="pulse-button-secondary mt-3 text-xs py-1.5 px-3 w-full"
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
          ⏰ <strong>Check-in Notice:</strong> Scan this QR pass at the entrance within 15 minutes of slot start time.
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
  );
}

// ─── Individual Train Coach Seat Component ─────────────────────────────────────
interface CoachSeatProps {
  seat: Seat;
  isSelected: boolean;
  canManage: boolean;
  isStudent: boolean;
  onSelect: (seat: Seat) => void;
  onDelete: (id: string) => void;
  zoneColor: string;
}

function CoachSeat({
  seat,
  isSelected,
  canManage,
  isStudent,
  onSelect,
  onDelete,
  zoneColor,
}: CoachSeatProps) {
  const isInactive = !seat.isActive;
  const isBooked = !isInactive && (seat.isBooked || seat.isOccupied);
  const isMyBooking = seat.isMyBooking;
  const isAvailable = !isInactive && !isBooked;

  const handleClick = () => {
    if (!isAvailable || !isStudent) return;
    onSelect(seat);
  };

  return (
    <div className="relative group flex flex-col items-center">
      {/* Admin Quick Delete Action */}
      {canManage && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(seat.id);
          }}
          className="absolute -top-2 -right-2 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-white opacity-0 shadow-sm transition-all group-hover:opacity-100 hover:bg-rose-600 active:scale-95"
          title={`Delete ${seat.seatNumber}`}
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}

      {/* Armchair visual container */}
      <button
        type="button"
        disabled={!isAvailable || !isStudent}
        onClick={handleClick}
        className={`relative w-20 sm:w-24 h-24 sm:h-28 rounded-2xl flex flex-col items-center justify-between p-2.5 transition-all duration-200 border-2 select-none ${
          isInactive
            ? "bg-slate-100/70 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed"
            : isMyBooking
            ? "bg-violet-50/90 border-violet-500 text-violet-900 shadow-md ring-2 ring-violet-500/20 cursor-default"
            : isBooked
            ? "bg-rose-50/80 border-rose-200/90 text-rose-900 shadow-2xs cursor-not-allowed"
            : isSelected
            ? "bg-slate-900 border-slate-900 text-white shadow-xl scale-105 ring-4 ring-slate-900/15"
            : "bg-white border-slate-200 hover:border-slate-400 hover:shadow-md hover:-translate-y-1 text-slate-800 cursor-pointer active:scale-95"
        }`}
      >
        {/* Top Backrest Bar */}
        <div
          className={`w-12 sm:w-14 h-2.5 rounded-full transition-colors ${
            isSelected
              ? "bg-emerald-400"
              : isMyBooking
              ? "bg-violet-500"
              : isBooked
              ? "bg-rose-300"
              : isInactive
              ? "bg-slate-300"
              : "bg-slate-200 group-hover:bg-slate-300"
          }`}
        />

        {/* Center Seat Number & Status Icon */}
        <div className="flex flex-col items-center justify-center my-auto">
          <span
            className={`font-mono text-xs sm:text-sm font-black tracking-tight ${
              isSelected ? "text-white" : isBooked ? "text-rose-800" : "text-slate-900"
            }`}
          >
            {seat.seatNumber}
          </span>

          <div className="mt-1 flex items-center gap-1">
            {isSelected ? (
              <span className="flex items-center gap-0.5 rounded-full bg-emerald-500/30 px-1.5 py-0.2 text-[9px] font-extrabold text-emerald-300">
                <Check className="h-2.5 w-2.5" /> Selected
              </span>
            ) : isMyBooking ? (
              <span className="rounded-full bg-violet-200/80 px-1.5 py-0.2 text-[9px] font-extrabold text-violet-800">
                Your Seat
              </span>
            ) : isBooked ? (
              <span className="flex items-center gap-0.5 rounded-full bg-rose-100 px-1.5 py-0.2 text-[9px] font-bold text-rose-700">
                <Lock className="h-2.5 w-2.5" /> Booked
              </span>
            ) : isInactive ? (
              <span className="text-[9px] font-semibold text-slate-400">Inactive</span>
            ) : (
              <span className="flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 text-[9px] font-bold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Available
              </span>
            )}
          </div>
        </div>

        {/* Bottom Armrest Tabs */}
        <div className="w-full flex justify-between items-center px-0.5">
          <div
            className={`h-3.5 w-1.5 rounded-full ${
              isSelected ? "bg-slate-700" : isBooked ? "bg-rose-200" : "bg-slate-200"
            }`}
          />
          <div
            className={`h-1.5 w-6 rounded-full ${
              isSelected ? "bg-slate-700" : isBooked ? "bg-rose-200" : "bg-slate-200"
            }`}
          />
          <div
            className={`h-3.5 w-1.5 rounded-full ${
              isSelected ? "bg-slate-700" : isBooked ? "bg-rose-200" : "bg-slate-200"
            }`}
          />
        </div>
      </button>
    </div>
  );
}

// ─── Train Coach Layout Component ─────────────────────────────────────────────
interface CoachLayoutProps {
  seats: Seat[];
  selectedSeatId: string | null;
  canManage: boolean;
  isStudent: boolean;
  onSelectSeat: (seat: Seat) => void;
  onDeleteSeat: (id: string) => void;
  zoneColor: string;
}

function CoachLayout({
  seats,
  selectedSeatId,
  canManage,
  isStudent,
  onSelectSeat,
  onDeleteSeat,
  zoneColor,
}: CoachLayoutProps) {
  // Split seats into 2x2 rows (2 seats on Left, 2 seats on Right, Aisle in the middle)
  const rows = useMemo(() => {
    const list = [...seats];
    const grouped: { left: Seat[]; right: Seat[]; rowNumber: number }[] = [];
    let rowIdx = 1;

    for (let i = 0; i < list.length; i += 4) {
      const chunk = list.slice(i, i + 4);
      grouped.push({
        rowNumber: rowIdx++,
        left: chunk.slice(0, 2),
        right: chunk.slice(2, 4),
      });
    }
    return grouped;
  }, [seats]);

  return (
    <div className="w-full max-w-2xl mx-auto rounded-3xl border-2 border-slate-300 bg-[#f8f9fa] shadow-inner p-4 sm:p-7 relative overflow-hidden">
      {/* Coach Top Header (Front / Whiteboard & Entrance) */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-3.5 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
            🚪
          </span>
          <span>Front Entrance</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-400">
          <span>🧑‍🏫 Front Whiteboard / Screen</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
          <span>Power Outlets</span>
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
            🔌
          </span>
        </div>
      </div>

      {/* Central Walking Path Watermark */}
      <div className="space-y-4">
        {rows.map((row) => (
          <div key={row.rowNumber} className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Left Pair */}
            <div className="flex items-center gap-2 sm:gap-3">
              {row.left.map((seat) => (
                <CoachSeat
                  key={seat.id}
                  seat={seat}
                  isSelected={selectedSeatId === seat.id}
                  canManage={canManage}
                  isStudent={isStudent}
                  onSelect={onSelectSeat}
                  onDelete={onDeleteSeat}
                  zoneColor={zoneColor}
                />
              ))}
              {row.left.length < 2 &&
                Array.from({ length: 2 - row.left.length }).map((_, i) => (
                  <div key={i} className="w-20 sm:w-24 h-24 sm:h-28" />
                ))}
            </div>

            {/* Central Walking Aisle */}
            <div className="flex-1 flex flex-col items-center justify-center py-2 min-w-[50px] sm:min-w-[70px] select-none">
              <div className="h-full w-px border-r-2 border-dashed border-slate-300 my-1" />
              <span className="rounded-full bg-slate-200/90 px-2 py-0.5 text-[9px] font-extrabold tracking-wider text-slate-500 uppercase">
                Row {row.rowNumber}
              </span>
              <div className="h-full w-px border-r-2 border-dashed border-slate-300 my-1" />
            </div>

            {/* Right Pair */}
            <div className="flex items-center gap-2 sm:gap-3">
              {row.right.map((seat) => (
                <CoachSeat
                  key={seat.id}
                  seat={seat}
                  isSelected={selectedSeatId === seat.id}
                  canManage={canManage}
                  isStudent={isStudent}
                  onSelect={onSelectSeat}
                  onDelete={onDeleteSeat}
                  zoneColor={zoneColor}
                />
              ))}
              {row.right.length < 2 &&
                Array.from({ length: 2 - row.right.length }).map((_, i) => (
                  <div key={i} className="w-20 sm:w-24 h-24 sm:h-28" />
                ))}
            </div>
          </div>
        ))}
      </div>

      {/* Coach Bottom Header (Rear Area) */}
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-3 flex items-center justify-between text-xs font-bold text-slate-500 shadow-2xs">
        <span>🚪 Rear Emergency Exit</span>
        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-extrabold">
          Study Hall Cabin End
        </span>
        <span>☕ Quiet Break Zone</span>
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
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<SlotType>("morning");

  const [isLoadingZone, setIsLoadingZone] = useState(true);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(true);
  const [isLoadingSeats, setIsLoadingSeats] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Seat Selection & Booking State
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [isReserving, setIsReserving] = useState(false);
  const [reservationError, setReservationError] = useState<string | null>(null);
  const [completedBookingData, setCompletedBookingData] = useState<{
    booking: Booking;
    qrCodeImage: string;
  } | null>(null);

  // Admin Seat Management State
  const [newSeatNumber, setNewSeatNumber] = useState("");
  const [isAddingSeat, setIsAddingSeat] = useState(false);
  const [addSeatError, setAddSeatError] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const canManage = user?.role === "admin" || user?.role === "librarian" || user?.role === "super_admin";
  const isStudent = user?.role === "student";

  // ── 1. Fetch Zone ─────────────────────────────────────────────────────────
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

  // ── 2. Fetch Schedules ────────────────────────────────────────────────────
  const fetchSchedules = useCallback(async () => {
    setIsLoadingSchedules(true);
    try {
      const res = await bookingService.getSchedules();
      const rawList = res.data ?? [];
      const todayStr = new Date().toISOString().split("T")[0];
      const validSchedules = rawList.filter((s) => {
        const sDateStr = new Date(s.date).toISOString().split("T")[0];
        return sDateStr >= todayStr;
      });
      setSchedules(validSchedules);

      // Default date & slot selection
      if (validSchedules.length > 0) {
        const firstDateStr = new Date(validSchedules[0].date).toISOString().split("T")[0];
        setSelectedDate(firstDateStr);
        setSelectedSlot(validSchedules[0].slot);
      }
    } catch (err: unknown) {
      console.error("Failed to load schedules:", err);
    } finally {
      setIsLoadingSchedules(false);
    }
  }, []);

  // Distinct dates available in schedules
  const availableDates = useMemo(() => {
    const map = new Map<string, Date>();
    schedules.forEach((sch) => {
      const dateStr = new Date(sch.date).toISOString().split("T")[0];
      if (!map.has(dateStr)) {
        map.set(dateStr, new Date(sch.date));
      }
    });
    return Array.from(map.entries()).map(([dateStr, dateObj]) => ({
      dateStr,
      dateObj,
    }));
  }, [schedules]);

  // Find active scheduleId based on selected date & slot
  const activeSchedule = useMemo(() => {
    if (!selectedDate) return null;
    return schedules.find((s) => {
      const sDateStr = new Date(s.date).toISOString().split("T")[0];
      return sDateStr === selectedDate && s.slot === selectedSlot;
    });
  }, [schedules, selectedDate, selectedSlot]);

  // ── 3. Fetch Seats with Schedule-Aware Booking Status ─────────────────────
  const fetchSeats = useCallback(async () => {
    setIsLoadingSeats(true);
    try {
      const scheduleId = activeSchedule?.id;
      const res = await zoneService.getSeatsByZone(
        zoneId,
        canManage && showInactive,
        scheduleId
      );
      setSeats(res.data ?? []);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setError(apiErr?.message ?? "Failed to load seats.");
    } finally {
      setIsLoadingSeats(false);
    }
  }, [zoneId, canManage, showInactive, activeSchedule?.id]);

  useEffect(() => {
    fetchZone();
    fetchSchedules();
  }, [fetchZone, fetchSchedules]);

  useEffect(() => {
    if (zoneId) {
      fetchSeats();
    }
  }, [fetchSeats, zoneId, activeSchedule?.id, showInactive]);

  // Clear selected seat if date/slot changes
  useEffect(() => {
    setSelectedSeat(null);
    setReservationError(null);
  }, [selectedDate, selectedSlot]);

  // ── Seat Reservation Action ───────────────────────────────────────────────
  const handleReserveSeat = async () => {
    if (!selectedSeat || !activeSchedule) return;
    setIsReserving(true);
    setReservationError(null);

    try {
      const res = await bookingService.create({
        seatId: selectedSeat.id,
        scheduleId: activeSchedule.id,
      });

      if (res.data?.booking && res.data?.qrCodeImage) {
        setCompletedBookingData({
          booking: res.data.booking,
          qrCodeImage: res.data.qrCodeImage,
        });
      }
      setSelectedSeat(null);
      fetchSeats();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setReservationError(apiErr?.message ?? "Failed to reserve seat.");
    } finally {
      setIsReserving(false);
    }
  };

  // ── Admin Handlers ────────────────────────────────────────────────────────
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
      if (selectedSeat?.id === id) setSelectedSeat(null);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      alert(apiErr?.message ?? "Failed to remove seat.");
    }
  };

  // ── Counts & Metrics ──────────────────────────────────────────────────────
  const availableSeatsCount = seats.filter((s) => s.isActive && !s.isBooked && !s.isOccupied).length;
  const bookedSeatsCount = seats.filter((s) => s.isActive && (s.isBooked || s.isOccupied)).length;
  const totalSeatsCount = seats.length;
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
    <div className="min-h-screen bg-[#f4f5f7] text-slate-900 pb-28 md:pb-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 pt-6 space-y-6">

        {/* ── Header ── */}
        <div>
          <Link
            href="/zones"
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Zones
          </Link>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                  {zone.name}
                </h1>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                    zone.isActive
                      ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                      : "bg-slate-100 border-slate-200 text-slate-500"
                  }`}
                >
                  {zone.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              {zone.description && (
                <p className="mt-0.5 text-xs sm:text-sm text-slate-500 font-medium">{zone.description}</p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  fetchZone();
                  fetchSeats();
                }}
                disabled={isLoadingSeats}
                className="pulse-button-secondary py-2.5 px-3 text-xs"
                title="Refresh Seats"
              >
                <RefreshCw className={`h-4 w-4 ${isLoadingSeats ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </div>

        {/* ── STEP 1: Schedule Selection (Date & Time Period) ── */}
        <div className="pulse-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="kicker-label">STEP 1</span>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                Choose Date & Time Slot
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-semibold">
              Select a session to view real-time seat availability
            </span>
          </div>

          {/* Date Selector Tabs */}
          <div>
            <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2 block">
              Reservation Date
            </label>
            {isLoadingSchedules ? (
              <div className="h-10 w-full animate-pulse rounded-xl bg-slate-200" />
            ) : availableDates.length === 0 ? (
              <p className="text-xs text-rose-500 font-semibold">No schedule dates available.</p>
            ) : (
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                {availableDates.map(({ dateStr, dateObj }) => {
                  const isSelected = selectedDate === dateStr;
                  const isToday = new Date().toISOString().split("T")[0] === dateStr;
                  const dayName = dateObj.toLocaleDateString(undefined, { weekday: "short" });
                  const formatted = dateObj.toLocaleDateString(undefined, { month: "short", day: "numeric" });

                  return (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() => setSelectedDate(dateStr)}
                      className={`flex flex-col items-center justify-center px-4 py-2.5 rounded-2xl border transition-all shrink-0 min-w-[90px] ${
                        isSelected
                          ? "bg-slate-900 border-slate-900 text-white shadow-md scale-102"
                          : "bg-slate-50/70 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-white"
                      }`}
                    >
                      <span className={`text-[10px] font-extrabold uppercase ${isSelected ? "text-slate-300" : "text-slate-400"}`}>
                        {isToday ? "Today" : dayName}
                      </span>
                      <span className="text-xs font-black mt-0.5">{formatted}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Slot Selector Pills */}
          <div>
            <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2 block">
              Time Period
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {(["morning", "noon", "afternoon", "evening"] as SlotType[]).map((slotKey) => {
                const isSelected = selectedSlot === slotKey;
                const meta = SLOT_META[slotKey];

                return (
                  <button
                    key={slotKey}
                    type="button"
                    onClick={() => setSelectedSlot(slotKey)}
                    className={`flex flex-col p-3 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? "bg-slate-900 border-slate-900 text-white shadow-md ring-2 ring-slate-900/10"
                        : "bg-slate-50/70 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-base">{meta.icon}</span>
                      <span
                        className={`text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded-full ${
                          isSelected
                            ? "bg-white/20 text-white"
                            : "bg-slate-200/80 text-slate-600"
                        }`}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <span className={`text-[11px] font-semibold ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                      {meta.time}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── STEP 2: Coach Seating Visualization ── */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
            <div>
              <span className="kicker-label">STEP 2</span>
              <h2 className="text-lg font-extrabold text-slate-900">
                Interactive Seating Plan
              </h2>
            </div>

            {/* Visual Legend */}
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-md bg-white border border-slate-300 shadow-2xs" />
                <span className="text-slate-600">Available</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-md bg-rose-100 border border-rose-300" />
                <span className="text-slate-600">Booked</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-md bg-slate-900 border border-slate-900" />
                <span className="text-slate-600">Selected</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-md bg-violet-100 border border-violet-400" />
                <span className="text-slate-600">Your Booking</span>
              </div>
              {canManage && (
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-md bg-slate-200 border border-slate-300" />
                  <span className="text-slate-400">Inactive</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="flex items-center justify-between bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-2xs text-xs font-bold text-slate-600">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                <strong className="text-slate-900">{availableSeatsCount}</strong> of{" "}
                <strong className="text-slate-900">{totalSeatsCount}</strong> seats available for{" "}
                <span className="capitalize font-black text-slate-900">{selectedSlot}</span> slot
              </span>
            </div>
            {canManage && (
              <button
                onClick={() => setShowInactive(!showInactive)}
                className="pulse-button-secondary py-1 px-2.5 text-[11px]"
              >
                {showInactive ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                <span>{showInactive ? "Hide" : "Show"} Inactive</span>
              </button>
            )}
          </div>

          {/* Seating Plan Area */}
          {isLoadingSeats ? (
            <div className="flex flex-col items-center justify-center py-24 pulse-card gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
              <p className="text-xs text-slate-400 font-semibold">Loading coach seating map…</p>
            </div>
          ) : seats.length === 0 ? (
            <div className="flex flex-col items-center gap-3 pulse-card py-20 text-center">
              <Armchair className="h-10 w-10 text-slate-300" />
              <p className="text-sm text-slate-600 font-bold">No seats found in this study zone.</p>
              {canManage && (
                <p className="text-xs text-slate-400">Use the admin form below to add seats.</p>
              )}
            </div>
          ) : (
            <CoachLayout
              seats={seats}
              selectedSeatId={selectedSeat?.id ?? null}
              canManage={canManage}
              isStudent={isStudent}
              onSelectSeat={setSelectedSeat}
              onDeleteSeat={handleDeleteSeat}
              zoneColor={zoneColor}
            />
          )}
        </div>

        {/* ── Admin: Add Seat Form ── */}
        {canManage && (
          <div className="pulse-card p-5 space-y-3">
            <span className="kicker-label block">ADMINISTRATION &rsaquo; ADD NEW SEAT</span>
            {addSeatError && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-medium">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {addSeatError}
              </div>
            )}
            <form onSubmit={handleAddSeat} className="flex gap-3">
              <input
                type="text"
                value={newSeatNumber}
                onChange={(e) => setNewSeatNumber(e.target.value)}
                placeholder="e.g. A-11, B-01"
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

        {/* ── Zone Guidelines & Regulations ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3 pulse-card p-5 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Rules & Regulations</h2>
                <p className="text-[11px] text-slate-400 font-medium">Zone etiquette and guidelines</p>
              </div>
            </div>

            {zone.rules && zone.rules.length > 0 ? (
              <ul className="space-y-2">
                {zone.rules.map((rule, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs font-medium text-slate-600">
                    <span
                      className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-extrabold text-white"
                      style={{ backgroundColor: zoneColor }}
                    >
                      {i + 1}
                    </span>
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400 font-medium">Standard library quiet study rules apply.</p>
            )}
          </div>

          <div className="lg:col-span-2 pulse-card p-5 space-y-3">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
              <Info className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-bold text-slate-900">Check-in Reminder</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              After confirming your reservation, present your QR pass at the entrance scanner within <strong>15 minutes</strong> of your slot start time to check in.
            </p>
          </div>
        </div>
      </div>

      {/* ── Sticky Reservation Action Bar (Slides in when seat is selected) ── */}
      {selectedSeat && activeSchedule && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:max-w-md z-40 animate-in slide-in-from-bottom-5 duration-300">
          <div className="pulse-card p-4 shadow-2xl border-2 border-slate-900 bg-white/95 backdrop-blur-md">
            {reservationError && (
              <div className="mb-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700 font-medium">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{reservationError}</span>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white font-mono font-black text-base shadow-sm">
                  {selectedSeat.seatNumber}
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">
                    Seat {selectedSeat.seatNumber}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-semibold">
                    {new Date(activeSchedule.date).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    • <span className="capitalize font-bold text-slate-700">{activeSchedule.slot}</span> Slot
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSeat(null)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                title="Cancel Selection"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedSeat(null)}
                className="pulse-button-secondary py-2.5 px-3 text-xs"
              >
                Clear
              </button>
              <button
                type="button"
                disabled={isReserving}
                onClick={handleReserveSeat}
                className="pulse-button-primary flex-1 py-2.5 text-xs"
              >
                {isReserving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                <span>{isReserving ? "Reserving Seat..." : "Confirm Reservation"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Success QR Pass Modal ── */}
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
