"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { isStaffRole } from "./dashboard-nav";
import {
  ChevronDown,
  ChevronUp,
  Home,
  LayoutDashboard,
  Flag,
  LogOut,
  Mail,
  Megaphone,
  Shield,
  UserRound,
} from "lucide-react";

interface MenuLink {
  href: string;
  label: string;
  icon: React.ElementType;
  /** Rendered as the highlighted primary entry. */
  primary?: boolean;
}

interface UserMenuProps {
  /** "top" opens upward (sidebar foot), "bottom" opens downward (navbar). */
  placement?: "top" | "bottom";
  /** Navbar uses a compact pill; the sidebar uses the full-width card. */
  variant?: "card" | "pill";
}

/**
 * Advance user menu: identity, role-aware shortcuts, and sign out.
 * This is the single place the app signs a user out from.
 */
export function UserMenu({ placement = "top", variant = "card" }: UserMenuProps) {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "US";

  const isStaff = isStaffRole(user.role);

  const links: MenuLink[] = [
    { href: "/dashboard", label: "My Dashboard", icon: LayoutDashboard, primary: true },
    { href: "/dashboard/profile", label: "Profile & Security", icon: UserRound },
    { href: "/notice", label: "Notices", icon: Megaphone },
    { href: "/dashboard/reports", label: "My Reports", icon: Flag },
    ...(isStaff ? [{ href: "/admin", label: "Admin Console", icon: Shield }] : []),
    { href: "/", label: "Library Home", icon: Home },
  ];

  const Chevron = placement === "top" ? ChevronUp : ChevronDown;

  const panelPosition =
    placement === "top"
      ? "bottom-full mb-2.5 left-0 right-0 animate-in fade-in slide-in-from-bottom-2"
      : "top-full mt-2 right-0 w-64 sm:w-72 animate-in fade-in slide-in-from-top-2";

  return (
    <div className={`relative z-50 ${variant === "card" ? "w-full" : ""}`} ref={menuRef}>
      {isOpen && (
        <div
          className={`absolute z-[100] rounded-2xl border border-slate-200/90 bg-white/95 p-3.5 text-slate-900 shadow-2xl shadow-slate-900/15 backdrop-blur-2xl duration-200 dark:border-slate-800 dark:bg-slate-900/95 dark:text-slate-100 ${panelPosition}`}
        >
          {/* Identity */}
          <div className="border-b border-slate-200/60 pb-3 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-xs font-black text-white shadow-2xs dark:bg-slate-800 dark:text-slate-100">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-black text-slate-900 dark:text-slate-100">{user.name}</p>
                <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  <Mail className="h-3 w-3 shrink-0 text-slate-400" />
                  <span className="truncate">{user.email}</span>
                </p>
              </div>
            </div>

            <div className="mt-2.5 flex items-center justify-between">
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>Online &bull; Active Session</span>
              </span>
              <span className="rounded-full border border-slate-200/80 bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400">
                {user.role}
              </span>
            </div>
          </div>

          {/* Shortcuts */}
          <div className="space-y-1 py-2">
            {links.map(({ href, label, icon: Icon, primary }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setIsOpen(false)}
                className={`group flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-bold transition-colors ${
                  primary
                    ? "bg-indigo-50/70 text-indigo-700 hover:bg-indigo-100/70 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Icon
                    className={`h-3.5 w-3.5 ${
                      primary
                        ? "text-indigo-600 dark:text-indigo-400"
                        : "text-slate-400 group-hover:text-slate-900 dark:text-slate-500 dark:group-hover:text-slate-100"
                    }`}
                  />
                  <span>{label}</span>
                </span>
                <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-600">&rsaquo;</span>
              </Link>
            ))}
          </div>

          {/* Sign out */}
          <div className="border-t border-slate-200/60 pt-2 dark:border-slate-800">
            <button
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-rose-200/70 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 transition-colors hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/50"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        title="Account menu"
        className={
          variant === "card"
            ? "group flex w-full items-center justify-between gap-2.5 rounded-2xl border border-white/60 bg-white/70 p-2.5 text-left shadow-sm backdrop-blur-xl transition-all duration-200 hover:bg-white/90 hover:shadow-md active:scale-98"
            : "group flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white px-1.5 py-1 shadow-2xs transition-colors hover:border-slate-300 sm:px-2"
        }
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className={`relative flex items-center justify-center rounded-xl bg-slate-900 font-black text-white shadow-2xs transition-colors group-hover:bg-slate-800 ${
              variant === "card" ? "h-9 w-9 shrink-0 text-xs" : "h-7 w-7 shrink-0 text-[10px]"
            }`}
          >
            {initials}
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
          </div>

          {variant === "card" ? (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-black leading-tight text-slate-900">{user.name}</p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="rounded-full border border-slate-200/60 bg-slate-900/5 px-1.5 py-0.2 text-[9px] font-extrabold uppercase text-slate-600">
                  {user.role}
                </span>
              </div>
            </div>
          ) : (
            <span className="hidden max-w-[110px] truncate text-xs font-bold text-slate-700 sm:inline">
              {user.name}
            </span>
          )}
        </div>

        <Chevron
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-slate-900" : "group-hover:text-slate-700"
          }`}
        />
      </button>
    </div>
  );
}

export default UserMenu;
