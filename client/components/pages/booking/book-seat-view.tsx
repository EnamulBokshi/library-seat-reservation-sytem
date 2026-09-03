"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/context/auth-context";
import { zoneService } from "@/services/zone-service";
import { seatService } from "@/services/seat-service";
import { bookingService } from "@/services/booking-service";
import { settingService } from "@/services/setting-service";
import {
  Zone,
  Seat,
  Schedule,
  ApiError,
  CreateSeatPayload,
  Booking,
  SlotType,
  SlotConfig,
  DEFAULT_SLOT_CONFIG,
} from "@/lib/types";
import {
  MapPin,
  Plus,
  Loader2,
  AlertCircle,
  Calendar,
  Clock,
  Download,
  Trash2,
  X,
  BookOpen,
  CheckCircle2,
  RefreshCw,
  Armchair,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  Info,
  Users,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

// ─── Default Zone Visual Images ───────────────────────────────────────────────
const ZONE_IMAGES: Record<string, string> = {
  "Silent Zone":
    "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1200&q=80",
  "Group Study Zone":
    "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80",
  "Computer Zone":
    "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80",
  "Reading Zone":
    "https://images.unsplash.com/photo-1568667256549-094345857637?auto=format&fit=crop&w=1200&q=80",
};

const DEFAULT_ZONE_IMAGE =
  "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1200&q=80";

// ─── Slot Past Checker ────────────────────────────────────────────────────────
export const isSlotPast = (
  dateStr: string,
  slot: SlotType,
  customConfig?: SlotConfig
): boolean => {
  if (!dateStr) return false;
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  if (dateStr < todayStr) return true;
  if (dateStr > todayStr) return false;

  // It's today
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const config = customConfig ?? DEFAULT_SLOT_CONFIG;
  const slotDetail = config[slot] ?? DEFAULT_SLOT_CONFIG[slot];

  if (!slotDetail) return false;

  const [endHour, endMin] = (slotDetail.endTime || "22:00").split(":");
  const endMinutes = (parseInt(endHour, 10) || 0) * 60 + (parseInt(endMin, 10) || 0);

  return currentMinutes >= endMinutes;
};

export const getFirstAvailableSlot = (
  dateStr: string,
  availableSchedules: Schedule[]
): SlotType => {
  const allSlots: SlotType[] = ["morning", "noon", "afternoon", "evening"];
  const dateSchedules = availableSchedules.filter(
    (s) => new Date(s.date).toISOString().split("T")[0] === dateStr
  );
  const existingSlotKeys = new Set(dateSchedules.map((s) => s.slot));

  for (const slot of allSlots) {
    if (existingSlotKeys.has(slot) && !isSlotPast(dateStr, slot)) {
      return slot;
    }
  }

  return dateSchedules[0]?.slot || "morning";
};

// ─── Download QR Helper ───────────────────────────────────────────────────────
export function downloadQrImage(base64Image: string, fileName: string = "library-pass-qr.png") {
  const link = document.createElement("a");
  link.href = base64Image;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ─── Success & QR Modal ───────────────────────────────────────────────────────
interface BookingSuccessModalProps {
  booking: Booking;
  qrCodeImage: string;
  zoneName: string;
  onClose: () => void;
}

function BookingSuccessModal({
  booking,
  qrCodeImage,
  zoneName,
  onClose,
}: BookingSuccessModalProps) {
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

// ─── Individual Coach Seat Component ──────────────────────────────────────────
interface CoachSeatProps {
  seat: Seat;
  isSelected: boolean;
  canManage: boolean;
  isStudent: boolean;
  isSlotPast?: boolean;
  onSelect: (seat: Seat) => void;
  onDelete: (id: string) => void;
  zoneColor: string;
}

function CoachSeat({
  seat,
  isSelected,
  canManage,
  isStudent,
  isSlotPast = false,
  onSelect,
  onDelete,
  zoneColor,
}: CoachSeatProps) {
  const isInactive = !seat.isActive;
  const isBooked = !isInactive && (seat.isBooked || seat.isOccupied);
  const isMyBooking = seat.isMyBooking;
  const isAvailable = !isInactive && !isBooked && !isSlotPast;

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
            : isSlotPast
            ? "bg-slate-100/70 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed"
            : isSelected
            ? "bg-slate-900 border-slate-900 text-white shadow-xl scale-105 ring-4 ring-slate-900/15"
            : "bg-white border-slate-200/90 text-slate-700 hover:border-slate-400 hover:shadow-md hover:scale-102 cursor-pointer"
        }`}
      >
        {/* Headrest Pill */}
        <div
          className={`w-12 sm:w-14 h-3.5 rounded-full flex items-center justify-center text-[9px] font-black uppercase tracking-wider transition-colors ${
            isSelected
              ? "bg-white text-slate-900"
              : isBooked
              ? "bg-rose-200 text-rose-800"
              : isMyBooking
              ? "bg-violet-200 text-violet-800"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {seat.seatNumber}
        </div>

        {/* Armchair Center / Cushion Status */}
        <div className="flex flex-col items-center justify-center my-auto">
          <Armchair
            className={`h-6 w-6 transition-transform duration-200 ${
              isSelected
                ? "text-white scale-110"
                : isMyBooking
                ? "text-violet-600"
                : isBooked
                ? "text-rose-400"
                : "text-slate-400"
            }`}
          />
          <div className="mt-1 flex items-center justify-center">
            {isInactive ? (
              <span className="text-[9px] font-bold text-slate-400">Disabled</span>
            ) : isMyBooking ? (
              <span className="text-[9px] font-black text-violet-700">My Pass</span>
            ) : isBooked ? (
              <span className="text-[9px] font-extrabold text-rose-700">Reserved</span>
            ) : isSlotPast ? (
              <span className="text-[9px] font-bold text-slate-400">Ended</span>
            ) : isSelected ? (
              <span className="text-[9px] font-black text-white">Selected</span>
            ) : (
              <span className="text-[9px] font-bold text-emerald-600">Available</span>
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
  isSlotPast?: boolean;
  onSelectSeat: (seat: Seat) => void;
  onDeleteSeat: (id: string) => void;
  zoneColor: string;
}

function CoachLayout({
  seats,
  selectedSeatId,
  canManage,
  isStudent,
  isSlotPast = false,
  onSelectSeat,
  onDeleteSeat,
  zoneColor,
}: CoachLayoutProps) {
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

      {/* Rows */}
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
                  isSlotPast={isSlotPast}
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
                  isSlotPast={isSlotPast}
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

// ─── Main Unified Booking View Component ───────────────────────────────────────
interface BookSeatViewProps {
  initialZoneId?: string;
}

export function BookSeatView({ initialZoneId }: BookSeatViewProps) {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const urlZoneId = searchParams.get("zoneId") || initialZoneId;

  // Data states
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string>(urlZoneId || "");
  const [seats, setSeats] = useState<Seat[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [slotConfig, setSlotConfig] = useState<SlotConfig>(DEFAULT_SLOT_CONFIG);

  // Selection states
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<SlotType>("morning");
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);

  // Loading & Action states
  const [isLoadingZones, setIsLoadingZones] = useState(true);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(true);
  const [isLoadingSeats, setIsLoadingSeats] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const canManage =
    user?.role === "admin" || user?.role === "librarian" || user?.role === "super_admin";
  const isStudent = user?.role === "student";

  // ── 1. Fetch All Zones & Public Config ───────────────────────────────────────
  const fetchInitialData = useCallback(async () => {
    setIsLoadingZones(true);
    setError(null);
    try {
      const [zonesRes, configRes] = await Promise.allSettled([
        zoneService.getAll(),
        settingService.getPublicConfig(),
      ]);

      let loadedZones: Zone[] = [];
      if (zonesRes.status === "fulfilled") {
        loadedZones = zonesRes.value.data ?? [];
        setZones(loadedZones);

        // Select initial zone
        if (loadedZones.length > 0) {
          const matched = urlZoneId ? loadedZones.find((z) => z.id === urlZoneId) : null;
          setSelectedZoneId(matched ? matched.id : loadedZones[0].id);
        }
      } else {
        const err = zonesRes.reason as ApiError;
        setError(err?.message ?? "Failed to load study zones.");
      }

      if (configRes.status === "fulfilled" && configRes.value.data?.slotConfig) {
        setSlotConfig(configRes.value.data.slotConfig);
      }
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setError(apiErr?.message ?? "Failed to load booking page data.");
    } finally {
      setIsLoadingZones(false);
    }
  }, [urlZoneId]);

  // ── 2. Fetch Schedules ──────────────────────────────────────────────────────
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
        setSelectedSlot(getFirstAvailableSlot(firstDateStr, validSchedules));
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

  // Find active schedule based on selected date & slot
  const activeSchedule = useMemo(() => {
    if (!selectedDate) return null;
    return schedules.find((s) => {
      const sDateStr = new Date(s.date).toISOString().split("T")[0];
      return sDateStr === selectedDate && s.slot === selectedSlot;
    });
  }, [schedules, selectedDate, selectedSlot]);

  // Active Zone Object
  const selectedZone = useMemo(() => {
    return zones.find((z) => z.id === selectedZoneId) || zones[0] || null;
  }, [zones, selectedZoneId]);

  // ── 3. Fetch Seats for Selected Zone & Schedule ────────────────────────────
  const fetchSeats = useCallback(async () => {
    if (!selectedZoneId) return;
    setIsLoadingSeats(true);
    try {
      const scheduleId = activeSchedule?.id;
      const res = await zoneService.getSeatsByZone(
        selectedZoneId,
        canManage && showInactive,
        scheduleId
      );
      setSeats(res.data ?? []);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      console.error("Failed to load seats:", apiErr);
    } finally {
      setIsLoadingSeats(false);
    }
  }, [selectedZoneId, canManage, showInactive, activeSchedule?.id]);

  useEffect(() => {
    fetchInitialData();
    fetchSchedules();
  }, [fetchInitialData, fetchSchedules]);

  useEffect(() => {
    if (selectedZoneId) {
      fetchSeats();
    }
  }, [fetchSeats, selectedZoneId, activeSchedule?.id, showInactive]);

  // Clear selected seat when date, slot, or zone changes
  useEffect(() => {
    setSelectedSeat(null);
    setReservationError(null);
  }, [selectedDate, selectedSlot, selectedZoneId]);

  // ── Reserve Seat Action ───────────────────────────────────────────────────
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

  // ── Admin Seat Handlers ───────────────────────────────────────────────────
  const handleAddSeat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSeatNumber.trim() || !selectedZoneId) return;
    setAddSeatError(null);
    setIsAddingSeat(true);
    try {
      const payload: CreateSeatPayload = { seatNumber: newSeatNumber.trim() };
      const res = await zoneService.createSeat(selectedZoneId, payload);
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
    if (!confirm("Remove this seat from the zone?")) return;
    try {
      await seatService.delete(id);
      setSeats((prev) => prev.filter((s) => s.id !== id));
      if (selectedSeat?.id === id) setSelectedSeat(null);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      alert(apiErr?.message ?? "Failed to remove seat.");
    }
  };

  // Metrics
  const availableSeatsCount = seats.filter(
    (s) => s.isActive && !s.isBooked && !s.isOccupied
  ).length;
  const bookedSeatsCount = seats.filter(
    (s) => s.isActive && (s.isBooked || s.isOccupied)
  ).length;
  const totalSeatsCount = seats.length;
  const zoneColor = selectedZone?.color ?? "#0f172a";
  const zoneImage = selectedZone
    ? ZONE_IMAGES[selectedZone.name] || DEFAULT_ZONE_IMAGE
    : DEFAULT_ZONE_IMAGE;

  if (isLoadingZones) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
      </div>
    );
  }

  if (error || !selectedZone) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center px-4">
        <AlertCircle className="h-10 w-10 text-rose-500" />
        <h2 className="text-lg font-black text-slate-900">Unable to load booking page</h2>
        <p className="text-slate-500 text-xs font-medium max-w-sm">
          {error ?? "No study zones found. Please configure library zones first."}
        </p>
        <button onClick={fetchInitialData} className="pulse-button-primary mt-2">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-slate-900 pb-28 md:pb-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 pt-6 space-y-6">

        {/* ── Top Header & Zone Select Menu ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="kicker-label">SEAT RESERVATION</p>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 mt-1">
              Book a Study Seat
            </h1>
          </div>

          {/* Zone Select Menu */}
          <div className="flex items-center gap-3">
            <div className="relative min-w-[220px]">
              <label htmlFor="zone-select" className="sr-only">
                Select Study Zone
              </label>
              <select
                id="zone-select"
                value={selectedZoneId}
                onChange={(e) => setSelectedZoneId(e.target.value)}
                className="w-full appearance-none rounded-2xl border border-slate-300 bg-white py-2.5 pl-4 pr-10 text-xs font-black text-slate-900 shadow-2xs hover:border-slate-400 focus:border-slate-900 focus:outline-none cursor-pointer"
              >
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name} {z.isActive ? "" : "(Closed)"}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            </div>

            <button
              onClick={() => {
                fetchInitialData();
                fetchSeats();
              }}
              disabled={isLoadingSeats}
              className="pulse-button-secondary py-2.5 px-3 text-xs shrink-0"
              title="Refresh Seats"
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingSeats ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* ── Zone Brief (STRICT CONSTRAINT: No box, no rounded border, no borders) ── */}
        <div className="pt-2 pb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Zone Image */}
            <div className="md:col-span-4 aspect-16/10 overflow-hidden shadow-xs">
              <img
                src={zoneImage}
                alt={selectedZone.name}
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-102"
              />
            </div>

            {/* Zone Brief Details */}
            <div className="md:col-span-8 space-y-2.5">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: selectedZone.color || "#0f172a" }}
                />
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
                  Study Hall &bull; {selectedZone.isActive ? "Open & Operating" : "Temporarily Closed"}
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {selectedZone.name}
              </h2>

              <p className="text-sm text-slate-600 leading-relaxed font-medium">
                {selectedZone.description ||
                  "A dedicated study area configured for optimal student focus and productivity."}
              </p>

              {/* Rules & Guidelines (Clean inline typography, no box/border) */}
              {selectedZone.rules && selectedZone.rules.length > 0 && (
                <div className="pt-1 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 font-semibold">
                  {selectedZone.rules.map((rule, idx) => (
                    <span key={idx} className="flex items-center gap-1.5">
                      <span className="text-slate-900 font-bold">&bull;</span>
                      <span>{rule}</span>
                    </span>
                  ))}
                </div>
              )}
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
                  const formatted = dateObj.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  });

                  return (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() => {
                        setSelectedDate(dateStr);
                        if (isSlotPast(dateStr, selectedSlot, slotConfig)) {
                          const nextSlot = getFirstAvailableSlot(dateStr, schedules);
                          setSelectedSlot(nextSlot);
                        }
                      }}
                      className={`flex flex-col items-center justify-center px-4 py-2.5 rounded-2xl border transition-all shrink-0 min-w-[90px] ${
                        isSelected
                          ? "bg-slate-900 border-slate-900 text-white shadow-md scale-102"
                          : "bg-slate-50/70 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-white"
                      }`}
                    >
                      <span
                        className={`text-[10px] font-extrabold uppercase ${
                          isSelected ? "text-slate-300" : "text-slate-400"
                        }`}
                      >
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
                const detail = slotConfig[slotKey] ?? DEFAULT_SLOT_CONFIG[slotKey];
                const isPast = isSlotPast(selectedDate, slotKey, slotConfig);

                // Check if this slot is open in the schedule for the selected date
                const scheduleForSlot = schedules.find(
                  (s) =>
                    s.slot === slotKey &&
                    new Date(s.date).toISOString().split("T")[0] === selectedDate
                );
                const isClosed = !scheduleForSlot || scheduleForSlot.isOpen === false;
                const isDisabled = isPast || isClosed;

                return (
                  <button
                    key={slotKey}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => {
                      if (!isDisabled) setSelectedSlot(slotKey);
                    }}
                    className={`flex flex-col p-3 rounded-2xl border text-left transition-all ${
                      isClosed
                        ? "bg-slate-100/70 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed select-none"
                        : isPast
                        ? "bg-slate-100/70 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed select-none"
                        : isSelected
                        ? "bg-slate-900 border-slate-900 text-white shadow-md ring-2 ring-slate-900/10"
                        : "bg-slate-50/70 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-white cursor-pointer"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-base ${isDisabled ? "grayscale opacity-50" : ""}`}>
                        {detail?.icon ?? "⏱️"}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded-full ${
                          isClosed
                            ? "bg-rose-100 text-rose-700"
                            : isPast
                            ? "bg-slate-200 text-slate-500"
                            : isSelected
                            ? "bg-white/20 text-white"
                            : "bg-slate-200/80 text-slate-600"
                        }`}
                      >
                        {isClosed ? "Closed" : isPast ? "Ended" : detail?.label ?? slotKey}
                      </span>
                    </div>
                    <span
                      className={`text-[11px] font-semibold ${
                        isDisabled
                          ? "text-slate-400 line-through"
                          : isSelected
                          ? "text-slate-300"
                          : "text-slate-500"
                      }`}
                    >
                      {detail?.startTime} &ndash; {detail?.endTime}
                    </span>
                    {isClosed ? (
                      <span className="text-[9px] font-bold text-rose-500 mt-1">
                        Closed by Admin
                      </span>
                    ) : isPast ? (
                      <span className="text-[9px] font-bold text-rose-500 mt-1">
                        Passed for today
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── STEP 2: Interactive Train Coach Seating Plan ── */}
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
                <span className="h-3 w-3 rounded-md bg-rose-100 border border-rose-300 shadow-2xs" />
                <span className="text-slate-600">Reserved</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-md bg-violet-100 border border-violet-400 shadow-2xs" />
                <span className="text-slate-600">My Booking</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-md bg-slate-900 border border-slate-900 shadow-2xs" />
                <span className="text-slate-600">Selected</span>
              </div>
            </div>
          </div>

          {/* Seating Layout Canvas */}
          <div className="pulse-card p-4 sm:p-6 overflow-x-auto">
            {isLoadingSeats ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
                <p className="text-xs text-slate-500 font-bold">
                  Loading seat map for {selectedZone.name}...
                </p>
              </div>
            ) : seats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-2">
                <Armchair className="h-10 w-10 text-slate-300" />
                <p className="text-xs font-bold text-slate-500">
                  No seats have been configured in this zone yet.
                </p>
              </div>
            ) : (
              <CoachLayout
                seats={seats}
                selectedSeatId={selectedSeat?.id ?? null}
                canManage={canManage}
                isStudent={isStudent}
                isSlotPast={isSlotPast(selectedDate, selectedSlot, slotConfig)}
                onSelectSeat={(seat) => setSelectedSeat(seat)}
                onDeleteSeat={handleDeleteSeat}
                zoneColor={zoneColor}
              />
            )}
          </div>
        </div>

        {/* ── Reservation Footer Bar ── */}
        {selectedSeat && (
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200 p-4 shadow-2xl animate-in slide-in-from-bottom-4">
            <div className="mx-auto max-w-5xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="kicker-label text-slate-400">READY TO RESERVE</span>
                <div className="flex items-center gap-2">
                  <p className="text-base font-extrabold text-slate-900">
                    Seat {selectedSeat.seatNumber}
                  </p>
                  <span className="text-slate-400">&bull;</span>
                  <span className="text-xs font-bold text-slate-600">{selectedZone.name}</span>
                  <span className="text-slate-400">&bull;</span>
                  <span className="text-xs font-black capitalize text-indigo-700">
                    {selectedSlot} Slot
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSeat(null)}
                  className="pulse-button-secondary py-2.5 px-4 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isReserving}
                  onClick={handleReserveSeat}
                  className="pulse-button-primary py-2.5 px-6 text-xs shadow-md"
                >
                  {isReserving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  <span>Confirm Reservation</span>
                </button>
              </div>
            </div>

            {reservationError && (
              <div className="mx-auto max-w-5xl mt-2 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-2 text-xs font-medium text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{reservationError}</span>
              </div>
            )}
          </div>
        )}

        {/* ── Admin Tools: Add New Seat (if admin/librarian) ── */}
        {canManage && (
          <div className="pulse-card p-5 space-y-3">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">
              Admin Zone Controls &bull; Add Seat to {selectedZone.name}
            </h3>
            <form onSubmit={handleAddSeat} className="flex gap-2 max-w-md">
              <input
                type="text"
                placeholder="Seat Number (e.g. A-11)"
                value={newSeatNumber}
                onChange={(e) => setNewSeatNumber(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none"
              />
              <button
                type="submit"
                disabled={isAddingSeat}
                className="pulse-button-primary py-2 px-4 text-xs shrink-0"
              >
                {isAddingSeat ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                <span>Add Seat</span>
              </button>
            </form>
            {addSeatError && (
              <p className="text-xs text-rose-600 font-medium">{addSeatError}</p>
            )}
          </div>
        )}

        {/* ── Success Modal ── */}
        {completedBookingData && (
          <BookingSuccessModal
            booking={completedBookingData.booking}
            qrCodeImage={completedBookingData.qrCodeImage}
            zoneName={selectedZone.name}
            onClose={() => setCompletedBookingData(null)}
          />
        )}
      </div>
    </div>
  );
}

export default BookSeatView;
