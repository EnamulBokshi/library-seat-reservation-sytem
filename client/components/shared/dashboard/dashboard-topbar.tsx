"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Clock, Menu } from "lucide-react";

export interface RouteMeta {
  title: string;
  subtitle: string;
  kicker: string;
}

export interface TopbarQuickAction {
  href: string;
  label: string;
  icon: React.ElementType;
}

interface DashboardTopbarProps {
  /** Breadcrumb root, e.g. "ADMIN" or "MY LIBRARY". */
  breadcrumbRoot: string;
  routeTitles: Record<string, RouteMeta>;
  fallbackMeta: RouteMeta;
  quickAction?: TopbarQuickAction;
  onToggleMobileSidebar: () => void;
}

export function DashboardTopbar({
  breadcrumbRoot,
  routeTitles,
  fallbackMeta,
  quickAction,
  onToggleMobileSidebar,
}: DashboardTopbarProps) {
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

  const meta = routeTitles[pathname] ?? fallbackMeta;
  const QuickActionIcon = quickAction?.icon;

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-[#f4f5f7]/90 px-4 backdrop-blur-md sm:px-6">
      {/* Left: Mobile Toggle & Breadcrumb */}
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 shadow-2xs transition-colors hover:bg-slate-50 lg:hidden"
          title="Toggle Navigation Menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            <span>{breadcrumbRoot}</span>
            <ChevronRight className="h-3 w-3" />
            <span className="truncate text-slate-700">{meta.kicker}</span>
          </div>
          <h1 className="truncate text-base font-black tracking-tight text-slate-900 sm:text-lg">
            {meta.title}
          </h1>
        </div>
      </div>

      {/* Right: Live pulse & quick action */}
      <div className="flex shrink-0 items-center gap-2.5">
        <div className="hidden items-center gap-1.5 rounded-full border border-slate-200/80 bg-white px-3 py-1 font-mono text-xs font-bold text-slate-700 shadow-2xs md:flex">
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          <span>{timeStr || "00:00:00"}</span>
        </div>

        <div className="hidden items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800 shadow-2xs sm:flex">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>System Live</span>
        </div>

        {quickAction && QuickActionIcon && (
          <Link
            href={quickAction.href}
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3.5 py-1.5 text-xs font-black text-white shadow-sm transition-all hover:bg-slate-800 active:scale-95"
          >
            <QuickActionIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{quickAction.label}</span>
          </Link>
        )}
      </div>
    </header>
  );
}

export default DashboardTopbar;
