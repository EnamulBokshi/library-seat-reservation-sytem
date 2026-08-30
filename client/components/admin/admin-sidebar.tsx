"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  ScanLine,
  Calendar,
  MapPin,
  Settings,
  Activity,
  X,
  ExternalLink,
  ChevronRight,
  Shield,
  Sparkles,
  BookOpen,
  BookMarked,
} from "lucide-react";
import { AdminUserMenu } from "./admin-user-menu";

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

interface NavTabItem {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  badge?: string;
}

const NAV_TABS: NavTabItem[] = [
  {
    href: "/admin",
    label: "Overview",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: "/admin/books",
    label: "Book Inventory",
    icon: BookOpen,
  },
  {
    href: "/admin/loans",
    label: "Circulation Desk",
    icon: BookMarked,
  },
  {
    href: "/admin/bookings",
    label: "Seat Bookings",
    icon: ClipboardList,
  },
  {
    href: "/admin/checkin",
    label: "Check-In Scanner",
    icon: ScanLine,
  },
  {
    href: "/admin/schedules",
    label: "Schedules & Slots",
    icon: Calendar,
  },
  {
    href: "/admin/zones",
    label: "Zones & Capacity",
    icon: MapPin,
  },
  {
    href: "/admin/settings",
    label: "System Settings",
    icon: Settings,
  },
];

export function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();

  const isTabActive = (item: NavTabItem) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  return (
    <>
      {/* ── Mobile Backdrop Overlay ── */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden animate-in fade-in duration-200"
        />
      )}

      {/* ── Sidebar Container ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-72 flex-col justify-between border-r border-slate-200/80 bg-[#f8f9fa]/95 backdrop-blur-xl p-4 transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:translate-x-0 shrink-0 overflow-y-auto ${
          isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:shadow-none"
        }`}
      >
        {/* Top Branding Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2 pt-2">
            <Link
              href="/admin"
              className="flex items-center gap-2.5 group"
              onClick={onClose}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm group-hover:bg-slate-800 transition-colors">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <span className="text-base font-black tracking-tight text-slate-900 block leading-tight">
                  Smart Library
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/5 px-2 py-0.2 text-[9px] font-extrabold tracking-wider uppercase text-slate-600 border border-slate-200/80">
                  Admin Portal
                </span>
              </div>
            </Link>

            {/* Mobile close button */}
            {onClose && (
              <button
                onClick={onClose}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 lg:hidden transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Navigation Tabs List */}
          <nav className="space-y-1.5 px-1">
            <p className="px-3 pb-1 text-[10px] font-extrabold tracking-wider uppercase text-slate-400">
              Management Modules
            </p>

            {NAV_TABS.map((item) => {
              const active = isTabActive(item);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`group relative flex items-center justify-between rounded-2xl px-3.5 py-2.5 text-xs font-bold transition-all duration-200 ${
                    active
                      ? "bg-slate-900 text-white shadow-sm font-black"
                      : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`h-4 w-4 shrink-0 transition-colors ${
                        active ? "text-white" : "text-slate-400 group-hover:text-slate-900"
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {active ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                  ) : item.badge ? (
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-extrabold text-slate-700">
                      {item.badge}
                    </span>
                  ) : (
                    <ChevronRight className="h-3 w-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* ── Bottom Section: User Advance Menu ── */}
        <div className="pt-4 border-t border-slate-200/60 space-y-3 px-1">
          {/* Student Portal Link */}
          <Link
            href="/"
            className="flex items-center justify-between rounded-xl px-3 py-2 text-[11px] font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors group"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-900" />
              <span>Switch to Student View</span>
            </span>
            <span className="text-[10px] font-extrabold text-slate-400">&rsaquo;</span>
          </Link>

          {/* Glassy Advance User Profile Menu */}
          <AdminUserMenu />
        </div>
      </aside>
    </>
  );
}

export default AdminSidebar;
