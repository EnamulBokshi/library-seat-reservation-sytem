"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { zoneService } from "@/services/zone-service";
import { bookingService } from "@/services/booking-service";
import {
  Zone,
  LiveZoneStat,
  CreateZonePayload,
  UpdateZonePayload,
  ApiError,
} from "@/lib/types";
import {
  MapPin,
  Plus,
  Loader2,
  AlertCircle,
  RefreshCw,
  Edit2,
  Trash2,
  ArrowRight,
  Armchair,
  BookOpen,
  Users,
  CheckCircle2,
  X,
  Sparkles,
  Sliders,
  Check,
  ExternalLink,
} from "lucide-react";

// Zone Icon Picker by index
const ZONE_ICONS = [BookOpen, Users, Armchair, MapPin];
function getZoneIcon(index: number) {
  return ZONE_ICONS[index % ZONE_ICONS.length];
}

const PRESET_COLORS = [
  "#0f172a", // Slate Dark
  "#4f46e5", // Indigo
  "#059669", // Emerald
  "#d97706", // Amber
  "#dc2626", // Rose
  "#7c3aed", // Violet
  "#0891b2", // Cyan
  "#be185d", // Pink
];

export function ZonesManagementView() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [liveStats, setLiveStats] = useState<LiveZoneStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateZonePayload>({
    name: "",
    description: "",
    color: "#4f46e5",
    rules: [],
  });
  const [rulesInput, setRulesInput] = useState("");
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Modal State
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [editForm, setEditForm] = useState<UpdateZonePayload>({
    name: "",
    description: "",
    color: "#4f46e5",
    rules: [],
    isActive: true,
  });
  const [editRulesInput, setEditRulesInput] = useState("");
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const fetchZonesAndStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [zonesRes, statsRes] = await Promise.allSettled([
        zoneService.getAll(),
        bookingService.getStats(),
      ]);

      if (zonesRes.status === "fulfilled") {
        setZones(zonesRes.value.data ?? []);
      } else {
        const err = zonesRes.reason as ApiError;
        setError(err?.message ?? "Failed to load study zones.");
      }

      if (statsRes.status === "fulfilled" && statsRes.value.data?.liveZones) {
        setLiveStats(statsRes.value.data.liveZones);
      }
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setError(apiErr?.message ?? "An error occurred while loading zones.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchZonesAndStats();
  }, [fetchZonesAndStats]);

  // ── Create Zone Handler ───────────────────────────────────────────────────
  const handleOpenCreateModal = () => {
    setCreateForm({
      name: "",
      description: "",
      color: "#4f46e5",
      rules: [],
    });
    setRulesInput("");
    setCreateError(null);
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) {
      setCreateError("Zone name is required.");
      return;
    }

    setIsSubmittingCreate(true);
    setCreateError(null);

    const rulesArray = rulesInput
      .split("\n")
      .map((r) => r.trim())
      .filter((r) => r.length > 0);

    try {
      await zoneService.create({
        ...createForm,
        name: createForm.name.trim(),
        description: createForm.description?.trim() || undefined,
        rules: rulesArray,
      });

      setIsCreateModalOpen(false);
      fetchZonesAndStats();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setCreateError(apiErr?.message ?? "Failed to create study zone.");
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // ── Edit Zone Handler ─────────────────────────────────────────────────────
  const handleOpenEditModal = (zone: Zone) => {
    setEditingZone(zone);
    setEditForm({
      name: zone.name,
      description: zone.description || "",
      color: zone.color || "#4f46e5",
      rules: zone.rules || [],
      isActive: zone.isActive,
    });
    setEditRulesInput((zone.rules || []).join("\n"));
    setEditError(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingZone) return;
    if (!editForm.name?.trim()) {
      setEditError("Zone name is required.");
      return;
    }

    setIsSubmittingEdit(true);
    setEditError(null);

    const rulesArray = editRulesInput
      .split("\n")
      .map((r) => r.trim())
      .filter((r) => r.length > 0);

    try {
      await zoneService.update(editingZone.id, {
        ...editForm,
        name: editForm.name.trim(),
        description: editForm.description?.trim() || undefined,
        rules: rulesArray,
      });

      setEditingZone(null);
      fetchZonesAndStats();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setEditError(apiErr?.message ?? "Failed to update study zone.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // ── Delete Zone Handler ───────────────────────────────────────────────────
  const handleDeleteZone = async (id: string, name: string) => {
    if (
      !confirm(
        `Are you sure you want to delete "${name}"? All seats in this zone will also be deleted.`
      )
    ) {
      return;
    }

    try {
      await zoneService.delete(id);
      fetchZonesAndStats();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      alert(apiErr?.message ?? "Failed to delete zone.");
    }
  };

  // Overall Statistics calculation
  const totalZonesCount = zones.length;
  const activeZonesCount = zones.filter((z) => z.isActive).length;
  const totalSeatsCount = zones.reduce((acc, curr) => acc + (curr.seatCount ?? 0), 0);
  const totalOccupiedSeats = liveStats.reduce((acc, curr) => acc + curr.occupiedSeats, 0);
  const totalAvailableSeats = Math.max(0, totalSeatsCount - totalOccupiedSeats);
  const overallOccupancyPercent =
    totalSeatsCount > 0 ? Math.round((totalOccupiedSeats / totalSeatsCount) * 100) : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="kicker-label">ADMINISTRATION &rsaquo; STUDY HALLS & CAPACITY</p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 mt-1">
            Zones & Seating Inventory
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500 font-medium">
            Manage library study spaces, seat allocations, occupancy limits, and environment rules
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={fetchZonesAndStats}
            disabled={isLoading}
            className="pulse-button-secondary py-2.5 px-3 text-xs"
            title="Refresh Zones"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="pulse-button-primary py-2.5 px-4 text-xs shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>New Study Zone</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Metric Summary Bar ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Study Zones */}
        <div className="pulse-card p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="kicker-label">TOTAL ZONES</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <MapPin className="h-4 w-4" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-black text-slate-900">{totalZonesCount}</span>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              {activeZonesCount} active &bull; {totalZonesCount - activeZonesCount} closed
            </p>
          </div>
        </div>

        {/* Metric 2: Total Seats Configured */}
        <div className="pulse-card p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="kicker-label">TOTAL SEATING CAPACITY</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
              <Armchair className="h-4 w-4" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-black text-slate-900">{totalSeatsCount}</span>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Configured armchairs & desks
            </p>
          </div>
        </div>

        {/* Metric 3: Available Right Now */}
        <div className="pulse-card p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="kicker-label">AVAILABLE NOW</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-black text-emerald-700">{totalAvailableSeats}</span>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Ready for immediate booking
            </p>
          </div>
        </div>

        {/* Metric 4: Overall Occupancy */}
        <div className="pulse-card p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="kicker-label">OVERALL OCCUPANCY</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">
                {overallOccupancyPercent}%
              </span>
              <span className="text-xs font-bold text-slate-400">
                ({totalOccupiedSeats} in use)
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-500"
                style={{ width: `${Math.min(100, overallOccupancyPercent)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Zones List Cards ── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Loading study zones...
          </p>
        </div>
      ) : zones.length === 0 ? (
        <div className="pulse-card p-12 text-center space-y-3">
          <MapPin className="h-10 w-10 text-slate-300 mx-auto" />
          <h2 className="text-base font-black text-slate-900">No Study Zones Created Yet</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto font-medium">
            Create your first study space (e.g. Silent Zone, Group Study Room, Computer Lab) to begin
            adding seats.
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="pulse-button-primary mt-2 text-xs py-2 px-4"
          >
            <Plus className="h-4 w-4" />
            <span>Create First Zone</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {zones.map((zone, idx) => {
            const live = liveStats.find((s) => s.id === zone.id);
            const total = live?.totalSeats ?? zone.seatCount ?? 0;
            const occupied = live?.occupiedSeats ?? 0;
            const available = live?.availableSeats ?? total;
            const occupancy = total > 0 ? Math.round((occupied / total) * 100) : 0;
            const Icon = getZoneIcon(idx);

            return (
              <div
                key={zone.id}
                className="pulse-card p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5 hover:shadow-md transition-all duration-200"
              >
                {/* Left: Zone Icon, Title, Description, Rules */}
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shrink-0 shadow-2xs"
                    style={{ backgroundColor: zone.color || "#0f172a" }}
                  >
                    <Icon className="h-6 w-6" />
                  </div>

                  <div className="min-w-0 space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-black text-slate-900 tracking-tight">
                        {zone.name}
                      </h2>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase border ${
                          zone.isActive
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                            : "bg-slate-200 border-slate-300 text-slate-600"
                        }`}
                      >
                        {zone.isActive ? "Operating" : "Closed"}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed">
                      {zone.description || "Quiet library study space."}
                    </p>

                    {/* Rules & Amenities Badges */}
                    {zone.rules && zone.rules.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {zone.rules.map((rule, rIdx) => (
                          <span
                            key={rIdx}
                            className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600"
                          >
                            &bull; {rule}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Center: Capacity & Occupancy Bar */}
                <div className="w-full lg:w-64 space-y-1.5 shrink-0 bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-500">
                      <strong className="text-slate-900 font-black">{available}</strong> / {total}{" "}
                      available
                    </span>
                    <span className="font-extrabold text-slate-700">{occupancy}% load</span>
                  </div>

                  <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        occupancy >= 85
                          ? "bg-rose-500"
                          : occupancy > 50
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      }`}
                      style={{ width: `${Math.min(100, occupancy)}%` }}
                    />
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Dedicated Admin Zone Details Page Trigger */}
                  <Link
                    href={`/admin/zones/${zone.id}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-xs font-black text-white shadow-xs hover:bg-slate-800 transition-all active:scale-95"
                  >
                    <span>Manage Seats &amp; Bookings</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>

                  {/* Edit Zone Metadata */}
                  <button
                    onClick={() => handleOpenEditModal(zone)}
                    className="pulse-button-secondary py-2 px-3 text-xs"
                    title="Edit Zone Info"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Edit</span>
                  </button>

                  {/* Delete Zone */}
                  <button
                    onClick={() => handleDeleteZone(zone.id, zone.name)}
                    className="pulse-button-secondary py-2 px-2.5 text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                    title="Delete Zone"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── CREATE ZONE MODAL ── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-4 flex items-center justify-center">
          <div className="pulse-card relative w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-lg font-black text-slate-900">Create New Study Zone</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Define a new library hall or study room
            </p>

            {createError && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs font-medium text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Zone Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Silent Zone, Group Pod B"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-bold text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Quiet study area with individual desks and desk lamps."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none"
                />
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
                      onClick={() => setCreateForm({ ...createForm, color: c })}
                      className={`h-7 w-7 rounded-full transition-transform ${
                        createForm.color === c ? "ring-2 ring-slate-900 scale-115" : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <input
                    type="color"
                    value={createForm.color}
                    onChange={(e) => setCreateForm({ ...createForm, color: e.target.value })}
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
                  placeholder="No phone calls&#10;Silent mode required&#10;Laptops permitted"
                  value={rulesInput}
                  onChange={(e) => setRulesInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="pulse-button-secondary text-xs py-2 px-3.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCreate}
                  className="pulse-button-primary text-xs py-2 px-5"
                >
                  {isSubmittingCreate ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  <span>Create Zone</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT ZONE MODAL ── */}
      {editingZone && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-4 flex items-center justify-center">
          <div className="pulse-card relative w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setEditingZone(null)}
              className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-lg font-black text-slate-900">Edit Study Zone</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Update details for {editingZone.name}
            </p>

            {editError && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs font-medium text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Zone Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-bold text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              {/* Status Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <h3 className="text-xs font-black text-slate-900">Operating Status</h3>
                  <p className="text-[11px] text-slate-400">
                    Enable or disable bookings for this zone
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.isActive}
                    onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
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
                      onClick={() => setEditForm({ ...editForm, color: c })}
                      className={`h-7 w-7 rounded-full transition-transform ${
                        editForm.color === c ? "ring-2 ring-slate-900 scale-115" : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <input
                    type="color"
                    value={editForm.color}
                    onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
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
                  onClick={() => setEditingZone(null)}
                  className="pulse-button-secondary text-xs py-2 px-3.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="pulse-button-primary text-xs py-2 px-5"
                >
                  {isSubmittingEdit ? (
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

export default ZonesManagementView;
