"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { User } from "@/lib/types";
import { Armchair, ArrowRight, ScanLine, Shield } from "lucide-react";

interface HomeHeroProps {
  user: User | null;
  availableSeats: number;
  isStudent: boolean;
  canManage: boolean;
}

export function HomeHero({
  user,
  availableSeats,
  isStudent,
  canManage,
}: HomeHeroProps) {
  // Contextual greeting based on local time
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const firstName = user?.name ? user.name.split(" ")[0] : "Scholar";

  return (
    <section className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-6 sm:p-10 shadow-xl">
      {/* Subtle ambient lighting gradients */}
      <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
      <div className="absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          {/* Campus Pulse Pill */}
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-200 border border-white/15 backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Library Operating &bull; Quiet Hours Active</span>
            <span className="text-white/40">&bull;</span>
            <span className="text-emerald-300 font-extrabold">{availableSeats} Seats Ready</span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
            {greeting}, {firstName}!
          </h1>

          <p className="text-sm sm:text-base text-slate-300 font-normal leading-relaxed">
            Find your quiet sanctuary, reserve an ergonomic study armchair, and achieve deep focus
            across campus library halls.
          </p>
        </div>

        {/* Quick Action CTAs */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link
            href="/book"
            className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black text-slate-900 shadow-md hover:bg-slate-100 transition-all active:scale-95"
          >
            <Armchair className="h-4 w-4" />
            <span>Book a Seat Now</span>
            <ArrowRight className="h-4 w-4" />
          </Link>

          {isStudent && (
            <Link
              href="/bookings"
              className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur-md hover:bg-white/20 transition-all active:scale-95"
            >
              <ScanLine className="h-4 w-4" />
              <span>My Passes & QR</span>
            </Link>
          )}

          {canManage && (
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur-md hover:bg-white/20 transition-all active:scale-95"
            >
              <Shield className="h-4 w-4" />
              <span>Admin Dashboard</span>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

export default HomeHero;
