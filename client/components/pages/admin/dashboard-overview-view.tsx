"use client";

import React, { useState, useEffect, useCallback } from "react";
import { bookingService } from "@/services/booking-service";
import { settingService } from "@/services/setting-service";
import {
  DashboardStats,
  Booking,
  SlotType,
  SlotConfig,
  DEFAULT_SLOT_CONFIG,
  ApiError,
} from "@/lib/types";
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  Armchair,
  MapPin,
  Clock,
  Calendar,
  ScanLine,
  ArrowRight,
  RefreshCw,
  Loader2,
  Sliders,
  Sparkles,
  Layers,
  ChevronRight,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

export function DashboardOverviewView() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [slotConfig, setSlotConfig] = useState<SlotConfig>(DEFAULT_SLOT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [statsRes, bookingsRes, configRes] = await Promise.allSettled([
        bookingService.getStats(),
        bookingService.getAll(),
        settingService.getPublicConfig(),
      ]);

      if (statsRes.status === "fulfilled") {
        setStats(statsRes.value.data);
      } else {
        const err = statsRes.reason as ApiError;
        setError(err?.message ?? "Failed to load dashboard metrics.");
      }

      if (bookingsRes.status === "fulfilled") {
        const list = bookingsRes.value.data ?? [];
        setRecentBookings(list.slice(0, 6));
      }

      if (configRes.status === "fulfilled" && configRes.value.data?.slotConfig) {
        setSlotConfig(configRes.value.data.slotConfig);
      }
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setError(apiErr?.message ?? "An error occurred while loading the dashboard.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const totalSeats = stats?.totalActiveSeats ?? 0;
  const availableSeats = stats?.availableSeats ?? 0;
  const occupiedSeats = Math.max(0, totalSeats - availableSeats);
  const totalOccupancyPercent = totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* ── Welcome Hero Banner ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="kicker-label">ADMINISTRATION &rsaquo; EXECUTIVE DASHBOARD</p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 mt-1">
            System Overview
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500 font-medium">
            Live telemetry, real-time library occupancy, and active seat reservations
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href="/admin/checkin"
            className="pulse-button-primary py-2 px-3.5 text-xs"
          >
            <ScanLine className="h-4 w-4" />
            <span>Open QR Scanner</span>
          </Link>

          <button
            onClick={fetchDashboardData}
            disabled={isLoading}
            className="pulse-button-secondary py-2 px-3 text-xs"
            title="Refresh Metrics"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-700">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Loading real-time telemetry...
          </p>
        </div>
      ) : (
        <>
          {/* ── KPI Metric Cards Grid ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Expected Today */}
            <div className="pulse-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  Expected Today
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <Users className="h-4.5 w-4.5" />
                </div>
              </div>
              <div>
                <p className="text-3xl font-black text-slate-900">
                  {stats?.expectedToday ?? 0}
                </p>
                <p className="text-[11px] text-slate-500 font-medium mt-1">
                  Active & confirmed bookings for today
                </p>
              </div>
            </div>

            {/* Card 2: Live Checked In */}
            <div className="pulse-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  Live Checked In
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                  <CheckCircle2 className="h-4.5 w-4.5" />
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-black text-emerald-700">
                    {stats?.checkedIn ?? 0}
                  </p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    In Session
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-1">
                  Students currently in study halls
                </p>
              </div>
            </div>

            {/* Card 3: Seat Availability */}
            <div className="pulse-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  Available Seats
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100">
                  <Armchair className="h-4.5 w-4.5" />
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-black text-slate-900">
                    {stats?.availableSeats ?? 0}
                  </p>
                  <span className="text-xs font-bold text-slate-400">
                    / {totalSeats} total
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, totalOccupancyPercent)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Card 4: No-Shows / Auto-Released */}
            <div className="pulse-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  No-Shows (Auto-Released)
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700 border border-amber-100">
                  <AlertTriangle className="h-4.5 w-4.5" />
                </div>
              </div>
              <div>
                <p className="text-3xl font-black text-amber-700">
                  {stats?.noShows ?? 0}
                </p>
                <p className="text-[11px] text-slate-500 font-medium mt-1">
                  Missed check-in grace period window
                </p>
              </div>
            </div>
          </div>

          {/* ── Operating Sessions & Schedules Banner ── */}
          <div className="pulse-card p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <span className="kicker-label">OPERATING SESSIONS</span>
                <h2 className="text-base font-extrabold text-slate-900">
                  Daily Time Slot Windows
                </h2>
              </div>
              <Link
                href="/admin/schedules"
                className="inline-flex items-center gap-1 text-xs font-extrabold text-slate-900 hover:text-indigo-600 transition-colors"
              >
                <span>Manage Daily Calendar</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {(["morning", "noon", "afternoon", "evening"] as SlotType[]).map((slotKey) => {
                const detail = slotConfig[slotKey] ?? DEFAULT_SLOT_CONFIG[slotKey];
                return (
                  <div
                    key={slotKey}
                    className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-2xl">{detail.icon ?? "⏱️"}</span>
                      <div className="min-w-0">
                        <h3 className="text-xs font-black capitalize text-slate-900 truncate">
                          {detail.label}
                        </h3>
                        <p className="text-[11px] font-semibold text-slate-500 truncate">
                          {detail.startTime} &ndash; {detail.endTime}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase border ${
                        detail.enabled
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                          : "bg-slate-200 border-slate-300 text-slate-600"
                      }`}
                    >
                      {detail.enabled ? "Active" : "Off"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Two Column Block: Live Zone Capacities & Recent Bookings ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Zone Capacities (7 cols) */}
            <div className="lg:col-span-7 pulse-card p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="kicker-label">CAPACITY PLANNING</span>
                  <h2 className="text-base font-extrabold text-slate-900">
                    Live Zone Utilization
                  </h2>
                </div>
                <Link
                  href="/admin/zones"
                  className="text-xs font-extrabold text-slate-900 hover:text-indigo-600 transition-colors inline-flex items-center gap-1"
                >
                  <span>All Zones</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {stats?.liveZones && stats.liveZones.length > 0 ? (
                <div className="space-y-4">
                  {stats.liveZones.map((z) => {
                    const percent = z.occupancyPercent;
                    return (
                      <div
                        key={z.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-slate-400" />
                            <h3 className="text-xs font-black text-slate-900">{z.name}</h3>
                          </div>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold border ${z.statusBadgeClass}`}
                          >
                            {z.statusLabel}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                          <span>
                            {z.occupiedSeats} / {z.totalSeats} seats occupied
                          </span>
                          <span className="font-bold text-slate-700">{percent}% load</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              percent >= 85
                                ? "bg-rose-500"
                                : percent > 50
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                            style={{ width: `${Math.min(100, percent)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 font-medium py-6 text-center">
                  No active study zones configured.
                </p>
              )}
            </div>

            {/* Right: Quick Shortcuts & Recent Bookings (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Quick Actions Card */}
              <div className="pulse-card p-5 space-y-3">
                <span className="kicker-label">QUICK SHORTCUTS</span>
                <div className="grid grid-cols-2 gap-2.5">
                  <Link
                    href="/admin/checkin"
                    className="flex flex-col p-3 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:shadow-xs transition-all group"
                  >
                    <ScanLine className="h-5 w-5 text-slate-900 mb-1.5" />
                    <span className="text-xs font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                      Scan Pass
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Camera QR</span>
                  </Link>

                  <Link
                    href="/admin/schedules"
                    className="flex flex-col p-3 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:shadow-xs transition-all group"
                  >
                    <Calendar className="h-5 w-5 text-slate-900 mb-1.5" />
                    <span className="text-xs font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                      Schedules
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Toggle Slots</span>
                  </Link>

                  <Link
                    href="/admin/bookings"
                    className="flex flex-col p-3 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:shadow-xs transition-all group"
                  >
                    <Users className="h-5 w-5 text-slate-900 mb-1.5" />
                    <span className="text-xs font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                      Bookings
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">View Ledger</span>
                  </Link>

                  <Link
                    href="/admin/settings"
                    className="flex flex-col p-3 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:shadow-xs transition-all group"
                  >
                    <Sliders className="h-5 w-5 text-slate-900 mb-1.5" />
                    <span className="text-xs font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                      Settings
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Operating Rules</span>
                  </Link>
                </div>
              </div>

              {/* Recent Activity Mini List */}
              <div className="pulse-card p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div>
                    <span className="kicker-label">RECENT PASSES</span>
                    <h3 className="text-xs font-black text-slate-900">Activity Feed</h3>
                  </div>
                  <Link
                    href="/admin/bookings"
                    className="text-[11px] font-bold text-slate-500 hover:text-slate-900"
                  >
                    View All &rsaquo;
                  </Link>
                </div>

                {recentBookings.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No recent bookings.</p>
                ) : (
                  <div className="space-y-2.5">
                    {recentBookings.map((b) => (
                      <div
                        key={b.id}
                        className="flex items-center justify-between gap-2 text-xs py-1"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">
                            {b.user?.name ?? "Student"}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            Seat {b.seat?.seatNumber} &bull; {b.seat?.zone?.name}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase shrink-0 ${
                            b.status === "checked_in"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : b.status === "confirmed"
                              ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {b.status.replace("_", " ")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default DashboardOverviewView;
