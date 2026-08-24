"use client";

import React from "react";
import Link from "next/link";
import { DashboardStats } from "@/lib/types";
import { Armchair, Users, BookOpen, Sparkles, ArrowRight } from "lucide-react";

interface TelemetryStatsProps {
  stats: DashboardStats | null;
  isStatsLoading?: boolean;
}

export function TelemetryStats({ stats, isStatsLoading = false }: TelemetryStatsProps) {
  const totalSeats = stats?.totalActiveSeats ?? 0;
  const availableSeats = stats?.availableSeats ?? 0;
  const occupiedSeats = Math.max(0, totalSeats - availableSeats);
  const occupancyPercent = totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 0;

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Metric 1: Library Live Capacity */}
      <div className="pulse-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="kicker-label">LIBRARY CAPACITY</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
            <Armchair className="h-4 w-4" />
          </div>
        </div>
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{availableSeats}</span>
            <span className="text-xs font-bold text-slate-400">/ {totalSeats} seats open</span>
          </div>
          <div className="mt-2.5 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all duration-500"
              style={{ width: `${Math.min(100, occupancyPercent)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-1.5 flex justify-between">
            <span>Current Occupancy</span>
            <span className="font-bold text-slate-700">{occupancyPercent}%</span>
          </p>
        </div>
      </div>

      {/* Metric 2: Today's Expected Sessions */}
      <div className="pulse-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="kicker-label">TODAY&apos;S ACTIVITY</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <Users className="h-4 w-4" />
          </div>
        </div>
        <div>
          <span className="text-3xl font-black text-slate-900">
            {stats?.expectedToday ?? 0}
          </span>
          <p className="text-xs font-bold text-slate-700 mt-1">Expected Study Sessions</p>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            {stats?.checkedIn ?? 0} students currently checked in
          </p>
        </div>
      </div>

      {/* Metric 3: Active Student Pass */}
      <div className="pulse-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="kicker-label">MY RESERVATIONS</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
            <BookOpen className="h-4 w-4" />
          </div>
        </div>
        <div>
          <span className="text-3xl font-black text-violet-700">
            {stats?.studentStats?.myActivePasses ?? 0}
          </span>
          <p className="text-xs font-bold text-slate-700 mt-1">Active Passes</p>
          <Link
            href="/bookings"
            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors inline-flex items-center gap-1 mt-0.5"
          >
            <span>View QR Entrance Tokens</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Metric 4: Ambient Atmosphere Index */}
      <div className="pulse-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="kicker-label">STUDY ENVIRONMENT</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
            <Sparkles className="h-4 w-4" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-base font-black text-slate-900">Optimal Ambience</span>
          </div>
          <p className="text-xs font-semibold text-slate-600 mt-1">
            28 dB &bull; Low Foot Traffic
          </p>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            Eduroam Wi-Fi &bull; 99% Power Outlets Up
          </p>
        </div>
      </div>
    </section>
  );
}

export default TelemetryStats;
