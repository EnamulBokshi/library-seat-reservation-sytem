"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Menu,
  ScanLine,
  Calendar,
  Sparkles,
  Clock,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Search,
} from "lucide-react";

interface AdminTopbarProps {
  onToggleMobileSidebar: () => void;
}

const ROUTE_TITLES: Record<string, { title: string; subtitle: string; kicker: string }> = {
  "/admin": {
    title: "Executive Dashboard",
    subtitle: "Real-time library occupancy, daily session stats, and system telemetry",
    kicker: "OVERVIEW & ANALYTICS",
  },
  "/admin/bookings": {
    title: "All Bookings & Passes",
    subtitle: "Comprehensive ledger of student seat reservations and attendance records",
    kicker: "RESERVATION LEDGER",
  },
  "/admin/checkin": {
    title: "QR Code Check-In Scanner",
    subtitle: "Live entrance camera verification and manual pass validation terminal",
    kicker: "ENTRANCE TERMINAL",
  },
  "/admin/schedules": {
    title: "Schedules & Time Slot Control",
    subtitle: "Daily slot availability, session operating hours, and holiday closures",
    kicker: "CALENDAR & SLOTS",
  },
  "/admin/zones": {
    title: "Zones & Capacity Planning",
    subtitle: "Study halls, quiet zones, and seat inventory management",
    kicker: "ZONE MANAGEMENT",
  },
  "/admin/settings": {
    title: "System Configuration",
    subtitle: "Global operating hours, grace period rules, and advance booking window",
    kicker: "SYSTEM PARAMETERS",
  },
};

export function AdminTopbar({ onToggleMobileSidebar }: AdminTopbarProps) {
  const pathname = usePathname();
  const [timeStr, setTimeStr] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const meta = ROUTE_TITLES[pathname] ?? {
    title: "Admin Portal",
    subtitle: "Smart Library management console",
    kicker: "ADMINISTRATION",
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-[#f4f5f7]/90 px-4 sm:px-6 backdrop-blur-md">
      {/* Left: Mobile Toggle & Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 shadow-2xs hover:bg-slate-50 lg:hidden transition-colors"
          title="Toggle Navigation Menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] font-extrabold tracking-wider uppercase text-slate-400">
            <span>ADMIN</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-slate-700 truncate">{meta.kicker}</span>
          </div>
          <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 truncate">
            {meta.title}
          </h1>
        </div>
      </div>

      {/* Right: Quick Actions & Live System Pulse */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Live Clock Pill */}
        <div className="hidden md:flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white px-3 py-1 text-xs font-mono font-bold text-slate-700 shadow-2xs">
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          <span>{timeStr || "00:00:00"}</span>
        </div>

        {/* Live System Pulse Pill */}
        <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800 shadow-2xs">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="h-2 w-2 rounded-full bg-emerald-500 -ml-3.5" />
          <span>System Live</span>
        </div>

        {/* Quick Action: Scan QR */}
        <Link
          href="/admin/checkin"
          className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3.5 py-1.5 text-xs font-black text-white shadow-sm hover:bg-slate-800 transition-all active:scale-95"
        >
          <ScanLine className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Scan QR Pass</span>
        </Link>
      </div>
    </header>
  );
}

export default AdminTopbar;
