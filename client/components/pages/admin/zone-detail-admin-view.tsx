"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Zone,
  Seat,
  Schedule,
  SlotType,
  TableType,
  TableCluster,
  UpdateZonePayload,
  ApiError,
} from "@/lib/types";
import { zoneService } from "@/services/zone-service";
import { seatService } from "@/services/seat-service";
import { bookingService } from "@/services/booking-service";
import { CircleTable } from "@/components/shared/seating/circle-table";
import { MeetingTable } from "@/components/shared/seating/meeting-table";
import { CubicleDesk } from "@/components/shared/seating/cubicle-desk";
import { TableClusterCard } from "@/components/shared/seating/table-cluster-card";
import {
  Armchair,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  Loader2,
  Calendar,
  Clock,
  Trash2,
  Wrench,
  User,
  Mail,
  Shield,
  Layers,
  ArrowLeft,
  X,
  ExternalLink,
  Edit2,
  Check,
  Sparkles,
  LayoutGrid,
  Map as MapIcon,
  Users,
} from "lucide-react";

interface ZoneDetailAdminViewProps {
  zoneId: string;
}

interface SlotConfigItem {
  label: string;
  timeRange: string;
  icon: string;
}

type SlotConfig = Record<SlotType, SlotConfigItem>;

const DEFAULT_SLOT_CONFIG: SlotConfig = {
  morning: { label: "Morning Slot", timeRange: "08:00 AM - 12:00 PM", icon: "🌅" },
  noon: { label: "Noon Slot", timeRange: "12:00 PM - 02:00 PM", icon: "☀️" },
  afternoon: { label: "Afternoon Slot", timeRange: "02:00 PM - 06:00 PM", icon: "🌇" },
  evening: { label: "Evening Slot", timeRange: "06:00 PM - 09:00 PM", icon: "🌙" },
};

const PRESET_COLORS = [
  "#4f46e5",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#06b6d4",
  "#0f172a",
];

export function ZoneDetailAdminView({ zoneId }: ZoneDetailAdminViewProps) {
  const router = useRouter();

  // Zone & Seats State
  const [zone, setZone] = useState<Zone | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [slotConfig] = useState<SlotConfig>(DEFAULT_SLOT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeatsLoading, setIsSeatsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected Session (Date & Slot)
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedSlot, setSelectedSlot] = useState<SlotType>("morning");

  // View Layout Modes: 'visual' | 'tables' | 'grid'
  const [viewMode, setViewMode] = useState<"visual" | "tables" | "grid">("visual");
  // Status Filter: 'all' | 'available' | 'occupied' | 'maintenance'
  const [statusFilter, setStatusFilter] = useState<"all" | "available" | "occupied" | "maintenance">("all");

  // Single Seat Add State
  const [newSeatNumber, setNewSeatNumber] = useState("");
  const [isAddingSeat, setIsAddingSeat] = useState(false);
  const [addSeatError, setAddSeatError] = useState<string | null>(null);

  // Table Cluster Creator Modal State
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [tableForm, setTableForm] = useState({
    tableNumber: "Table 1",
    tableType: "circle_table" as TableType,
    chairCount: 6,
    prefix: "T1",
  });
  const [isCreatingTable, setIsCreatingTable] = useState(false);
  const [tableError, setTableError] = useState<string | null>(null);

  // Bulk Tables Generator Modal State
  const [isBulkTablesModalOpen, setIsBulkTablesModalOpen] = useState(false);
  const [bulkTablesForm, setBulkTablesForm] = useState({
    tableType: "circle_table" as TableType,
    tableCount: 4,
    chairsPerTable: 6,
    tablePrefix: "Table ",
    startTableNumber: 1,
  });
  const [isBulkGeneratingTables, setIsBulkGeneratingTables] = useState(false);
  const [bulkTablesError, setBulkTablesError] = useState<string | null>(null);

  // Selected Seat Details / Actions Drawer
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [editSeatNumberInput, setEditSeatNumberInput] = useState("");
  const [isUpdatingSeat, setIsUpdatingSeat] = useState(false);

  // Edit Zone Modal State
  const [isEditZoneOpen, setIsEditZoneOpen] = useState(false);
  const [editZoneForm, setEditZoneForm] = useState<UpdateZonePayload>({
    name: "",
    description: "",
    color: "#4f46e5",
    zoneType: "silent_desk",
    allowMultiSeat: false,
    maxSeatsPerBooking: 1,
    defaultTableType: "individual_cubicle",
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

  // Group seats by Table Cluster
  const tableClusters = useMemo(() => {
    const clusterMap: Record<string, TableCluster> = {};

    seats.forEach((seat) => {
      const tableName =
        seat.tableNumber ||
        (seat.tableType === "individual_cubicle" ? "Single Desks" : "Main Hall Seats");
      const type =
        seat.tableType ||
        (zone?.zoneType === "group_study" ? "circle_table" : "individual_cubicle");

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
  }, [seats, zone?.zoneType]);

  // Filtered Seats by Status
  const filteredSeats = useMemo(() => {
    if (statusFilter === "available") {
      return seats.filter((s) => s.isActive && !s.isOccupied && !s.booking && !s.isBooked);
    }
    if (statusFilter === "occupied") {
      return seats.filter((s) => s.isActive && (s.isOccupied || s.booking || s.isBooked));
    }
    if (statusFilter === "maintenance") {
      return seats.filter((s) => !s.isActive);
    }
    return seats;
  }, [seats, statusFilter]);

  // ── Single Seat Add ───────────────────────────────────────────────────────
  const handleAddSingleSeat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSeatNumber.trim()) return;

    setIsAddingSeat(true);
    setAddSeatError(null);
    try {
      await zoneService.createSeat(zoneId, {
        seatNumber: newSeatNumber.trim().toUpperCase(),
        tableType: zone?.defaultTableType || "individual_cubicle",
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

  // ── Create Table Cluster ──────────────────────────────────────────────────
  const handleCreateTableSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableForm.tableNumber.trim()) {
      setTableError("Table number/name is required.");
      return;
    }

    setIsCreatingTable(true);
    setTableError(null);
    try {
      await zoneService.createTableCluster(zoneId, {
        tableNumber: tableForm.tableNumber.trim(),
        tableType: tableForm.tableType,
        chairCount: tableForm.chairCount,
        prefix: tableForm.prefix.trim() || undefined,
      });

      setIsTableModalOpen(false);
      fetchSeats();
      fetchZoneData();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setTableError(apiErr?.message ?? "Failed to create table cluster.");
    } finally {
      setIsCreatingTable(false);
    }
  };

  // ── Bulk Generate Tables ──────────────────────────────────────────────────
  const handleBulkGenerateTablesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bulkTablesForm.tableCount < 1 || bulkTablesForm.chairsPerTable < 1) {
      setBulkTablesError("Please provide valid count and capacity.");
      return;
    }

    setIsBulkGeneratingTables(true);
    setBulkTablesError(null);
    try {
      await zoneService.bulkCreateTables(zoneId, {
        tableType: bulkTablesForm.tableType,
        tableCount: bulkTablesForm.tableCount,
        chairsPerTable: bulkTablesForm.chairsPerTable,
        tablePrefix: bulkTablesForm.tablePrefix,
        startTableNumber: bulkTablesForm.startTableNumber,
      });

      setIsBulkTablesModalOpen(false);
      fetchSeats();
      fetchZoneData();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setBulkTablesError(apiErr?.message ?? "Failed to generate tables.");
    } finally {
      setIsBulkGeneratingTables(false);
    }
  };

  // ── Delete Entire Table ───────────────────────────────────────────────────
  const handleDeleteTable = async (tableNumber: string) => {
    if (!confirm(`Are you sure you want to delete ${tableNumber} and all of its chairs?`)) return;

    try {
      await zoneService.deleteTable(zoneId, tableNumber);
      fetchSeats();
      fetchZoneData();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      alert(apiErr?.message ?? "Failed to delete table.");
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
  const handleDeleteSeat = async (seatId: string) => {
    if (!confirm("Are you sure you want to delete this seat?")) return;

    setIsUpdatingSeat(true);
    try {
      await seatService.delete(seatId);
      if (selectedSeat?.id === seatId) setSelectedSeat(null);
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
      zoneType: zone.zoneType || "silent_desk",
      allowMultiSeat: zone.allowMultiSeat || false,
      maxSeatsPerBooking: zone.maxSeatsPerBooking || 1,
      defaultTableType: zone.defaultTableType || "individual_cubicle",
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
  const occupiedSeats = seats.filter((s) => s.isActive && (s.isOccupied || s.booking || s.isBooked));
  const availableSeats = activeSeats.filter((s) => !s.isOccupied && !s.booking && !s.isBooked);
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

                <span className="rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                  {zone.zoneType === "silent_desk"
                    ? "🤫 Silent Desks"
                    : zone.zoneType === "group_study"
                    ? "👥 Group Tables"
                    : zone.zoneType === "computer_lab"
                    ? "💻 Tech Lab"
                    : "📖 Open Reading"}
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
          <p className="text-[10px] text-slate-400 font-semibold">{tableClusters.length} table clusters</p>
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
              Live Table &amp; Seat Allocation for Selected Slot
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

      {/* ── Table & Seat Builders Toolbar ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-100/70 p-3.5 rounded-2xl border border-slate-200">
        {/* Left: Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Table Cluster Builder */}
          <button
            onClick={() => {
              setTableForm({
                tableNumber: `Table ${tableClusters.length + 1}`,
                tableType: zone.defaultTableType || "circle_table",
                chairCount: zone.zoneType === "group_study" ? 6 : 4,
                prefix: `T${tableClusters.length + 1}`,
              });
              setTableError(null);
              setIsTableModalOpen(true);
            }}
            className="pulse-button-primary py-2 px-3.5 text-xs inline-flex items-center gap-1.5 shadow-2xs"
          >
            <Plus className="h-4 w-4" />
            <span>Add Table Cluster</span>
          </button>

          {/* Bulk Tables Generator */}
          <button
            onClick={() => {
              setBulkTablesForm({
                tableType: zone.defaultTableType || "circle_table",
                tableCount: 4,
                chairsPerTable: 6,
                tablePrefix: "Table ",
                startTableNumber: tableClusters.length + 1,
              });
              setBulkTablesError(null);
              setIsBulkTablesModalOpen(true);
            }}
            className="pulse-button-secondary py-2 px-3.5 text-xs inline-flex items-center gap-1.5 shadow-2xs"
          >
            <Layers className="h-4 w-4 text-indigo-600" />
            <span>Bulk Tables Generator</span>
          </button>

          {/* Single Desk Quick Form */}
          <form onSubmit={handleAddSingleSeat} className="flex items-center gap-1.5">
            <input
              type="text"
              placeholder="Single Seat (e.g. S-10)"
              value={newSeatNumber}
              onChange={(e) => setNewSeatNumber(e.target.value)}
              className="w-36 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-900 uppercase placeholder:normal-case placeholder-slate-400 focus:border-slate-900 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isAddingSeat || !newSeatNumber.trim()}
              className="pulse-button-secondary py-1.5 px-2.5 text-xs"
            >
              {isAddingSeat ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              <span>Add</span>
            </button>
          </form>
        </div>

        {/* Right: View Modes & Status Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Modes */}
          <div className="flex items-center rounded-xl bg-white border border-slate-200 p-0.5 shadow-2xs">
            <button
              onClick={() => setViewMode("visual")}
              className={`flex items-center gap-1 px-3 py-1 text-xs font-black rounded-lg transition-all ${
                viewMode === "visual"
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <MapIcon className="h-3.5 w-3.5" />
              <span>Visual Floor</span>
            </button>
            <button
              onClick={() => setViewMode("tables")}
              className={`flex items-center gap-1 px-3 py-1 text-xs font-black rounded-lg transition-all ${
                viewMode === "tables"
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Tables List</span>
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1 px-3 py-1 text-xs font-black rounded-lg transition-all ${
                viewMode === "grid"
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Seat Grid</span>
            </button>
          </div>
        </div>
      </div>

      {addSeatError && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs font-medium text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{addSeatError}</span>
        </div>
      )}

      {/* ── Status Tabs for 500+ Seat Scale ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: "all" as const, label: "All Seats", count: totalSeats, color: "bg-slate-100 text-slate-700" },
          { id: "available" as const, label: "🟢 Available Now", count: availableSeats.length, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
          { id: "occupied" as const, label: "🔴 Reserved / In-Use", count: occupiedSeats.length, color: "bg-rose-50 text-rose-700 border-rose-200" },
          { id: "maintenance" as const, label: "🟡 Maintenance", count: maintenanceSeats.length, color: "bg-amber-50 text-amber-700 border-amber-200" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black border transition-all ${
              statusFilter === tab.id
                ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                statusFilter === tab.id ? "bg-white/20 text-white" : tab.color
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Main Content Presentation ── */}
      <section className="pulse-card p-6 space-y-6">
        {isSeatsLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <Loader2 className="h-7 w-7 animate-spin text-slate-900" />
            <p className="text-xs text-slate-400 font-bold">Loading seating matrix...</p>
          </div>
        ) : seats.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Armchair className="h-10 w-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-black text-slate-900">No Seats Configured in This Zone</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto font-medium">
              Click &ldquo;Add Table Cluster&rdquo; or &ldquo;Bulk Tables Generator&rdquo; above to set up tables and chairs.
            </p>
          </div>
        ) : viewMode === "visual" ? (
          /* 1. VISUAL FLOOR MAP VIEW */
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="kicker-label">INTERACTIVE ARCHITECTURAL FLOOR MAP</span>
                <h3 className="text-sm font-black text-slate-900">
                  {tableClusters.length} Table Layouts &bull; {totalSeats} Chairs
                </h3>
              </div>
              <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                <span className="flex items-center gap-1">🟢 Available</span>
                <span className="flex items-center gap-1">🔴 Reserved</span>
                <span className="flex items-center gap-1">🟡 Maintenance</span>
              </div>
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
                      selectedSeatIds={[]}
                      isStudent={false}
                      canManage={true}
                      onToggleSeat={(s) => handleSelectSeat(s)}
                      onDeleteTable={(tbl) => handleDeleteTable(tbl)}
                      onDeleteSeat={(sId) => handleDeleteSeat(sId)}
                      zoneColor={zone.color || undefined}
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
                      selectedSeatIds={[]}
                      isStudent={false}
                      canManage={true}
                      onToggleSeat={(s) => handleSelectSeat(s)}
                      onDeleteTable={(tbl) => handleDeleteTable(tbl)}
                      onDeleteSeat={(sId) => handleDeleteSeat(sId)}
                      zoneColor={zone.color || undefined}
                    />
                  );
                }

                // Default / Cubicle list
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
                          isSelected={false}
                          canManage={true}
                          isStudent={false}
                          onSelect={() => handleSelectSeat(seat)}
                          onDelete={(id) => handleDeleteSeat(id)}
                          zoneColor={zone.color || undefined}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : viewMode === "tables" ? (
          /* 2. TABLE CLUSTERS LIST VIEW */
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="kicker-label">GROUPED TABLE CLUSTERS</span>
              <span className="text-xs font-black text-slate-700">{tableClusters.length} Clusters</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tableClusters.map((cluster) => (
                <TableClusterCard
                  key={cluster.tableNumber}
                  cluster={cluster}
                  selectedSeatIds={[]}
                  isStudent={false}
                  onToggleSeat={(s) => handleSelectSeat(s)}
                />
              ))}
            </div>
          </div>
        ) : (
          /* 3. ALL INDIVIDUAL SEATS GRID VIEW */
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {filteredSeats.map((seat) => {
              const isMaintenance = !seat.isActive;
              const isBooked = !isMaintenance && (seat.isOccupied || !!seat.booking || seat.isBooked);

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
                      : seat.tableNumber || "Available"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ── CREATE TABLE CLUSTER MODAL ── */}
      {isTableModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-4 flex items-center justify-center">
          <div className="pulse-card relative w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsTableModalOpen(false)}
              className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-lg font-black text-slate-900">Add Table / Cluster</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Create a collaborative table with radial or rectangular seating
            </p>

            {tableError && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs font-medium text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{tableError}</span>
              </div>
            )}

            <form onSubmit={handleCreateTableSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Table Name / Identifier <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Table G-1, Pod 04"
                  value={tableForm.tableNumber}
                  onChange={(e) => setTableForm({ ...tableForm, tableNumber: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-bold text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Table Shape &amp; Seating Layout
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { type: "circle_table" as TableType, label: "Circular Table", icon: "🟢", desc: "Radial round seating" },
                    { type: "meeting_table" as TableType, label: "Meeting Desk", icon: "🟦", desc: "Rectangular conference" },
                    { type: "booth_pod" as TableType, label: "Booth Pod", icon: "🛋️", desc: "Collaborative booth" },
                    { type: "individual_cubicle" as TableType, label: "Single Cubicles", icon: "🪑", desc: "Partitioned focus desks" },
                  ].map((item) => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => setTableForm({ ...tableForm, tableType: item.type })}
                      className={`p-2.5 rounded-2xl border text-left transition-all ${
                        tableForm.tableType === item.type
                          ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                          : "bg-slate-50 hover:bg-white border-slate-200 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span>{item.icon}</span>
                        <span className="text-xs font-black">{item.label}</span>
                      </div>
                      <p className={`text-[10px] ${tableForm.tableType === item.type ? "text-slate-300" : "text-slate-400"}`}>
                        {item.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Number of Chairs
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={tableForm.chairCount}
                    onChange={(e) =>
                      setTableForm({ ...tableForm, chairCount: parseInt(e.target.value, 10) || 1 })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-bold text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Seat Number Prefix
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. T1"
                    value={tableForm.prefix}
                    onChange={(e) => setTableForm({ ...tableForm, prefix: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-bold text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none uppercase"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTableModalOpen(false)}
                  className="pulse-button-secondary text-xs py-2 px-3.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingTable}
                  className="pulse-button-primary text-xs py-2 px-5"
                >
                  {isCreatingTable ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  <span>Create Table</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── BULK TABLES GENERATOR MODAL ── */}
      {isBulkTablesModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-4 flex items-center justify-center">
          <div className="pulse-card relative w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsBulkTablesModalOpen(false)}
              className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-lg font-black text-slate-900">Bulk Tables Generator</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Generate multiple tables and chairs in one click (e.g. 5 Round Tables with 6 chairs)
            </p>

            {bulkTablesError && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs font-medium text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{bulkTablesError}</span>
              </div>
            )}

            <form onSubmit={handleBulkGenerateTablesSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Table Shape
                </label>
                <select
                  value={bulkTablesForm.tableType}
                  onChange={(e) =>
                    setBulkTablesForm({ ...bulkTablesForm, tableType: e.target.value as TableType })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-bold text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none"
                >
                  <option value="circle_table">🟢 Circular Table (Round Seating)</option>
                  <option value="meeting_table">🟦 Meeting Desk (Square/Conference)</option>
                  <option value="booth_pod">🛋️ Collaboration Booth</option>
                  <option value="workstation_bench">💻 PC Workstation Bench</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Number of Tables
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={bulkTablesForm.tableCount}
                    onChange={(e) =>
                      setBulkTablesForm({
                        ...bulkTablesForm,
                        tableCount: parseInt(e.target.value, 10) || 1,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-bold text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Chairs Per Table
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={bulkTablesForm.chairsPerTable}
                    onChange={(e) =>
                      setBulkTablesForm({
                        ...bulkTablesForm,
                        chairsPerTable: parseInt(e.target.value, 10) || 1,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-bold text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Table Prefix
                  </label>
                  <input
                    type="text"
                    value={bulkTablesForm.tablePrefix}
                    onChange={(e) =>
                      setBulkTablesForm({ ...bulkTablesForm, tablePrefix: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-bold text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Start Table Number
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={bulkTablesForm.startTableNumber}
                    onChange={(e) =>
                      setBulkTablesForm({
                        ...bulkTablesForm,
                        startTableNumber: parseInt(e.target.value, 10) || 1,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-bold text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-3 text-xs text-indigo-900 font-medium">
                ⚡ This will generate <strong>{bulkTablesForm.tableCount} tables</strong> with{" "}
                <strong>{bulkTablesForm.chairsPerTable} chairs each</strong> (Total{" "}
                <strong>{bulkTablesForm.tableCount * bulkTablesForm.chairsPerTable} seats</strong>).
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBulkTablesModalOpen(false)}
                  className="pulse-button-secondary text-xs py-2 px-3.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBulkGeneratingTables}
                  className="pulse-button-primary text-xs py-2 px-5"
                >
                  {isBulkGeneratingTables ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Layers className="h-4 w-4" />
                  )}
                  <span>Generate All</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── SEAT DRAWER / DETAILS MODAL ── */}
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
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                  !selectedSeat.isActive
                    ? "bg-amber-100 text-amber-800"
                    : selectedSeat.isOccupied || selectedSeat.booking
                    ? "bg-slate-900 text-white"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                <Armchair className="h-6 w-6" />
              </div>

              <div>
                <h2 className="text-lg font-black text-slate-900">{selectedSeat.seatNumber}</h2>
                <p className="text-xs text-slate-500 font-medium">
                  {selectedSeat.tableNumber || "Independent Desk"} &bull; {zone.name}
                </p>
              </div>
            </div>

            {/* Current Status Badge */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-500">Operating State:</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 font-extrabold uppercase text-[10px] ${
                    !selectedSeat.isActive
                      ? "bg-amber-100 text-amber-800"
                      : selectedSeat.isOccupied || selectedSeat.booking
                      ? "bg-rose-100 text-rose-800"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {!selectedSeat.isActive
                    ? "Under Maintenance"
                    : selectedSeat.isOccupied || selectedSeat.booking
                    ? "Reserved / Occupied"
                    : "Available for Booking"}
                </span>
              </div>

              {selectedSeat.booking?.user && (
                <div className="border-t border-slate-200/80 pt-2 mt-2 space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-900 font-black">
                    <User className="h-3.5 w-3.5 text-slate-500" />
                    <span>{selectedSeat.booking.user.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    <span>{selectedSeat.booking.user.email}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Actions Form */}
            <div className="space-y-2 pt-2">
              <form onSubmit={handleRenameSeat} className="flex items-center gap-2">
                <input
                  type="text"
                  value={editSeatNumberInput}
                  onChange={(e) => setEditSeatNumberInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 uppercase focus:border-slate-900 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isUpdatingSeat || !editSeatNumberInput.trim()}
                  className="pulse-button-secondary py-1.5 px-3 text-xs shrink-0"
                >
                  Rename
                </button>
              </form>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleToggleSeatActive(selectedSeat)}
                  disabled={isUpdatingSeat}
                  className={`flex-1 py-2 px-3 rounded-full text-xs font-black border transition-all ${
                    selectedSeat.isActive
                      ? "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                      : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                  }`}
                >
                  {selectedSeat.isActive ? "Mark Maintenance" : "Activate Seat"}
                </button>

                {selectedSeat.booking && (
                  <button
                    type="button"
                    onClick={() => handleCancelSeatBooking(selectedSeat.booking!.id)}
                    disabled={isUpdatingSeat}
                    className="py-2 px-3 rounded-full text-xs font-black bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                  >
                    Cancel Booking
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleDeleteSeat(selectedSeat.id)}
                  disabled={isUpdatingSeat}
                  className="p-2 rounded-full text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
                  title="Delete Seat"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
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

            <h2 className="text-lg font-black text-slate-900">Edit Zone Settings</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Update name, environment style, rules, and group booking capacity
            </p>

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
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={editZoneForm.description}
                  onChange={(e) =>
                    setEditZoneForm({ ...editZoneForm, description: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              {/* Multi-Seat & Group Booking Configuration */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-black text-slate-900">Allow Group Multi-Seat Booking</h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Enable group table reservations (up to {editZoneForm.maxSeatsPerBooking || 8} seats)
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editZoneForm.allowMultiSeat}
                      onChange={(e) =>
                        setEditZoneForm({ ...editZoneForm, allowMultiSeat: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900" />
                  </label>
                </div>

                {editZoneForm.allowMultiSeat && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Max Seats Per Group Booking
                    </label>
                    <input
                      type="number"
                      min={2}
                      max={20}
                      value={editZoneForm.maxSeatsPerBooking || 6}
                      onChange={(e) =>
                        setEditZoneForm({
                          ...editZoneForm,
                          maxSeatsPerBooking: parseInt(e.target.value, 10) || 2,
                        })
                      }
                      className="w-32 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 focus:border-slate-900 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Status Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <h3 className="text-xs font-black text-slate-900">Operating Status</h3>
                  <p className="text-[11px] text-slate-400">Enable or disable bookings for this zone</p>
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
                        editZoneForm.color === c ? "ring-2 ring-slate-900 scale-115" : "hover:scale-105"
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
                  {isSavingZone ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
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
