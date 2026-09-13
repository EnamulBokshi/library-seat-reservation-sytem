"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { UserMenu } from "@/components/shared/dashboard/user-menu";
import { isSelfServiceRole } from "@/lib/roles";
import {
  BookOpen,
  LogIn,
  UserPlus,
  ScanLine,
  Home,
  Shield,
  Activity,
  Armchair,
  LayoutDashboard,
} from "lucide-react";

interface NavLinkProps {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
}

function NavLink({ href, icon: Icon, label, active }: NavLinkProps) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
        active
          ? "bg-white text-slate-900 shadow-2xs border border-slate-200/90 font-extrabold"
          : "text-slate-500 hover:text-slate-900 hover:bg-white/60"
      }`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="whitespace-nowrap">{label}</span>
    </Link>
  );
}

function NavSeparator() {
  return <span className="mx-1 h-3.5 w-px rounded-full bg-slate-300/60 shrink-0" />;
}

export function Navbar() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const isLibrarian = user?.role === "librarian";
  const isStudent = isSelfServiceRole(user?.role);
  const canManage = isAdmin || isLibrarian;

  const isBookSeatActive = pathname === "/book" || pathname.startsWith("/book/") || pathname.startsWith("/zones");
  const isCatalogActive = pathname === "/books" || pathname.startsWith("/books/");
  const isDashboardActive = pathname.startsWith("/dashboard") || pathname.startsWith("/bookings/");
  const isCheckinActive = pathname.startsWith("/admin/checkin");
  const isAdminActive = pathname.startsWith("/admin") && !isCheckinActive;

  // Dashboard routes render their own sidebar shell and the auth pages render a
  // full-bleed split screen, so the public navbar stays out of both.
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/auth")
  ) {
    return null;
  }

  return (
    <>
      {/* ── Top Navbar ── */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-[#f4f5f7]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 sm:gap-4 px-4 sm:px-6 py-2.5">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 shadow-2xs group-hover:bg-slate-800 transition-colors">
              <Activity className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-base font-extrabold tracking-tight text-slate-900 whitespace-nowrap">
              Smart Library
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          {isAuthenticated && !isLoading && (
            <nav className="hidden lg:flex items-center gap-1 rounded-full bg-[#efeff1] p-1 border border-slate-200/70 shrink-0">
              <NavLink href="/" icon={Home} label="Overview" active={pathname === "/"} />
              <NavLink
                href="/book"
                icon={Armchair}
                label="Book Seat"
                active={isBookSeatActive}
              />
              <NavLink
                href="/books"
                icon={BookOpen}
                label="Catalog"
                active={isCatalogActive}
              />

              {/* Staff / Admin Shortcuts (Clean & Non-Breaking) */}
              {canManage && (
                <>
                  <NavSeparator />
                  <Link
                    href="/admin/checkin"
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                      isCheckinActive
                        ? "bg-white text-slate-900 shadow-2xs border border-slate-200/90 font-extrabold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                    }`}
                  >
                    <ScanLine className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                    <span>Scan QR</span>
                  </Link>

                </>
              )}
            </nav>
          )}

          {/* User Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {isLoading ? (
              <div className="h-8 w-20 animate-pulse rounded-full bg-slate-200" />
            ) : isAuthenticated && user ? (
              /* Dashboard and sign-out both live in the advance user menu. */
              <UserMenu placement="bottom" variant="pill" />
            ) : (
              <div className="flex items-center gap-2 whitespace-nowrap">
                <Link href="/auth/login" className="pulse-button-secondary py-1.5 px-3 text-xs">
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Sign In</span>
                </Link>
                <Link href="/auth/register" className="pulse-button-primary py-1.5 px-3 text-xs">
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Register</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Mobile Bottom Navigation Bar (Visible on screens < lg) ── */}
      {isAuthenticated && !isLoading && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white/95 backdrop-blur-xl border-t border-slate-200/90 px-2 py-2 flex items-center justify-around shadow-lg">
          <Link
            href="/"
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
              pathname === "/" ? "text-slate-900 font-extrabold" : "text-slate-400 font-medium"
            }`}
          >
            <Home className={`h-4.5 w-4.5 ${pathname === "/" ? "text-slate-900" : "text-slate-400"}`} />
            <span className="text-[10px] whitespace-nowrap">Home</span>
          </Link>

          <Link
            href="/book"
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
              isBookSeatActive
                ? "text-slate-900 font-extrabold"
                : "text-slate-400 font-medium"
            }`}
          >
            <Armchair
              className={`h-4.5 w-4.5 ${
                isBookSeatActive ? "text-slate-900" : "text-slate-400"
              }`}
            />
            <span className="text-[10px] whitespace-nowrap">Book Seat</span>
          </Link>

          <Link
            href="/books"
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
              isCatalogActive ? "text-slate-900 font-extrabold" : "text-slate-400"
            }`}
          >
            <BookOpen
              className={`h-4.5 w-4.5 ${
                isCatalogActive ? "text-slate-900" : "text-slate-400"
              }`}
            />
            <span className="text-[10px] whitespace-nowrap">Catalog</span>
          </Link>

          {isStudent && (
            <Link
              href="/dashboard"
              className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
                isDashboardActive ? "text-slate-900 font-extrabold" : "text-slate-400"
              }`}
            >
              <LayoutDashboard
                className={`h-4.5 w-4.5 ${
                  isDashboardActive ? "text-slate-900" : "text-slate-400"
                }`}
              />
              <span className="text-[10px] whitespace-nowrap">Dashboard</span>
            </Link>
          )}

          {canManage && (
            <>
              <Link
                href="/admin/checkin"
                className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
                  isCheckinActive
                    ? "text-indigo-600 font-extrabold"
                    : "text-slate-400 font-medium"
                }`}
              >
                <ScanLine
                  className={`h-4.5 w-4.5 ${
                    isCheckinActive ? "text-indigo-600" : "text-slate-400"
                  }`}
                />
                <span className="text-[10px] whitespace-nowrap">Scan QR</span>
              </Link>
              <Link
                href="/admin"
                className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
                  isAdminActive ? "text-slate-900 font-extrabold" : "text-slate-400"
                }`}
              >
                <Shield
                  className={`h-4.5 w-4.5 ${
                    isAdminActive ? "text-slate-900" : "text-slate-400"
                  }`}
                />
                <span className="text-[10px] whitespace-nowrap">Admin</span>
              </Link>
            </>
          )}
        </nav>
      )}
    </>
  );
}

export default Navbar;
