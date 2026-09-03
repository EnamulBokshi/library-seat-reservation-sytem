"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import {
  BookOpen,
  LogOut,
  User as UserIcon,
  LogIn,
  UserPlus,
  ClipboardList,
  ScanLine,
  Home,
  Shield,
  Settings,
  Activity,
  Calendar,
  Armchair,
  Bookmark,
  ChevronDown,
  Layers,
  ArrowRight,
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
  const { user, isAuthenticated, logout, isLoading } = useAuth();
  const pathname = usePathname();
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const adminMenuRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const isLibrarian = user?.role === "librarian";
  const isStudent = user?.role === "student";
  const canManage = isAdmin || isLibrarian;

  const isBookSeatActive = pathname === "/book" || pathname.startsWith("/book/") || pathname.startsWith("/zones");
  const isCatalogActive = pathname === "/books" || pathname.startsWith("/books/");
  const isMySeatsActive = pathname === "/bookings" || pathname.startsWith("/bookings/");
  const isMyLoansActive = pathname === "/loans" || pathname.startsWith("/loans/");
  const isCheckinActive = pathname.startsWith("/admin/checkin");
  const isAdminActive = pathname.startsWith("/admin") && !isCheckinActive;

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (adminMenuRef.current && !adminMenuRef.current.contains(event.target as Node)) {
        setIsAdminMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdown when route changes
  useEffect(() => {
    setIsAdminMenuOpen(false);
  }, [pathname]);

  // Do not render student/public navbar on dedicated admin dashboard pages
  if (pathname.startsWith("/admin")) {
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

              {/* Student Only Passes */}
              {isStudent && (
                <>
                  <NavSeparator />
                  <NavLink
                    href="/bookings"
                    icon={ClipboardList}
                    label="My Seats"
                    active={isMySeatsActive}
                  />
                  <NavLink
                    href="/loans"
                    icon={Bookmark}
                    label="My Loans"
                    active={isMyLoansActive}
                  />
                </>
              )}

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

                  {/* Admin Tools Dropdown */}
                  <div className="relative" ref={adminMenuRef}>
                    <button
                      type="button"
                      onClick={() => setIsAdminMenuOpen((prev) => !prev)}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                        isAdminMenuOpen || isAdminActive
                          ? "bg-slate-900 text-white shadow-2xs font-extrabold"
                          : "bg-slate-900 text-white hover:bg-slate-800 shadow-2xs"
                      }`}
                    >
                      <Shield className="h-3.5 w-3.5 shrink-0" />
                      <span>Admin Tools</span>
                      <ChevronDown
                        className={`h-3 w-3 transition-transform duration-200 ${
                          isAdminMenuOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {/* Dropdown Menu */}
                    {isAdminMenuOpen && (
                      <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
                        <div className="px-2.5 py-1.5 border-b border-slate-100 mb-1">
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Administrative Workspace
                          </p>
                        </div>

                        <Link
                          href="/admin"
                          className="flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-black text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100/70 transition-colors mb-1"
                        >
                          <div className="flex items-center gap-2">
                            <Shield className="h-3.5 w-3.5 text-indigo-600" />
                            <span>Admin Console</span>
                          </div>
                          <ArrowRight className="h-3 w-3" />
                        </Link>

                        <Link
                          href="/admin/zones"
                          className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <Layers className="h-3.5 w-3.5 text-slate-400" />
                          <span>Zones &amp; Seating Layout</span>
                        </Link>

                        <Link
                          href="/admin/bookings"
                          className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <ClipboardList className="h-3.5 w-3.5 text-slate-400" />
                          <span>All Reservations</span>
                        </Link>

                        <Link
                          href="/admin/loans"
                          className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <Bookmark className="h-3.5 w-3.5 text-slate-400" />
                          <span>Circulation &amp; Loans</span>
                        </Link>

                        <Link
                          href="/admin/schedules"
                          className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span>Schedules &amp; Slots</span>
                        </Link>

                        <Link
                          href="/admin/settings"
                          className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <Settings className="h-3.5 w-3.5 text-slate-400" />
                          <span>System Settings</span>
                        </Link>
                      </div>
                    )}
                  </div>
                </>
              )}
            </nav>
          )}

          {/* User Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {isLoading ? (
              <div className="h-8 w-20 animate-pulse rounded-full bg-slate-200" />
            ) : isAuthenticated && user ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* User Pill */}
                <div className="flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white px-2.5 sm:px-3 py-1 text-xs font-semibold text-slate-700 shadow-2xs whitespace-nowrap">
                  <UserIcon className="h-3.5 w-3.5 text-slate-900 shrink-0" />
                  <span className="truncate max-w-[90px] sm:max-w-[130px] font-bold">
                    {user.name}
                  </span>
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[9px] font-extrabold text-slate-600 uppercase border border-slate-200/60 shrink-0">
                    {user.role}
                  </span>
                </div>

                {/* Logout Button */}
                <button
                  onClick={logout}
                  className="flex items-center gap-1 rounded-full border border-slate-200/80 bg-white px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 whitespace-nowrap shrink-0"
                  title="Logout"
                >
                  <LogOut className="h-3.5 w-3.5 text-slate-500 hover:text-rose-600 shrink-0" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
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
            <>
              <Link
                href="/bookings"
                className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
                  isMySeatsActive
                    ? "text-slate-900 font-extrabold"
                    : "text-slate-400"
                }`}
              >
                <ClipboardList
                  className={`h-4.5 w-4.5 ${
                    isMySeatsActive ? "text-slate-900" : "text-slate-400"
                  }`}
                />
                <span className="text-[10px] whitespace-nowrap">My Seats</span>
              </Link>
              <Link
                href="/loans"
                className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
                  isMyLoansActive ? "text-slate-900 font-extrabold" : "text-slate-400"
                }`}
              >
                <Bookmark
                  className={`h-4.5 w-4.5 ${
                    isMyLoansActive ? "text-slate-900" : "text-slate-400"
                  }`}
                />
                <span className="text-[10px] whitespace-nowrap">My Loans</span>
              </Link>
            </>
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
