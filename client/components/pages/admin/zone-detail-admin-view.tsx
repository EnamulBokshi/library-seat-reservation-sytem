"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zoneService } from "@/services/zone-service";
import { seatService } from "@/services/seat-service";
import { bookingService } from "@/services/booking-service";
import {
  Zone,
  Seat,
  Schedule,
  SlotType,
  SlotConfig,
  DEFAULT_SLOT_CONFIG,
  BookingStatus,
  UpdateZonePayload,
  ApiError,
} from "@/lib/types";
import {
  ArrowLeft,
  MapPin,
  Armchair,
  Calendar,
  Clock,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  AlertCircle,
  RefreshCw,
  Sliders,
  ExternalLink,
  Layers,
  Wrench,
  Check,
  X,
  User,
  Shield,
  Sparkles,
} from "lucide-react";

interface ZoneDetailAdminViewProps {
  zoneId: string;
}

const PRESET_COLORS = [
  "#0f172a",
  "#4f46e5",
  "#059669",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#be185d",
];

export function ZoneDetailAdminView({ zoneId }: ZoneDetailAdminViewProps) {
  const router = useRouter();

  // Zone & Seats State
  const [zone, setZone] = useState<Zone | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [slotConfig, setSlotConfig] = useState<SlotConfig>(DEFAULT_SLOT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeatsLoading, setIsSeatsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected Session (Date & Slot)
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedSlot, setSelectedSlot] = useState<SlotType>("morning");

  // Single Seat Add State
  const [newSeatNumber, setNewSeatNumber] = useState("");
  const [isAddingSeat, setIsAddingSeat] = useState(false);
  const [addSeatError, setAddSeatError] = useState<string | null>(null);

  // Bulk Add Modal State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkPrefix, setBulkPrefix] = useState("DESK-");
  const [bulkStart, setBulkStart] = useState<number>(1);
  const [bulkCount, setBulkCount] = useState<number>(10);
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<number>(0);
  const [bulkError, setBulkError] = useState<string | null>(null);

  // Selected Seat Details / Actions Modal
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [editSeatNumberInput, setEditSeatNumberInput] = useState("");
  const [isUpdatingSeat, setIsUpdatingSeat] = useState(false);

  // Edit Zone Modal State
  const [isEditZoneOpen, setIsEditZoneOpen] = useState(false);
  const [editZoneForm, setEditZoneForm] = useState<UpdateZonePayload>({
    name: "",
    description: "",
    color: "#4f46e5",
    rules: [],
    isActive: true,
  });
  const [editRulesInput, setEditRulesInput] = useState("");
  const [isSavingZone, setIsSavingZone] = useState(false);
  const [editZoneError, setEditZoneError] = useState<string | null>(null);

  // Find matching schedule for selected date & slot
  const currentSchedule = useMemo(() => {
    return schedules.find((s) => {
      const sDate = s.date.split("T")[0];
      return sDate === selectedDate && s.slot === selectedSlot;
    });
  }, [schedules, selectedDate, selectedSlot]);

  // Load Zone Metadata & Schedules
  const fetchZoneData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [zoneRes, schedRes] = await Promise.all([
        zoneService.getById(zoneId),
        bookingService.getSchedules(),
      ]);

      setZone(zoneRes.data);
      setSchedules(schedRes.data ?? []);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setError(apiErr?.message ?? "Failed to load zone details.");
    } finally {
      setIsLoading(false);
    }
  }, [zoneId]);

  // Load Seats for current Zone & Schedule
  const fetchSeats = useCallback(async () => {
    setIsSeatsLoading(true);
    try {
      const res = await zoneService.getSeatsByZone(
        zoneId,
        true, // include inactive/maintenance seats
        currentSchedule?.id
      );
      setSeats(res.data ?? []);
    } catch (err: unknown) {
      console.error("Failed to load seats for schedule:", err);
    } finally {
      setIsSeatsLoading(false);
    }
  }, [zoneId, currentSchedule?.id]);

  useEffect(() => {
    fetchZoneData();
  }, [fetchZoneData]);

  useEffect(() => {
    if (zone) {
      fetchSeats();
    }
  }, [zone, fetchSeats]);

  // ── Single Seat Add ───────────────────────────────────────────────────────
  const handleAddSingleSeat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSeatNumber.trim()) return;

    setIsAddingSeat(true);
    setAddSeatError(null);
    try {
      await zoneService.createSeat(zoneId, {
        seatNumber: newSeatNumber.trim().toUpperCase(),
      });
      setNewSeatNumber("");
      fetchSeats();
      fetchZoneData();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setAddSeatError(apiErr?.message ?? "Failed to add seat.");
    } finally {
      setIsAddingSeat(false);
    }
  };

  // ── Bulk Generate Seats ───────────────────────────────────────────────────
  const handleBulkGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bulkCount <= 0 || bulkCount > 50) {
      setBulkError("Count must be between 1 and 50 seats per batch.");
      return;
    }

    setIsBulkGenerating(true);
    setBulkProgress(0);
    setBulkError(null);

    let createdCount = 0;
    let failedCount = 0;

    for (let i = 0; i < bulkCount; i++) {
      const num = bulkStart + i;
      const formattedNum = num < 10 ? `0${num}` : `${num}`;
      const seatNo = `${bulkPrefix}${formattedNum}`.toUpperCase();

      try {
        await zoneService.createSeat(zoneId, { seatNumber: seatNo });
        createdCount++;
      } catch (err) {
        failedCount++;
      }
      setBulkProgress(Math.round(((i + 1) / bulkCount) * 100));
    }

    setIsBulkGenerating(false);
    setIsBulkModalOpen(false);
    fetchSeats();
    fetchZoneData();

    if (failedCount > 0) {
      alert(`Created ${createdCount} seats. ${failedCount} seats were skipped (likely duplicates).`);
    }
  };

  // ── Open Seat Drawer / Details ────────────────────────────────────────────
  const handleSelectSeat = (seat: Seat) => {
    setSelectedSeat(seat);
    setEditSeatNumberInput(seat.seatNumber);
  };

  // ── Toggle Seat Maintenance / Active Status ───────────────────────────────
  const handleToggleSeatActive = async (seat: Seat) => {
    setIsUpdatingSeat(true);
    try {
      await seatService.update(seat.id, { isActive: !seat.isActive });
      setSelectedSeat((prev) => (prev ? { ...prev, isActive: !seat.isActive } : null));
      fetchSeats();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      alert(apiErr?.message ?? "Failed to update seat status.");
    } finally {
      setIsUpdatingSeat(false);
    }
  };

  // ── Rename Seat Number ────────────────────────────────────────────────────
  const handleRenameSeat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeat || !editSeatNumberInput.trim()) return;

    setIsUpdatingSeat(true);
    try {
      await seatService.update(selectedSeat.id, {
        seatNumber: editSeatNumberInput.trim().toUpperCase(),
      });
      setSelectedSeat((prev) =>
        prev ? { ...prev, seatNumber: editSeatNumberInput.trim().toUpperCase() } : null
      );
      fetchSeats();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      alert(apiErr?.message ?? "Failed to rename seat.");
    } finally {
      setIsUpdatingSeat(false);
    }
  };

  // ── Delete Seat ───────────────────────────────────────────────────────────
  const handleDeleteSeat = async (seat: Seat) => {
    if (!confirm(`Are you sure you want to delete seat ${seat.seatNumber}?`)) return;

    setIsUpdatingSeat(true);
    try {
      await seatService.delete(seat.id);
      setSelectedSeat(null);
      fetchSeats();
      fetchZoneData();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      alert(apiErr?.message ?? "Failed to delete seat.");
    } finally {
      setIsUpdatingSeat(false);
    }
  };

  // ── Cancel Booking on Seat ────────────────────────────────────────────────
  const handleCancelSeatBooking = async (bookingId: string) => {
    if (!confirm("Are you sure you want to cancel this student's reservation?")) return;

    setIsUpdatingSeat(true);
    try {
      await bookingService.cancel(bookingId);
      setSelectedSeat((prev) =>
        prev
          ? {
              ...prev,
              isOccupied: false,
              booking: undefined,
            }
          : null
      );
      fetchSeats();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      alert(apiErr?.message ?? "Failed to cancel booking.");
    } finally {
      setIsUpdatingSeat(false);
    }
  };

  // ── Edit Zone Modal Open ──────────────────────────────────────────────────
  const handleOpenEditZone = () => {
    if (!zone) return;
    setEditZoneForm({
      name: zone.name,
      description: zone.description || "",
      color: zone.color || "#4f46e5",
      rules: zone.rules || [],
      isActive: zone.isActive,
    });
    setEditRulesInput((zone.rules || []).join("\n"));
    setEditZoneError(null);
    setIsEditZoneOpen(true);
  };

  const handleSaveZoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editZoneForm.name?.trim()) {
      setEditZoneError("Zone name is required.");
      return;
    }

    setIsSavingZone(true);
    setEditZoneError(null);

    const rulesArray = editRulesInput
      .split("\n")
      .map((r) => r.trim())
      .filter((r) => r.length > 0);

    try {
      const res = await zoneService.update(zoneId, {
        ...editZoneForm,
        name: editZoneForm.name.trim(),
        description: editZoneForm.description?.trim() || undefined,
        rules: rulesArray,
      });
      setZone(res.data);
      setIsEditZoneOpen(false);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setEditZoneError(apiErr?.message ?? "Failed to update zone.");
    } finally {
      setIsSavingZone(false);
    }
  };

  // ── Delete Entire Zone ────────────────────────────────────────────────────
  const handleDeleteZone = async () => {
    if (!zone) return;
    if (
      !confirm(
        `Are you sure you want to permanently delete "${zone.name}" and all of its configured seats?`
      )
    ) {
      return;
    }

    try {
      await zoneService.delete(zoneId);
      router.push("/admin/zones");
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      alert(apiErr?.message ?? "Failed to delete zone.");
    }
  };

  // Seat counts
  const totalSeats = seats.length;
  const activeSeats = seats.filter((s) => s.isActive);
  const maintenanceSeats = seats.filter((s) => !s.isActive);
  const occupiedSeats = seats.filter((s) => s.isActive && (s.isOccupied || s.booking));
  const availableSeats = activeSeats.filter((s) => !s.isOccupied && !s.booking);
  const occupancyPercent =
    activeSeats.length > 0 ? Math.round((occupiedSeats.length / activeSeats.length) * 100) : 0;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <Loader2 className="h-9 w-9 animate-spin text-slate-900" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Loading zone management console...
        </p>
      </div>
    );
  }

  if (error || !zone) {
    return (
      <div className="pulse-card p-12 text-center space-y-4 max-w-md mx-auto my-12">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
        <h2 className="text-base font-black text-slate-900">Study Zone Not Found</h2>
        <p className="text-xs text-slate-500">{error || "This zone may have been deleted."}</p>
        <Link href="/admin/zones" className="pulse-button-primary text-xs inline-flex items-center gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Zones</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* ── Breadcrumbs & Quick Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 font-bold mb-1">
            <Link href="/admin/zones" className="hover:text-slate-900 transition-colors">
              Zones &amp; Seating
            </Link>
            <span>/</span>
            <span className="text-slate-900">{zone.name}</span>
          </nav>
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-2xs"
              style={{ backgroundColor: zone.color || "#0f172a" }}
            >
              <Armchair className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">{zone.name}</h1>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase border ${
                    zone.isActive
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : "bg-slate-100 border-slate-300 text-slate-600"
                  }`}
                >
                  {zone.isActive ? "Operating" : "Closed"}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">{zone.description || "Study Zone"}</p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/book?zoneId=${zone.id}`}
            target="_blank"
            className="pulse-button-secondary py-2 px-3 text-xs"
            title="Preview student booking view"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Student View</span>
          </Link>

          <button
            onClick={handleOpenEditZone}
            className="pulse-button-secondary py-2 px-3 text-xs"
          >
            <Edit2 className="h-3.5 w-3.5" />
            <span>Edit Zone</span>
          </button>

          <button
            onClick={handleDeleteZone}
            className="pulse-button-secondary py-2 px-3 text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
            title="Delete this zone"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── Metric Summary Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="pulse-card p-4 space-y-1">
          <span className="kicker-label">TOTAL SEATS</span>
          <p className="text-2xl font-black text-slate-900">{totalSeats}</p>
          <p className="text-[10px] text-slate-400 font-semibold">{activeSeats.length} active in hall</p>
        </div>

        <div className="pulse-card p-4 space-y-1">
          <span className="kicker-label">SESSION AVAILABLE</span>
          <p className="text-2xl font-black text-emerald-700">{availableSeats.length}</p>
          <p className="text-[10px] text-slate-400 font-semibold">Available for booking</p>
        </div>

        <div className="pulse-card p-4 space-y-1">
          <span className="kicker-label">SESSION RESERVED</span>
          <p className="text-2xl font-black text-indigo-700">{occupiedSeats.length}</p>
          <p className="text-[10px] text-slate-400 font-semibold">{occupancyPercent}% load</p>
        </div>

        <div className="pulse-card p-4 space-y-1">
          <span className="kicker-label">MAINTENANCE</span>
          <p className="text-2xl font-black text-amber-700">{maintenanceSeats.length}</p>
          <p className="text-[10px] text-slate-400 font-semibold">Temporarily disabled</p>
        </div>
      </div>

      {/* ── Session & Schedule Inspector Bar ── */}
      <div className="pulse-card p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <span className="kicker-label">SESSION INSPECTOR</span>
            <h2 className="text-sm font-black text-slate-900">
              Live Seat Allocation for Selected Slot
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Date Picker */}
            <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs font-bold text-slate-700">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
              />
            </div>

            {/* Slot Buttons */}
            <div className="flex items-center gap-1 overflow-x-auto">
              {(Object.keys(slotConfig) as SlotType[]).map((slotKey) => {
                const conf = slotConfig[slotKey];
                const isSelected = selectedSlot === slotKey;
                return (
                  <button
                    key={slotKey}
                    onClick={() => setSelectedSlot(slotKey)}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all shrink-0 ${
                      isSelected
                        ? "bg-slate-900 text-white shadow-2xs"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span>{conf.icon} </span>
                    <span>{conf.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={fetchSeats}
              disabled={isSeatsLoading}
              className="pulse-button-secondary py-1.5 px-2.5 text-xs"
              title="Refresh session data"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSeatsLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Seat Inventory Toolbar & Quick Add ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-100/70 p-3.5 rounded-2xl border border-slate-200">
        {/* Single Seat Fast Form */}
        <form onSubmit={handleAddSingleSeat} className="flex items-center gap-2">
          <input
            type="text"
            required
            placeholder="Seat number (e.g. A-15)"
            value={newSeatNumber}
            onChange={(e) => setNewSeatNumber(e.target.value)}
            className="w-48 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 uppercase placeholder:normal-case placeholder-slate-400 focus:border-slate-900 focus:outline-none shadow-2xs"
          />
          <button
            type="submit"
            disabled={isAddingSeat || !newSeatNumber.trim()}
            className="pulse-button-primary py-1.5 px-3 text-xs"
          >
            {isAddingSeat ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            <span>Add Seat</span>
          </button>
        </form>

        {/* Bulk Generator Button */}
        <button
          onClick={() => {
            setBulkPrefix(`${zone.name.charAt(0).toUpperCase()}-`);
            setBulkStart(totalSeats + 1);
            setBulkCount(10);
            setBulkError(null);
            setIsBulkModalOpen(true);
          }}
          className="pulse-button-secondary py-1.5 px-3.5 text-xs inline-flex items-center gap-1.5 shadow-2xs"
        >
          <Layers className="h-3.5 w-3.5 text-indigo-600" />
          <span>Bulk Generate Seats</span>
        </button>
      </div>

      {addSeatError && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs font-medium text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{addSeatError}</span>
        </div>
      )}

      {/* ── Seating Grid Display ── */}
      <section className="pulse-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <span className="kicker-label">INTERACTIVE SEAT MAP</span>
            <h2 className="text-base font-black text-slate-900">
              Seat Layout &amp; Occupancy Grid
            </h2>
          </div>

          {/* Map Legend */}
          <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-md bg-emerald-100 border border-emerald-300" />
              <span className="text-slate-600">Available</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-md bg-slate-900 border border-slate-900" />
              <span className="text-slate-600">Booked</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-md bg-amber-100 border border-amber-300" />
              <span className="text-slate-600">Maintenance</span>
            </span>
          </div>
        </div>

        {isSeatsLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <Loader2 className="h-7 w-7 animate-spin text-slate-900" />
            <p className="text-xs text-slate-400 font-bold">Loading seating matrix...</p>
          </div>
        ) : seats.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Armchair className="h-10 w-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-black text-slate-900">No Seats in This Zone</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto font-medium">
              Use the toolbar above to add individual seats or bulk generate a batch of seats.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {seats.map((seat) => {
              const isMaintenance = !seat.isActive;
              const isBooked = !isMaintenance && (seat.isOccupied || !!seat.booking);
              const isAvailable = !isMaintenance && !isBooked;

              let cardStyle = "bg-emerald-50/80 border-emerald-200 text-emerald-950 hover:bg-emerald-100";
              if (isMaintenance) {
                cardStyle = "bg-amber-50/80 border-amber-200 text-amber-950 hover:bg-amber-100";
              } else if (isBooked) {
                cardStyle = "bg-slate-900 border-slate-900 text-white hover:bg-slate-800";
              }

              return (
                <button
                  key={seat.id}
                  onClick={() => handleSelectSeat(seat)}
                  className={`group relative p-3 rounded-2xl border text-center transition-all duration-200 flex flex-col items-center justify-between gap-2 shadow-2xs hover:scale-103 ${cardStyle}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <Armchair
                      className={`h-4 w-4 ${
                        isBooked
                          ? "text-slate-300"
                          : isMaintenance
                          ? "text-amber-600"
                          : "text-emerald-600"
                      }`}
                    />
                    <span
                      className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-md ${
                        isBooked
                          ? "bg-white/20 text-white"
                          : isMaintenance
                          ? "bg-amber-200/80 text-amber-900"
                          : "bg-emerald-200/80 text-emerald-900"
                      }`}
                    >
                      {isBooked ? "Booked" : isMaintenance ? "Maint" : "Free"}
                    </span>
                  </div>

                  <span className="text-sm font-black tracking-tight">{seat.seatNumber}</span>

                  <span
                    className={`text-[10px] font-semibold truncate max-w-full ${
                      isBooked ? "text-slate-300" : isMaintenance ? "text-amber-700" : "text-emerald-700"
                    }`}
                  >
                    {isBooked
                      ? seat.booking?.user?.name || "Student"
                      : isMaintenance
                      ? "Disabled"
                      : "Open"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ── BULK GENERATE SEATS MODAL ── */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-4 flex items-center justify-center">
          <div className="pulse-card relative w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsBulkModalOpen(false)}
              className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-1">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900">Bulk Generate Seats</h2>
                <p className="text-xs text-slate-500">
                  Quickly add a sequence of seats to {zone.name}
                </p>
              </div>
            </div>

            {bulkError && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs font-medium text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{bulkError}</span>
              </div>
            )}

            <form onSubmit={handleBulkGenerate} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Seat Prefix</label>
                <input
                  type="text"
                  required
                  value={bulkPrefix}
                  onChange={(e) => setBulkPrefix(e.target.value.toUpperCase())}
                  placeholder="e.g. A-, DESK-, POD-"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-bold uppercase text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Start Number</label>
                  <input
                    type="number"
                    min={1}
                    value={bulkStart}
                    onChange={(e) => setBulkStart(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-bold text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={bulkCount}
                    onChange={(e) => setBulkCount(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-bold text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500 font-medium">
                Preview: {bulkPrefix}
                {bulkStart < 10 ? `0${bulkStart}` : bulkStart} &hellip; {bulkPrefix}
                {bulkStart + bulkCount - 1 < 10
                  ? `0${bulkStart + bulkCount - 1}`
                  : bulkStart + bulkCount - 1}
              </div>

              {isBulkGenerating && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-[11px] font-bold text-slate-600">
                    <span>Generating seats...</span>
                    <span>{bulkProgress}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-600 transition-all duration-200"
                      style={{ width: `${bulkProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="pulse-button-secondary text-xs py-2 px-3.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBulkGenerating}
                  className="pulse-button-primary text-xs py-2 px-5"
                >
                  {isBulkGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  <span>Generate {bulkCount} Seats</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── SEAT DETAILS & ACTION DRAWER MODAL ── */}
      {selectedSeat && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-4 flex items-center justify-center">
          <div className="pulse-card relative w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 space-y-4">
            <button
              onClick={() => setSelectedSeat(null)}
              className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-2xs">
                <Armchair className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-slate-900">{selectedSeat.seatNumber}</h2>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase border ${
                      !selectedSeat.isActive
                        ? "bg-amber-50 border-amber-200 text-amber-800"
                        : selectedSeat.booking || selectedSeat.isOccupied
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-emerald-50 border-emerald-200 text-emerald-700"
                    }`}
                  >
                    {!selectedSeat.isActive
                      ? "Maintenance"
                      : selectedSeat.booking || selectedSeat.isOccupied
                      ? "Booked"
                      : "Available"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">{zone.name}</p>
              </div>
            </div>

            {/* Session Booking Status */}
            {selectedSeat.booking ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="kicker-label">CURRENT RESERVATION</span>
                  <span className="text-[10px] font-extrabold capitalize text-indigo-700">
                    {selectedSeat.booking.status}
                  </span>
                </div>

                <div>
                  <p className="text-xs font-black text-slate-900">
                    {selectedSeat.booking.user?.name || "Student"}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {selectedSeat.booking.user?.email}
                  </p>
                  {selectedSeat.booking.user?.studentId && (
                    <p className="text-[10px] text-slate-400 font-semibold">
                      ID: {selectedSeat.booking.user.studentId}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                  <button
                    onClick={() => handleCancelSeatBooking(selectedSeat.booking!.id)}
                    disabled={isUpdatingSeat}
                    className="pulse-button-secondary py-1 px-2.5 text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Cancel Reservation</span>
                  </button>
                </div>
              </div>
            ) : !selectedSeat.isActive ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900 font-medium flex items-center gap-2">
                <Wrench className="h-4 w-4 text-amber-600 shrink-0" />
                <span>
                  This seat is currently disabled for maintenance. Students cannot reserve it.
                </span>
              </div>
            ) : (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-900 font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>
                  This seat is open and available for booking during the {selectedSlot} slot.
                </span>
              </div>
            )}

            {/* Seat Rename Form */}
            <form onSubmit={handleRenameSeat} className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700">Edit Seat Number</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  required
                  value={editSeatNumberInput}
                  onChange={(e) => setEditSeatNumberInput(e.target.value.toUpperCase())}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs font-bold text-slate-900 uppercase focus:border-slate-900 focus:bg-white focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isUpdatingSeat || editSeatNumberInput === selectedSeat.seatNumber}
                  className="pulse-button-secondary py-1.5 px-3 text-xs"
                >
                  Save
                </button>
              </div>
            </form>

            {/* Maintenance & Delete Controls */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                onClick={() => handleToggleSeatActive(selectedSeat)}
                disabled={isUpdatingSeat}
                className={`pulse-button-secondary py-1.5 px-3 text-xs ${
                  selectedSeat.isActive
                    ? "text-amber-700 border-amber-200 hover:bg-amber-50"
                    : "text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                }`}
              >
                <Wrench className="h-3.5 w-3.5" />
                <span>{selectedSeat.isActive ? "Mark Maintenance" : "Set Active"}</span>
              </button>

              <button
                onClick={() => handleDeleteSeat(selectedSeat)}
                disabled={isUpdatingSeat}
                className="pulse-button-secondary py-1.5 px-3 text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Seat</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT ZONE MODAL ── */}
      {isEditZoneOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-4 flex items-center justify-center">
          <div className="pulse-card relative w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsEditZoneOpen(false)}
              className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-lg font-black text-slate-900">Edit Study Zone Details</h2>
            <p className="text-xs text-slate-500 mt-0.5">Update metadata for {zone.name}</p>

            {editZoneError && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs font-medium text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{editZoneError}</span>
              </div>
            )}

            <form onSubmit={handleSaveZoneSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Zone Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editZoneForm.name}
                  onChange={(e) => setEditZoneForm({ ...editZoneForm, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-bold text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editZoneForm.description}
                  onChange={(e) =>
                    setEditZoneForm({ ...editZoneForm, description: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              {/* Status Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <h3 className="text-xs font-black text-slate-900">Operating Status</h3>
                  <p className="text-[11px] text-slate-400">
                    Allow or block all student bookings in this zone
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editZoneForm.isActive}
                    onChange={(e) =>
                      setEditZoneForm({ ...editZoneForm, isActive: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900" />
                </label>
              </div>

              {/* Accent Color Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Theme Accent Color
                </label>
                <div className="flex items-center gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditZoneForm({ ...editZoneForm, color: c })}
                      className={`h-7 w-7 rounded-full transition-transform ${
                        editZoneForm.color === c
                          ? "ring-2 ring-slate-900 scale-115"
                          : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <input
                    type="color"
                    value={editZoneForm.color}
                    onChange={(e) => setEditZoneForm({ ...editZoneForm, color: e.target.value })}
                    className="h-7 w-8 rounded-lg cursor-pointer border-0 bg-transparent"
                    title="Custom Color"
                  />
                </div>
              </div>

              {/* Rules / Amenities */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Rules &amp; Guidelines (One per line)
                </label>
                <textarea
                  rows={3}
                  value={editRulesInput}
                  onChange={(e) => setEditRulesInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditZoneOpen(false)}
                  className="pulse-button-secondary text-xs py-2 px-3.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingZone}
                  className="pulse-button-primary text-xs py-2 px-5"
                >
                  {isSavingZone ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ZoneDetailAdminView;
