"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { zoneService } from "@/services/zone-service";
import { bookingService } from "@/services/booking-service";
import { Zone, LiveZoneStat, ApiError, CreateZonePayload } from "@/lib/types";
import {
  MapPin, Plus, Loader2, AlertCircle, ChevronRight,
  Trash2, X, Check, ArrowRight, Users, Armchair,
  RefreshCw, BookOpen,
} from "lucide-react";

// ─── Zone icons by index (rotating through a set) ─────────────────────────────
const ZONE_ICONS = [BookOpen, Users, Armchair, MapPin];

function getZoneIcon(index: number) {
  return ZONE_ICONS[index % ZONE_ICONS.length];
}

// ─── Occupancy helpers ────────────────────────────────────────────────────────

function getOccupancyColor(percent: number, isActive: boolean): string {
  if (!isActive) return "#94a3b8";       // slate-400
  if (percent >= 85) return "#f59e0b";  // amber-500
  if (percent >= 50) return "#6366f1";  // indigo-500
  return "#10b981";                      // emerald-500
}

function getOccupancyLabel(percent: number, isActive: boolean): { text: string; className: string } {
  if (!isActive) return { text: "Closed", className: "bg-slate-100 text-slate-500 border-slate-200" };
  if (percent >= 85) return { text: "Busy", className: "bg-amber-50 text-amber-700 border-amber-200" };
  if (percent >= 50) return { text: "Active", className: "bg-indigo-50 text-indigo-700 border-indigo-200" };
  if (percent > 0) return { text: "Moderate", className: "bg-sky-50 text-sky-700 border-sky-200" };
  return { text: "Available", className: "bg-emerald-50 text-emerald-700 border-emerald-200" };
}

// ─── Zone Row Component ───────────────────────────────────────────────────────
interface ZoneRowProps {
  zone: Zone;
  liveStat?: LiveZoneStat;
  canManage: boolean;
  onDelete: (id: string) => void;
  index: number;
}

function ZoneRow({ zone, liveStat, canManage, onDelete, index }: ZoneRowProps) {
  const totalSeats = liveStat?.totalSeats ?? zone.seatCount ?? 0;
  const occupiedSeats = liveStat?.occupiedSeats ?? 0;
  const availSeats = liveStat?.availableSeats ?? totalSeats;
  const occupancy = totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 0;
  const barColor = getOccupancyColor(occupancy, zone.isActive);
  const label = getOccupancyLabel(occupancy, zone.isActive);
  const ZoneIcon = getZoneIcon(index);
  const accentColor = zone.color ?? "#0f172a";

  return (
    <div className="group pulse-card flex flex-col sm:flex-row sm:items-center gap-4 p-4 sm:p-5 hover:shadow-md transition-all">

      {/* Icon + Info */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* Zone accent icon */}
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105"
          style={{ backgroundColor: `${accentColor}12`, border: `1.5px solid ${accentColor}30` }}
        >
          <ZoneIcon className="h-5 w-5" style={{ color: accentColor }} />
        </div>

        {/* Name + description */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <h3 className="font-bold text-slate-900 text-sm truncate">{zone.name}</h3>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold shrink-0 ${label.className}`}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: barColor }} />
              {label.text}
            </span>
          </div>
          {zone.description && (
            <p className="mt-0.5 text-xs text-slate-400 font-medium truncate">{zone.description}</p>
          )}
        </div>
      </div>

      {/* Seat capacity bar */}
      <div className="flex items-center gap-5 sm:gap-6 shrink-0">
        <div className="w-36 sm:w-44">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-500">
              {availSeats} / {totalSeats} available
            </span>
            <span className="text-[11px] font-extrabold" style={{ color: barColor }}>
              {occupancy}%
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${occupancy}%`, backgroundColor: barColor }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          {canManage && (
            <button
              onClick={() => onDelete(zone.id)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 opacity-0 transition-all group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-600"
              title="Delete zone"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <Link
            href={`/zones/${zone.id}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 active:scale-95 transition-all shadow-xs"
          >
            <span>View Seats</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Create Zone Modal ────────────────────────────────────────────────────────
interface CreateZoneModalProps {
  onClose: () => void;
  onCreate: (zone: Zone) => void;
}

function CreateZoneModal({ onClose, onCreate }: CreateZoneModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#0f172a");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) { setError("Zone name is required."); return; }

    setIsSubmitting(true);
    try {
      const payload: CreateZonePayload = {
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        isActive,
      };
      const res = await zoneService.create(payload);
      if (res.data) onCreate(res.data);
      onClose();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setError(apiErr?.message ?? "Failed to create zone.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs p-4 sm:p-6">
      <div className="flex min-h-full items-center justify-center">
        <div className="pulse-card relative w-full max-w-md p-6 shadow-2xl my-auto">
        <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-100">
          <div>
            <span className="kicker-label">ADMINISTRATION</span>
            <h2 className="text-lg font-extrabold text-slate-900">Create New Zone</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-medium">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="kicker-label mb-1.5 block">Zone Name *</label>
            <input
              type="text" required value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Quiet Study Zone A"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 font-medium"
            />
          </div>
          <div>
            <label className="kicker-label mb-1.5 block">Description</label>
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={3}
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 font-medium"
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="kicker-label mb-1.5 block">Accent Color</label>
              <div className="flex items-center gap-3">
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
                  className="h-10 w-10 cursor-pointer rounded-xl border border-slate-200 bg-transparent p-0.5"
                />
                <span className="font-mono text-xs text-slate-600 font-bold">{color}</span>
              </div>
            </div>
            <div>
              <label className="kicker-label mb-1.5 block">Active</label>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`flex h-10 w-16 items-center justify-center rounded-xl border text-xs font-bold transition-colors ${isActive
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-slate-100 text-slate-500"
                  }`}
              >
                {isActive ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="pulse-button-secondary flex-1 py-2.5">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting}
              className="pulse-button-primary flex-1 py-2.5">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {isSubmitting ? "Creating..." : "Create Zone"}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
);
}

// ─── Zones View ───────────────────────────────────────────────────────────────
export function ZonesView() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [zones, setZones] = useState<Zone[]>([]);
  const [liveStats, setLiveStats] = useState<LiveZoneStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const canManage = user?.role === "admin" || user?.role === "librarian";
  const isAdmin = user?.role === "admin";

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [zonesRes, statsRes] = await Promise.all([
        zoneService.getAll(),
        isAuthenticated ? bookingService.getStats() : Promise.resolve(null),
      ]);
      setZones(zonesRes.data ?? []);
      if (statsRes && "data" in statsRes) {
        setLiveStats((statsRes as { data: { liveZones: LiveZoneStat[] } }).data.liveZones ?? []);
      }
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setError(apiErr?.message ?? "Failed to load zones.");
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthLoading) {
      fetchData();
    }
  }, [isAuthLoading, fetchData]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this zone? This cannot be undone.")) return;
    try {
      await zoneService.delete(id);
      setZones((prev) => prev.filter((z) => z.id !== id));
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      alert(apiErr?.message ?? "Failed to delete zone.");
    }
  };

  const handleZoneCreated = (zone: Zone) => {
    setZones((prev) => [zone, ...prev]);
  };

  // Build a map of zoneId -> LiveZoneStat for O(1) lookup
  const liveMap = new Map(liveStats.map((s) => [s.id, s]));

  // Summary stats
  const totalSeats = liveStats.reduce((acc, z) => acc + z.totalSeats, 0);
  const totalAvailable = liveStats.reduce((acc, z) => acc + z.availableSeats, 0);
  const totalOccupied = liveStats.reduce((acc, z) => acc + z.occupiedSeats, 0);
  const overallPercent = totalSeats > 0 ? Math.round((totalOccupied / totalSeats) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-slate-900">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 pt-6 pb-24 md:pb-8 space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="kicker-label">LIBRARIES &rsaquo; STUDY SPACES</p>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">Study Zones</h1>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
              Browse available library zones and their real-time seat allocations
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={fetchData}
              disabled={isLoading}
              className="pulse-button-secondary py-2.5 px-3 text-xs"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            {isAdmin && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="pulse-button-primary"
              >
                <Plus className="h-4 w-4" />
                <span>New Zone</span>
              </button>
            )}
          </div>
        </div>

        {/* Summary bar */}
        {!isLoading && !error && zones.length > 0 && (
          <div className="pulse-card flex flex-wrap items-center gap-x-8 gap-y-3 px-6 py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                <MapPin className="h-4 w-4 text-slate-600" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Zones</p>
                <p className="text-lg font-extrabold text-slate-900 leading-tight">{zones.length}</p>
              </div>
            </div>
            <div className="h-8 w-px bg-slate-200 hidden sm:block" />
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Seats</p>
              <p className="text-lg font-extrabold text-slate-900 leading-tight">{totalSeats}</p>
            </div>
            <div className="h-8 w-px bg-slate-200 hidden sm:block" />
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Available Now</p>
              <p className="text-lg font-extrabold text-emerald-600 leading-tight">{totalAvailable}</p>
            </div>
            <div className="h-8 w-px bg-slate-200 hidden sm:block" />
            <div className="flex items-center gap-3">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Overall Occupancy</p>
                <p className="text-lg font-extrabold text-slate-900 leading-tight">{overallPercent}%</p>
              </div>
              <div className="w-20 h-2 rounded-full bg-slate-100 overflow-hidden hidden sm:block">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${overallPercent}%`,
                    backgroundColor: getOccupancyColor(overallPercent, true),
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Table header */}
        {!isLoading && !error && zones.length > 0 && (
          <div className="hidden sm:flex items-center px-5 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <span className="flex-1">Zone</span>
            <span className="w-44 text-center mr-[120px]">Seat Occupancy</span>
          </div>
        )}

        {/* Zone List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-24 text-center">
            <AlertCircle className="h-10 w-10 text-rose-500" />
            <p className="text-slate-500 text-sm">{error}</p>
            <button onClick={fetchData} className="pulse-button-secondary">
              Retry
            </button>
          </div>
        ) : zones.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-24 text-center pulse-card">
            <MapPin className="h-10 w-10 text-slate-400" />
            <p className="text-slate-500 text-sm">No study zones found.</p>
            {isAdmin && (
              <button onClick={() => setShowCreateModal(true)} className="pulse-button-primary">
                Create first zone
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {zones.map((zone, i) => (
              <ZoneRow
                key={zone.id}
                zone={zone}
                liveStat={liveMap.get(zone.id)}
                canManage={canManage}
                onDelete={handleDelete}
                index={i}
              />
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateZoneModal onClose={() => setShowCreateModal(false)} onCreate={handleZoneCreated} />
      )}
    </div>
  );
}

export default ZonesView;
