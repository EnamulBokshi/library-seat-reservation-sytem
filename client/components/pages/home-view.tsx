"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { bookingService } from "@/services/booking-service";
import { zoneService } from "@/services/zone-service";
import { DashboardStats, Zone, ApiError } from "@/lib/types";
import {
  HomeHero,
  TelemetryStats,
  ZonesCarousel,
  StudentMoments,
  StaffOnDuty,
  AmenitiesStrip,
} from "./home";

export function HomeView() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.role === "admin";
  const isLibrarian = user?.role === "librarian";
  const isStudent = user?.role === "student";
  const canManage = isAdmin || isLibrarian;

  const fetchHomeData = useCallback(async () => {
    setIsStatsLoading(true);
    setError(null);
    try {
      const [statsRes, zonesRes] = await Promise.allSettled([
        bookingService.getStats(),
        zoneService.getAll(),
      ]);

      if (statsRes.status === "fulfilled") {
        setStats(statsRes.value.data);
      } else {
        const err = statsRes.reason as ApiError;
        setError(err?.message ?? "Failed to load library stats.");
      }

      if (zonesRes.status === "fulfilled") {
        setZones(zonesRes.value.data ?? []);
      }
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setError(apiErr?.message ?? "Failed to load dashboard data.");
    } finally {
      setIsStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHomeData();
  }, [fetchHomeData]);

  const availableSeats = stats?.availableSeats ?? 0;

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-slate-900 selection:bg-slate-900 selection:text-white font-sans">
      <main className="mx-auto max-w-7xl px-4 sm:px-6 pt-6 pb-28 md:pb-16 space-y-10">
        {/* ── 1. Dynamic Hero & Campus Pulse Header ── */}
        <HomeHero
          user={user}
          availableSeats={availableSeats}
          isStudent={isStudent}
          canManage={canManage}
        />

        {/* ── 2. Overall Live Telemetry Stats ── */}
        <TelemetryStats stats={stats} isStatsLoading={isStatsLoading} />

        {/* ── 3. Interactive Study Zones Carousel ── */}
        <ZonesCarousel zones={zones} stats={stats} />

        {/* ── 4. Student Moments Gallery ── */}
        <StudentMoments />

        {/* ── 5. Library Staff on Duty & Help Desk Spotlight ── */}
        <StaffOnDuty />

        {/* ── 6. Campus Library Amenities Strip ── */}
        <AmenitiesStrip />
      </main>
    </div>
  );
}

export default HomeView;
