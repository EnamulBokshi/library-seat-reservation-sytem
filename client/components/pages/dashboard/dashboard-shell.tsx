"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { CalendarCheck, BookOpen, Receipt, UserRound, LayoutDashboard } from "lucide-react";

interface DashboardTab {
  href: string;
  label: string;
  Icon: React.ElementType;
}

const TABS: DashboardTab[] = [
  { href: "/dashboard", label: "Overview", Icon: LayoutDashboard },
  { href: "/dashboard/bookings", label: "My Bookings", Icon: CalendarCheck },
  { href: "/dashboard/loans", label: "My Loans", Icon: BookOpen },
  { href: "/dashboard/fines", label: "Fines", Icon: Receipt },
  { href: "/dashboard/profile", label: "Profile", Icon: UserRound },
];

/**
 * Chrome shared by every dashboard tab: greeting header plus the tab bar.
 * Each tab is a real route, so a tab is linkable and reloads cleanly.
 */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#f4f5f7]">
      <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 lg:px-8">
        <header className="mb-6">
          <p className="kicker-label">MY LIBRARY</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            {user?.name ? `Welcome back, ${user.name.split(" ")[0]}` : "Dashboard"}
          </h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Reservations, borrowed books, dues and account settings in one place.
          </p>
        </header>

        <nav
          aria-label="Dashboard sections"
          className="mb-6 flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-sm"
        >
          {TABS.map(({ href, label, Icon }) => {
            // Only the overview needs an exact match; the rest own their subtree.
            const isActive = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors sm:text-sm ${
                  isActive
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">{children}</div>
    </div>
  );
}

export default DashboardShell;
