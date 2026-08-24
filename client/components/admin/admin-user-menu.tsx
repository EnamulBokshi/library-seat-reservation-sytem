"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import {
  User,
  Shield,
  LogOut,
  ChevronUp,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Mail,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

export function AdminUserMenu() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "AD";

  return (
    <div className="relative w-full" ref={menuRef}>
      {/* ── Glassy Popover Menu ── */}
      {isOpen && (
        <div className="absolute bottom-full left-0 right-0 mb-2.5 rounded-2xl border border-white/60 bg-white/85 p-3.5 shadow-xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-200 z-50 text-slate-900">
          {/* User Details Header */}
          <div className="border-b border-slate-200/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white font-black text-xs shadow-2xs">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-slate-900 truncate">{user.name}</p>
                <p className="text-[11px] text-slate-500 font-medium truncate flex items-center gap-1 mt-0.5">
                  <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                  <span className="truncate">{user.email}</span>
                </p>
              </div>
            </div>

            <div className="mt-2.5 flex items-center justify-between">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Online &bull; Active Session</span>
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase text-slate-600 border border-slate-200/80">
                {user.role}
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="py-2 space-y-1">
            <Link
              href="/"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors group"
            >
              <span className="flex items-center gap-2">
                <ExternalLink className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-900" />
                <span>Student Portal</span>
              </span>
              <span className="text-[10px] text-slate-400 font-extrabold">&rsaquo;</span>
            </Link>

            <Link
              href="/admin/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors group"
            >
              <span className="flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-900" />
                <span>System Parameters</span>
              </span>
              <span className="text-[10px] text-slate-400 font-extrabold">&rsaquo;</span>
            </Link>
          </div>

          {/* Sign Out Button */}
          <div className="border-t border-slate-200/60 pt-2">
            <button
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-rose-50 border border-rose-200/70 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Glassy User Trigger Pill ── */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between gap-2.5 rounded-2xl border border-white/60 bg-white/70 p-2.5 text-left shadow-sm backdrop-blur-xl transition-all duration-200 hover:bg-white/90 hover:shadow-md active:scale-98 group"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white font-black text-xs shadow-2xs shrink-0 group-hover:bg-slate-800 transition-colors">
            {initials}
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-slate-900 truncate leading-tight">
              {user.name}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="rounded-full bg-slate-900/5 px-1.5 py-0.2 text-[9px] font-extrabold uppercase text-slate-600 border border-slate-200/60">
                {user.role}
              </span>
            </div>
          </div>
        </div>

        <ChevronUp
          className={`h-4 w-4 text-slate-400 transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180 text-slate-900" : "group-hover:text-slate-700"
          }`}
        />
      </button>
    </div>
  );
}

export default AdminUserMenu;
