"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { bookingService } from "@/services/booking-service";
import { DashboardStats, ApiError } from "@/lib/types";
import {
  Shield, MapPin, ClipboardList, ScanLine, ArrowRight, Loader2,
  Calendar, CheckCircle2, AlertTriangle, UserCheck, Activity, Plus, Search, RefreshCw, BookOpen
} from "lucide-react";

export function HomeView() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin     = user?.role === "admin";
  const isLibrarian = user?.role === "librarian";
  const isStudent   = user?.role === "student";
  const canManage   = isAdmin || isLibrarian;

  const fetchStats = useCallback(async () => {
    setIsStatsLoading(true);
    setError(null);
    try {
      const res = await bookingService.getStats();
      setStats(res.data);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setError(apiErr?.message ?? "Failed to load dynamic stats.");
    } finally {
      setIsStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchStats();
    } else {
      setIsStatsLoading(false);
    }
  }, [isAuthenticated, fetchStats]);

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-slate-900">
      <main className="mx-auto max-w-7xl px-4 sm:px-6 pt-6 pb-24 md:pb-8 space-y-6">

        {/* ── Header Section ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="kicker-label">OVERVIEW &rsaquo; FRONT DESK</p>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">
              Who is here, and who is next
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Arrivals, current seat allocations, and study zone status in real-time.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isAuthenticated && (
              <button
                onClick={fetchStats}
                disabled={isStatsLoading}
                className="pulse-button-secondary py-2.5 px-3 text-xs"
                title="Refresh Live Database Stats"
              >
                <RefreshCw className={`h-4 w-4 ${isStatsLoading ? "animate-spin" : ""}`} />
              </button>
            )}
            {canManage ? (
              <>
                <Link href="/admin/checkin" className="pulse-button-secondary">
                  <ScanLine className="h-4 w-4" />
                  <span>Scan QR Token</span>
                </Link>
                <Link href="/zones" className="pulse-button-primary">
                  <Plus className="h-4 w-4" />
                  <span>Reserve Seat</span>
                </Link>
              </>
            ) : (
              <Link href="/zones" className="pulse-button-primary">
                <Plus className="h-4 w-4" />
                <span>Book Seat Now</span>
              </Link>
            )}
          </div>
        </div>

        {/* ── Dynamic Metric Summary Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Expected Today / Student Active Passes */}
          <div className="pulse-card p-5">
            <div className="flex items-center justify-between">
              <span className="kicker-label">
                {isStudent ? "MY ACTIVE PASSES" : "EXPECTED TODAY"}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 border border-slate-200">
                {isStudent ? <BookOpen className="h-4 w-4 text-slate-700" /> : <Calendar className="h-4 w-4 text-slate-700" />}
              </div>
            </div>
            <div className="mt-3">
              {isStatsLoading ? (
                <div className="h-9 w-16 bg-slate-100 animate-pulse rounded-lg" />
              ) : (
                <p className="text-3xl font-extrabold tracking-tight text-slate-900">
                  {isStudent && stats?.studentStats
                    ? String(stats.studentStats.myActivePasses).padStart(2, "0")
                    : String(stats?.expectedToday ?? 0).padStart(2, "0")}
                </p>
              )}
              <p className="text-xs text-slate-500 mt-1">
                {isStudent ? "Ready for entrance check-in" : `Across ${stats?.liveZones.length ?? 0} study zones`}
              </p>
            </div>
          </div>

          {/* Card 2: Checked In / Completed Sessions */}
          <div className="pulse-card p-5">
            <div className="flex items-center justify-between">
              <span className="kicker-label">
                {isStudent ? "COMPLETED SESSIONS" : "CHECKED IN"}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100">
                <UserCheck className="h-4 w-4 text-indigo-600" />
              </div>
            </div>
            <div className="mt-3">
              {isStatsLoading ? (
                <div className="h-9 w-16 bg-slate-100 animate-pulse rounded-lg" />
              ) : (
                <p className="text-3xl font-extrabold tracking-tight text-slate-900">
                  {isStudent && stats?.studentStats
                    ? String(stats.studentStats.myCompletedSessions).padStart(2, "0")
                    : String(stats?.checkedIn ?? 0).padStart(2, "0")}
                </p>
              )}
              <p className="text-xs text-slate-500 mt-1">
                {isStudent ? "Total study passes completed" : "Studying right now"}
              </p>
            </div>
          </div>

          {/* Card 3: No-Shows / System Expected Today */}
          <div className="pulse-card p-5">
            <div className="flex items-center justify-between">
              <span className="kicker-label">
                {isStudent ? "EXPECTED TODAY" : "NO-SHOWS"}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 border border-amber-100">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
            </div>
            <div className="mt-3">
              {isStatsLoading ? (
                <div className="h-9 w-16 bg-slate-100 animate-pulse rounded-lg" />
              ) : (
                <p className="text-3xl font-extrabold tracking-tight text-slate-900">
                  {isStudent
                    ? String(stats?.expectedToday ?? 0).padStart(2, "0")
                    : String(stats?.noShows ?? 0).padStart(2, "0")}
                </p>
              )}
              <p className="text-xs text-slate-500 mt-1">
                {isStudent ? "Total arrivals scheduled today" : "Missed 15m grace window"}
              </p>
            </div>
          </div>

          {/* Card 4: Available Seats */}
          <div className="pulse-card p-5">
            <div className="flex items-center justify-between">
              <span className="kicker-label">AVAILABLE SEATS</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
            <div className="mt-3">
              {isStatsLoading ? (
                <div className="h-9 w-16 bg-slate-100 animate-pulse rounded-lg" />
              ) : (
                <p className="text-3xl font-extrabold tracking-tight text-slate-900">
                  {String(stats?.availableSeats ?? 0).padStart(2, "0")}
                </p>
              )}
              <p className="text-xs text-slate-500 mt-1">
                {stats?.totalActiveSeats ? `Out of ${stats.totalActiveSeats} active seats` : "Ready for reservation"}
              </p>
            </div>
          </div>

        </div>

        {/* ── Main Dashboard Layout (Split View) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column: Quick Access & Table Overview */}
          <div className="lg:col-span-2 space-y-6">

            {/* Quick Navigation Cards */}
            <div className="pulse-card p-6">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div>
                  <span className="kicker-label">QUICK ACCESS</span>
                  <h2 className="text-base font-bold text-slate-900">Core Management Modules</h2>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {user ? user.role.toUpperCase() : "GUEST"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link
                  href="/zones"
                  className="group rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 hover:bg-white hover:shadow-xs hover:border-slate-300 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white group-hover:scale-105 transition-transform">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Study Zones & Seats</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Interactive seat selection grid</p>
                    </div>
                  </div>
                </Link>

                <Link
                  href={canManage ? "/admin/bookings" : "/bookings"}
                  className="group rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 hover:bg-white hover:shadow-xs hover:border-slate-300 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white group-hover:scale-105 transition-transform">
                      <ClipboardList className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">
                        {canManage ? "All System Bookings" : "My Bookings"}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">Manage reservations & QR passes</p>
                    </div>
                  </div>
                </Link>
              </div>
            </div>

            {/* User Session Info Card */}
            {user && (
              <div className="pulse-card p-6">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <span className="kicker-label">ACTIVE ACCOUNT</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Verified
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 font-medium block mb-1">User Name</span>
                    <span className="text-slate-900 font-bold text-sm">{user.name}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 font-medium block mb-1">Role</span>
                    <span className="text-slate-900 font-bold text-sm uppercase">{user.role}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 sm:col-span-1">
                    <span className="text-slate-400 font-medium block mb-1">Email</span>
                    <span className="text-slate-700 font-medium truncate block">{user.email}</span>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Right Column: Live Room / Zone Status (Dynamic from Database) */}
          <div className="pulse-card p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="kicker-label">LIVE ZONE STATUS</span>
              <span className="text-xs text-slate-400 font-medium">Updated live</span>
            </div>

            <div className="space-y-3">
              {isStatsLoading ? (
                <div className="space-y-3 py-2">
                  <div className="h-14 bg-slate-50 animate-pulse rounded-xl" />
                  <div className="h-14 bg-slate-50 animate-pulse rounded-xl" />
                  <div className="h-14 bg-slate-50 animate-pulse rounded-xl" />
                </div>
              ) : !stats?.liveZones || stats.liveZones.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs font-medium">
                  No active study zones.
                </div>
              ) : (
                stats.liveZones.map((zone) => (
                  <div
                    key={zone.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{zone.name}</p>
                      <p className="text-xs text-slate-400 font-medium">
                        {zone.description || "Study area"} ({zone.availableSeats}/{zone.totalSeats} Available)
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold shrink-0 ${zone.statusBadgeClass}`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {zone.statusLabel}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-100">
              <Link href="/zones" className="text-xs font-bold text-slate-900 flex items-center justify-between hover:underline">
                <span>View all zone details</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}

export default HomeView;


