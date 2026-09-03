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
  TableType,
  TableCluster,
  DEFAULT_SLOT_CONFIG,
} from "@/lib/types";
import { CircleTable } from "@/components/shared/seating/circle-table";
import { MeetingTable } from "@/components/shared/seating/meeting-table";
import { CubicleDesk } from "@/components/shared/seating/cubicle-desk";
import { TableClusterCard } from "@/components/shared/seating/table-cluster-card";
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
  Zap,
  Check,
  LayoutGrid,
  Map as MapIcon,
  Sparkles,
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
    const filename = `library-pass-${booking.seat?.seatNumber ?? "seats"}.png`;
    downloadQrImage(qrCodeImage, filename);
  };

  const formattedDate = booking.schedule
    ? new Date(booking.schedule.date).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : "—";

  const allSeatNumbers = booking.bookingSeats && booking.bookingSeats.length > 0
    ? booking.bookingSeats.map((bs) => bs.seat.seatNumber).join(", ")
    : booking.seat?.seatNumber ?? "Seat";

  const seatCount = booking.bookingSeats?.length || (booking.seatId ? 1 : 1);

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

        <h3 className="text-xl font-black text-slate-900">
          {seatCount > 1 ? "Group Reservation Confirmed!" : "Seat Reserved!"}
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Your entry QR pass for {seatCount > 1 ? `${seatCount} seats` : "your seat"} is ready.
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
            <span className="text-slate-400">{seatCount > 1 ? "Seats" : "Seat"}</span>
            <span className="font-extrabold text-slate-900">{allSeatNumbers}</span>
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
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [partySize, setPartySize] = useState<number>(1);

  // Status Filter Tabs: 'available' | 'occupied' | 'maintenance' | 'visual'
  const [bookingTab, setBookingTab] = useState<"available" | "occupied" | "maintenance" | "visual">("available");

  // Loading & Action states
  const [isLoadingZones, setIsLoadingZones] = useState(true);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(true);
  const [isLoadingSeats, setIsLoadingSeats] = useState(false);
  const [isSuggestingFCFS, setIsSuggestingFCFS] = useState(false);
  const [fcfsMessage, setFcfsMessage] = useState<string | null>(null);
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

      if (validSchedules.length > 0) {
        // Select the first schedule date and slot that has not yet ended
        let chosenDateStr = new Date(validSchedules[0].date).toISOString().split("T")[0];
        let chosenSlot: SlotType = getFirstAvailableSlot(chosenDateStr, validSchedules);

        for (const s of validSchedules) {
          const dStr = new Date(s.date).toISOString().split("T")[0];
          if (!isSlotPast(dStr, s.slot)) {
            chosenDateStr = dStr;
            chosenSlot = s.slot;
            break;
          }
        }

        setSelectedDate(chosenDateStr);
        setSelectedSlot(chosenSlot);
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

  // A zone only permits multi-seat reservations if explicitly allowed, NOT a silent study zone, and capacity > 1
  const isMultiSeatAllowed = Boolean(
    selectedZone?.allowMultiSeat &&
    selectedZone?.zoneType !== "silent_desk" &&
    (selectedZone?.maxSeatsPerBooking || 1) > 1
  );

  const maxAllowedSeats = isMultiSeatAllowed
    ? selectedZone?.maxSeatsPerBooking || 8
    : 1;

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

  // Clear selected seats when date, slot, or zone changes
  useEffect(() => {
    setSelectedSeatIds([]);
    setReservationError(null);
    setFcfsMessage(null);
    if (!isMultiSeatAllowed) {
      setPartySize(1);
    }
  }, [selectedDate, selectedSlot, selectedZoneId, isMultiSeatAllowed]);

  // Group seats by Table Cluster
  const tableClusters = useMemo(() => {
    const clusterMap: Record<string, TableCluster> = {};

    seats.forEach((seat) => {
      const tableName =
        seat.tableNumber ||
        (seat.tableType === "individual_cubicle" ? "Single Desks" : "Main Hall Seats");
      const type =
        seat.tableType ||
        (selectedZone?.zoneType === "group_study" ? "circle_table" : "individual_cubicle");

      if (!clusterMap[tableName]) {
        clusterMap[tableName] = {
          tableNumber: tableName,
          tableType: type,
          seats: [],
          totalSeats: 0,
          availableSeats: 0,
        };
      }

      clusterMap[tableName].seats.push(seat);
      clusterMap[tableName].totalSeats += 1;
      if (seat.isActive && !seat.isOccupied && !seat.isBooked && !seat.booking) {
        clusterMap[tableName].availableSeats += 1;
      }
    });

    return Object.values(clusterMap);
  }, [seats, selectedZone?.zoneType]);

  // Categorized Seats for 500+ Seat Scalability
  const availableSeats = useMemo(
    () => seats.filter((s) => s.isActive && !s.isBooked && !s.isOccupied),
    [seats]
  );
  const occupiedSeats = useMemo(
    () => seats.filter((s) => s.isActive && (s.isBooked || s.isOccupied)),
    [seats]
  );
  const maintenanceSeats = useMemo(() => seats.filter((s) => !s.isActive), [seats]);

  // Available Table Clusters (containing ONLY available seats)
  const availableClusters = useMemo(
    () =>
      tableClusters
        .map((c) => ({
          ...c,
          seats: c.seats.filter((s) => s.isActive && !s.isBooked && !s.isOccupied),
        }))
        .filter((c) => c.seats.length > 0),
    [tableClusters]
  );

  // ── Seat Selection Toggle ─────────────────────────────────────────────────
  const handleToggleSeat = (seat: Seat) => {
    const isCurrentlySelected = selectedSeatIds.includes(seat.id);

    if (isCurrentlySelected) {
      setSelectedSeatIds((prev) => prev.filter((id) => id !== seat.id));
      return;
    }

    // If single seat zone (e.g. silent zone, or multi-seat not allowed), replace selection
    if (maxAllowedSeats === 1 || !isMultiSeatAllowed) {
      setSelectedSeatIds([seat.id]);
      setReservationError(null);
      return;
    }

    // Check multi-seat limit
    if (selectedSeatIds.length >= maxAllowedSeats) {
      setReservationError(
        `You can select a maximum of ${maxAllowedSeats} seats for this group reservation.`
      );
      return;
    }

    setReservationError(null);
    setSelectedSeatIds((prev) => [...prev, seat.id]);
  };

  const handleSelectTable = (seatsToSelect: Seat[]) => {
    if (!isMultiSeatAllowed) return;
    const seatIds = seatsToSelect.map((s) => s.id);
    const areAllIn = seatIds.every((id) => selectedSeatIds.includes(id));

    if (areAllIn) {
      // Deselect all
      setSelectedSeatIds((prev) => prev.filter((id) => !seatIds.includes(id)));
    } else {
      // Select up to limit
      const combined = Array.from(new Set([...selectedSeatIds, ...seatIds])).slice(
        0,
        maxAllowedSeats
      );
      setSelectedSeatIds(combined);
    }
  };

  // ── Instant FCFS Quick Assign ─────────────────────────────────────────────
  const handleInstantFCFS = async () => {
    if (!selectedZoneId || !activeSchedule) return;
    setIsSuggestingFCFS(true);
    setReservationError(null);
    setFcfsMessage(null);

    const targetPartySize = isMultiSeatAllowed ? partySize : 1;

    try {
      const res = await bookingService.getFCFSSuggestion(
        selectedZoneId,
        activeSchedule.id,
        targetPartySize
      );

      if (res.data?.suggestedSeats && res.data.suggestedSeats.length > 0) {
        const suggestedIds = res.data.suggestedSeats.map((s) => s.id);
        setSelectedSeatIds(suggestedIds);
        const seatNames = res.data.suggestedSeats.map((s) => s.seatNumber).join(", ");

        // Directly reserve seats in 1-click
        setIsReserving(true);
        try {
          const bookRes = await bookingService.create({
            seatIds: suggestedIds,
            seatId: suggestedIds[0],
            scheduleId: activeSchedule.id,
            guestCount: suggestedIds.length,
          });

          if (bookRes.data?.booking && bookRes.data?.qrCodeImage) {
            setCompletedBookingData({
              booking: bookRes.data.booking,
              qrCodeImage: bookRes.data.qrCodeImage,
            });
            setSelectedSeatIds([]);
            fetchSeats();
          }
        } catch (reserveErr: unknown) {
          const apiErr = reserveErr as ApiError;
          setReservationError(apiErr?.message ?? "Auto-assigned seats, but failed to confirm booking.");
          setFcfsMessage(
            `⚡ First-Come-First-Serve algorithm assigned ${suggestedIds.length} optimal seat(s) at ${
              res.data.tableNumber || "Main Area"
            }: ${seatNames}. Please review and click Confirm Reservation below.`
          );
        } finally {
          setIsReserving(false);
        }
      } else {
        setReservationError("No available seats found matching your party size.");
      }
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setReservationError(apiErr?.message ?? "Unable to auto-assign seats.");
    } finally {
      setIsSuggestingFCFS(false);
    }
  };

  // ── Reserve Seats Action ──────────────────────────────────────────────────
  const handleReserveSeats = async () => {
    if (selectedSeatIds.length === 0 || !activeSchedule) return;

    if (selectedSeatIds.length > 1 && !isMultiSeatAllowed) {
      setReservationError(
        selectedZone?.zoneType === "silent_desk"
          ? "Silent Study Zones only permit individual single-desk bookings to maintain strict focus."
          : `Multi-seat group reservations are not enabled for "${selectedZone?.name}".`
      );
      return;
    }

    setIsReserving(true);
    setReservationError(null);

    try {
      const res = await bookingService.create({
        seatIds: selectedSeatIds,
        seatId: selectedSeatIds[0],
        scheduleId: activeSchedule.id,
        guestCount: selectedSeatIds.length,
      });

      if (res.data?.booking && res.data?.qrCodeImage) {
        setCompletedBookingData({
          booking: res.data.booking,
          qrCodeImage: res.data.qrCodeImage,
        });
      }
      setSelectedSeatIds([]);
      fetchSeats();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setReservationError(apiErr?.message ?? "Failed to reserve seats.");
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
      const payload: CreateSeatPayload = {
        seatNumber: newSeatNumber.trim().toUpperCase(),
        tableType: selectedZone?.defaultTableType || "individual_cubicle",
      };
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
      setSelectedSeatIds((prev) => prev.filter((sid) => sid !== id));
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      alert(apiErr?.message ?? "Failed to remove seat.");
    }
  };

  const totalSeatsCount = seats.length;
  const isSlotEnded = isSlotPast(selectedDate, selectedSlot, slotConfig);
  const zoneColor = selectedZone?.color ?? "#0f172a";
  const zoneImage = selectedZone
    ? ZONE_IMAGES[selectedZone.name] || DEFAULT_ZONE_IMAGE
    : DEFAULT_ZONE_IMAGE;

  // Selected seat objects
  const selectedSeatObjects = useMemo(
    () => seats.filter((s) => selectedSeatIds.includes(s.id)),
    [seats, selectedSeatIds]
  );

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
            <p className="kicker-label">SEAT &amp; TABLE RESERVATION</p>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 mt-1">
              Book a Study Seat / Table
            </h1>
          </div>

          {/* Zone Select Menu */}
          <div className="flex items-center gap-3">
            <div className="relative min-w-[240px]">
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
                    {z.name} {z.zoneType === "group_study" ? "(Group)" : "(Silent)"}{" "}
                    {z.isActive ? "" : "(Closed)"}
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

        {/* ── Zone Brief ── */}
        <div className="pt-2 pb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-4 aspect-16/10 overflow-hidden shadow-xs">
              <img
                src={zoneImage}
                alt={selectedZone.name}
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-102"
              />
            </div>

            <div className="md:col-span-8 space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: selectedZone.color || "#0f172a" }}
                />
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
                  Study Hall &bull; {selectedZone.isActive ? "Open & Operating" : "Temporarily Closed"}
                </span>

                <span className="rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-slate-200 text-slate-700">
                  {selectedZone.zoneType === "silent_desk"
                    ? "🤫 Isolated Desks"
                    : selectedZone.zoneType === "group_study"
                    ? "👥 Group Study Tables"
                    : selectedZone.zoneType === "computer_lab"
                    ? "💻 Tech Workstations"
                    : "📖 Open Reading"}
                </span>

                {selectedZone.allowMultiSeat && (
                  <span className="rounded-full px-2.5 py-0.5 text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                    ⚡ Multi-Seat Allowed (Up to {maxAllowedSeats} Seats)
                  </span>
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {selectedZone.name}
              </h2>

              <p className="text-sm text-slate-600 leading-relaxed font-medium">
                {selectedZone.description ||
                  "A dedicated study area configured for optimal student focus and productivity."}
              </p>

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
                Choose Date &amp; Time Slot
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

        {/* ── ⚡ FCFS (FIRST-COME-FIRST-SERVE) FAST BOOKING PANEL ── */}
        <div className="pulse-card p-5 bg-gradient-to-br from-indigo-50/90 via-white to-slate-50 border-indigo-100 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-indigo-600 text-white text-xs">
                  ⚡
                </span>
                <h3 className="text-sm font-black text-slate-900 tracking-tight">
                  First-Come-First-Serve Fast Allocation
                </h3>
              </div>
              <p className="text-xs text-slate-600 font-medium">
                Skip searching 500+ seats: get optimal adjacent seating for your party size instantly.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {isMultiSeatAllowed && (
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 shadow-2xs">
                  <Users className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Party Size:</span>
                  <select
                    value={partySize}
                    onChange={(e) => setPartySize(parseInt(e.target.value, 10) || 1)}
                    className="bg-transparent font-black text-slate-900 focus:outline-none cursor-pointer"
                  >
                    {Array.from({ length: maxAllowedSeats }, (_, i) => i + 1).map((num) => (
                      <option key={num} value={num}>
                        {num} {num === 1 ? "Student" : "Students"}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="button"
                onClick={handleInstantFCFS}
                disabled={isSuggestingFCFS || isReserving || availableSeats.length === 0 || isSlotEnded}
                className="pulse-button-primary py-2 px-4 text-xs inline-flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title={
                  isSlotEnded
                    ? "This time slot has already ended."
                    : availableSeats.length === 0
                    ? "No available seats in this zone."
                    : "Instantly auto-assign and reserve the optimal seat(s)"
                }
              >
                {isSuggestingFCFS || isReserving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Zap className="h-3.5 w-3.5" />
                )}
                <span>{isReserving ? "Reserving Pass..." : "1-Click FCFS Auto-Assign"}</span>
              </button>
            </div>
          </div>

          {isSlotEnded && (
            <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 p-2.5 text-xs font-bold text-amber-800">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>This time slot has already ended for today. Please select an upcoming slot or a future date above.</span>
            </div>
          )}

          {fcfsMessage && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-xs font-bold text-emerald-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{fcfsMessage}</span>
            </div>
          )}
        </div>

        {/* ── STEP 2: Status-Based Grouping Tabs for 500+ Seats Scale ── */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-2">
            <div>
              <span className="kicker-label">STEP 2</span>
              <h2 className="text-base font-extrabold text-slate-900">
                Seating Layout &amp; Available Tables
              </h2>
            </div>

            {/* Status-Based Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setBookingTab("available")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black border transition-all ${
                  bookingTab === "available"
                    ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span>🟢 Available FCFS</span>
                <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black px-1.5">
                  {availableSeats.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setBookingTab("visual")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black border transition-all ${
                  bookingTab === "visual"
                    ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <MapIcon className="h-3 w-3" />
                <span>Visual Floor Map</span>
              </button>

              <button
                type="button"
                onClick={() => setBookingTab("occupied")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black border transition-all ${
                  bookingTab === "occupied"
                    ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span>🔴 Reserved</span>
                <span className="rounded-full bg-rose-100 text-rose-800 text-[10px] font-black px-1.5">
                  {occupiedSeats.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setBookingTab("maintenance")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black border transition-all ${
                  bookingTab === "maintenance"
                    ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span>🟡 Disabled</span>
                <span className="rounded-full bg-amber-100 text-amber-800 text-[10px] font-black px-1.5">
                  {maintenanceSeats.length}
                </span>
              </button>
            </div>
          </div>

          {/* Tab Content Presentation */}
          {isLoadingSeats ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 pulse-card">
              <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
              <p className="text-xs text-slate-500 font-bold">
                Loading seating matrix for {selectedZone.name}...
              </p>
            </div>
          ) : seats.length === 0 ? (
            <div className="pulse-card p-16 text-center space-y-2">
              <Armchair className="h-10 w-10 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-500">
                No seats configured in this zone yet.
              </p>
            </div>
          ) : bookingTab === "available" ? (
            /* 1. AVAILABLE SEATS (GROUPED BY TABLE CLUSTER) */
            <div className="space-y-4">
              {availableClusters.length === 0 ? (
                <div className="pulse-card p-12 text-center space-y-2">
                  <Armchair className="h-10 w-10 text-slate-300 mx-auto" />
                  <h3 className="text-sm font-black text-slate-900">All Seats Currently Reserved</h3>
                  <p className="text-xs text-slate-500">
                    Try selecting a different time slot or another study hall.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableClusters.map((cluster) => (
                    <TableClusterCard
                      key={cluster.tableNumber}
                      cluster={cluster}
                      selectedSeatIds={selectedSeatIds}
                      isStudent={isStudent}
                      onlyAvailable={true}
                      onToggleSeat={handleToggleSeat}
                      onSelectEntireTable={
                        isMultiSeatAllowed ? handleSelectTable : undefined
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          ) : bookingTab === "visual" ? (
            /* 2. INTERACTIVE VISUAL FLOOR MAP */
            <div className="pulse-card p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="kicker-label">ARCHITECTURAL SEATING PLAN</span>
                <span className="text-xs font-bold text-slate-500">
                  {tableClusters.length} Table Layouts &bull; Click seats or tables to select
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {tableClusters.map((cluster) => {
                  if (cluster.tableType === "circle_table") {
                    return (
                      <CircleTable
                        key={cluster.tableNumber}
                        tableNumber={cluster.tableNumber}
                        tableType={cluster.tableType}
                        seats={cluster.seats}
                        selectedSeatIds={selectedSeatIds}
                        isStudent={isStudent}
                        isSlotPast={isSlotEnded}
                        onToggleSeat={handleToggleSeat}
                        onSelectTable={
                          isMultiSeatAllowed ? handleSelectTable : undefined
                        }
                        zoneColor={zoneColor}
                      />
                    );
                  }

                  if (cluster.tableType === "meeting_table") {
                    return (
                      <MeetingTable
                        key={cluster.tableNumber}
                        tableNumber={cluster.tableNumber}
                        tableType={cluster.tableType}
                        seats={cluster.seats}
                        selectedSeatIds={selectedSeatIds}
                        isStudent={isStudent}
                        isSlotPast={isSlotEnded}
                        onToggleSeat={handleToggleSeat}
                        onSelectTable={
                          isMultiSeatAllowed ? handleSelectTable : undefined
                        }
                        zoneColor={zoneColor}
                      />
                    );
                  }

                  // Default Cubicle list
                  return (
                    <div
                      key={cluster.tableNumber}
                      className="p-4 rounded-3xl bg-slate-50/70 border border-slate-200/80 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">🪑</span>
                          <h4 className="text-xs font-black text-slate-900">{cluster.tableNumber}</h4>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500">
                          {cluster.availableSeats}/{cluster.totalSeats} Open
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {cluster.seats.map((seat) => (
                          <CubicleDesk
                            key={seat.id}
                            seat={seat}
                            isSelected={selectedSeatIds.includes(seat.id)}
                            isStudent={isStudent}
                            isSlotPast={isSlotEnded}
                            onSelect={handleToggleSeat}
                            zoneColor={zoneColor}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : bookingTab === "occupied" ? (
            /* 3. OCCUPIED SEATS */
            <div className="pulse-card p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="kicker-label">RESERVED SEATS</span>
                <span className="text-xs font-bold text-slate-500">
                  {occupiedSeats.length} seats reserved for this session
                </span>
              </div>

              {occupiedSeats.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  No seats reserved in this session yet.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                  {occupiedSeats.map((seat) => (
                    <div
                      key={seat.id}
                      className="p-3 rounded-2xl bg-rose-50/80 border border-rose-200 text-center space-y-1"
                    >
                      <span className="text-xs font-black text-rose-950 block">
                        {seat.seatNumber}
                      </span>
                      <span className="text-[9px] font-bold text-rose-700 block uppercase tracking-wider">
                        {seat.tableNumber || "Reserved"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* 4. MAINTENANCE SEATS */
            <div className="pulse-card p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="kicker-label">MAINTENANCE &amp; OFFLINE SEATS</span>
                <span className="text-xs font-bold text-slate-500">
                  {maintenanceSeats.length} disabled seats
                </span>
              </div>

              {maintenanceSeats.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  All seats are in full working order.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                  {maintenanceSeats.map((seat) => (
                    <div
                      key={seat.id}
                      className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 text-center space-y-1"
                    >
                      <span className="text-xs font-black text-amber-950 block">
                        {seat.seatNumber}
                      </span>
                      <span className="text-[9px] font-bold text-amber-700 block uppercase tracking-wider">
                        Offline
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── MULTI-SEAT RESERVATION FOOTER BAR ── */}
        {selectedSeatIds.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200 p-4 shadow-2xl animate-in slide-in-from-bottom-4">
            <div className="mx-auto max-w-5xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="kicker-label text-slate-400">READY TO RESERVE</span>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-extrabold text-slate-900">
                    {selectedSeatIds.length === 1
                      ? `Seat ${selectedSeatObjects[0]?.seatNumber || ""}`
                      : `${selectedSeatIds.length} Group Seats (${selectedSeatObjects.map((s) => s.seatNumber).join(", ")})`}
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
                  onClick={() => setSelectedSeatIds([])}
                  className="pulse-button-secondary py-2.5 px-4 text-xs"
                >
                  Clear Selection
                </button>
                <button
                  type="button"
                  disabled={isReserving}
                  onClick={handleReserveSeats}
                  className="pulse-button-primary py-2.5 px-6 text-xs shadow-md"
                >
                  {isReserving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  <span>
                    Confirm Reservation ({selectedSeatIds.length}{" "}
                    {selectedSeatIds.length === 1 ? "Seat" : "Seats"})
                  </span>
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
