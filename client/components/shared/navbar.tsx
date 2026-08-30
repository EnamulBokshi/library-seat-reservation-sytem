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
  Armchair,
  Bookmark,
  Menu,
  X,
  ChevronDown,
  LayoutDashboard,
  Calendar,
  BookMarked,
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
      className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
        active
          ? "bg-white text-slate-900 shadow-2xs border border-slate-200/80 font-bold"
          : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
      }`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span>{label}</span>
    </Link>
  );
}

function NavSeparator() {
  return <span className="mx-1 h-3.5 w-px rounded-full bg-slate-300/60 shrink-0" />;
}

export function Navbar() {
  const { user, isAuthenticated, logout, isLoading } = useAuth();
  const pathname = usePathname();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAdminDropdownOpen, setIsAdminDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  const adminMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const isLibrarian = user?.role === "librarian";
  const isStudent = user?.role === "student" || (!isAdmin && !isLibrarian);
  const canManage = isAdmin || isLibrarian;

  // Close dropdowns on route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsAdminDropdownOpen(false);
    setIsUserDropdownOpen(false);
  }, [pathname]);

  // Click outside handlers
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (adminMenuRef.current && !adminMenuRef.current.contains(event.target as Node)) {
        setIsAdminDropdownOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Do not render student/public navbar on dedicated admin dashboard pages
  if (pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <>
      {/* ── Top Header ── */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-[#f4f5f7]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 sm:px-6 py-2.5">
          
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 shadow-2xs group-hover:bg-slate-800 transition-colors">
              <Activity className="h-4.5 w-4.5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm sm:text-base font-extrabold tracking-tight text-slate-900 leading-tight">
                Smart Library
              </span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest hidden sm:block">
                Seat & Book Portal
              </span>
            </div>
          </Link>

          {/* ── Desktop Navigation Bar (Unbreakable Centered Pill) ── */}
          {isAuthenticated && !isLoading && (
            <nav className="hidden lg:flex items-center gap-1 rounded-full bg-[#e9eaed] p-1 border border-slate-200/70 shadow-2xs">
              <NavLink href="/" icon={Home} label="Overview" active={pathname === "/"} />
              <NavLink
                href="/book"
                icon={Armchair}
                label="Book Seat"
                active={pathname === "/book" || pathname.startsWith("/book/") || pathname.startsWith("/zones")}
              />
              <NavLink
                href="/books"
                icon={BookOpen}
                label="Books Catalog"
                active={pathname === "/books" || pathname.startsWith("/books/")}
              />

              {/* Student Personal Links */}
              {isStudent && (
                <>
                  <NavSeparator />
                  <NavLink
                    href="/bookings"
                    icon={ClipboardList}
                    label="My Seats"
                    active={pathname === "/bookings" || pathname.startsWith("/bookings/")}
                  />
                  <NavLink
                    href="/loans"
                    icon={Bookmark}
                    label="My Loans"
                    active={pathname === "/loans" || pathname.startsWith("/loans/")}
                  />
                </>
              )}

              {/* Admin / Librarian Compact Portal Dropdown */}
              {canManage && (
                <>
                  <NavSeparator />
                  <div className="relative" ref={adminMenuRef}>
                    <button
                      type="button"
                      onClick={() => setIsAdminDropdownOpen((prev) => !prev)}
                      className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                        isAdminDropdownOpen || pathname.startsWith("/admin")
                          ? "bg-slate-900 text-white shadow-2xs"
                          : "text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 hover:text-indigo-900 border border-indigo-200/60"
                      }`}
                    >
                      <Shield className="h-3.5 w-3.5 shrink-0" />
                      <span>Admin Portal</span>
                      <ChevronDown className="h-3 w-3" />
                    </button>

                    {isAdminDropdownOpen && (
                      <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl animate-in fade-in zoom-in-95 duration-150 z-50">
                        <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
                          Management Quick Links
                        </div>
                        <Link
                          href="/admin"
                          className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 transition-colors"
                        >
                          <LayoutDashboard className="h-4 w-4 text-slate-500" />
                          <span>Admin Dashboard</span>
                        </Link>
                        <Link
                          href="/admin/books"
                          className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 transition-colors"
                        >
                          <BookOpen className="h-4 w-4 text-indigo-600" />
                          <span>Book Inventory</span>
                        </Link>
                        <Link
                          href="/admin/loans"
                          className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 transition-colors"
                        >
                          <BookMarked className="h-4 w-4 text-indigo-600" />
                          <span>Circulation Desk</span>
                        </Link>
                        <Link
                          href="/admin/bookings"
                          className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 transition-colors"
                        >
                          <ClipboardList className="h-4 w-4 text-slate-500" />
                          <span>Seat Reservations</span>
                        </Link>
                        <Link
                          href="/admin/checkin"
                          className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 transition-colors"
                        >
                          <ScanLine className="h-4 w-4 text-slate-500" />
                          <span>Check-In Scanner</span>
                        </Link>
                        <Link
                          href="/admin/settings"
                          className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 transition-colors border-t border-slate-100 mt-1"
                        >
                          <Settings className="h-4 w-4 text-slate-500" />
                          <span>System Settings</span>
                        </Link>
                      </div>
                    )}
                  </div>
                </>
              )}
            </nav>
          )}

          {/* ── User Controls & Mobile Toggle ── */}
          <div className="flex items-center gap-2 shrink-0">
            {isLoading ? (
              <div className="h-8 w-20 animate-pulse rounded-full bg-slate-200" />
            ) : isAuthenticated && user ? (
              <div className="relative" ref={userMenuRef}>
                {/* User Pill Trigger */}
                <button
                  type="button"
                  onClick={() => setIsUserDropdownOpen((prev) => !prev)}
                  className="flex items-center gap-2 rounded-full border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all"
                >
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-extrabold text-white">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate max-w-[90px] sm:max-w-[120px] font-bold text-slate-900">
                    {user.name.split(" ")[0]}
                  </span>
                  <span className="hidden sm:inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-extrabold text-slate-600 uppercase border border-slate-200/60">
                    {user.role}
                  </span>
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </button>

                {/* User Dropdown */}
                {isUserDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-60 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl animate-in fade-in zoom-in-95 duration-150 z-50">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <div className="text-xs font-extrabold text-slate-900">{user.name}</div>
                      <div className="text-[11px] text-slate-400 font-medium truncate">{user.email}</div>
                      <span className="inline-block mt-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 text-[9px] font-extrabold uppercase">
                        {user.role}
                      </span>
                    </div>

                    <div className="py-1">
                      {isStudent && (
                        <>
                          <Link
                            href="/bookings"
                            className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                          >
                            <ClipboardList className="h-3.5 w-3.5 text-slate-500" />
                            <span>My Seat Bookings</span>
                          </Link>
                          <Link
                            href="/loans"
                            className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                          >
                            <Bookmark className="h-3.5 w-3.5 text-indigo-600" />
                            <span>My Borrowed Books</span>
                          </Link>
                        </>
                      )}

                      {canManage && (
                        <Link
                          href="/admin"
                          className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50"
                        >
                          <Shield className="h-3.5 w-3.5" />
                          <span>Admin Control Panel</span>
                        </Link>
                      )}
                    </div>

                    <div className="pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={logout}
                        className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/auth/login" className="pulse-button-secondary py-1.5 px-3 text-xs font-bold">
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Sign In</span>
                </Link>
                <Link href="/auth/register" className="pulse-button-primary py-1.5 px-3 text-xs font-bold">
                  <UserPlus className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Register</span>
                </Link>
              </div>
            )}

            {/* Mobile Hamburger Toggle Button (shown on < lg) */}
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                className="lg:hidden flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="Toggle navigation menu"
              >
                {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            )}
          </div>
        </div>

        {/* ── Slide-Down Mobile Drawer Menu (< lg screens) ── */}
        {isMobileMenuOpen && isAuthenticated && (
          <div className="lg:hidden border-t border-slate-200/80 bg-white/95 backdrop-blur-xl px-4 py-5 shadow-xl animate-in slide-in-from-top-2 duration-200">
            <div className="space-y-4">
              {/* Primary Services */}
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                  Library Services
                </div>
                <div className="grid grid-cols-1 gap-1">
                  <Link
                    href="/"
                    className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all ${
                      pathname === "/" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Home className="h-4 w-4" />
                      <span>Overview & Floor Status</span>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 opacity-60" />
                  </Link>

                  <Link
                    href="/book"
                    className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all ${
                      pathname === "/book" || pathname.startsWith("/book/") || pathname.startsWith("/zones")
                        ? "bg-slate-900 text-white"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Armchair className="h-4 w-4" />
                      <span>Reserve Study Seat</span>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 opacity-60" />
                  </Link>

                  <Link
                    href="/books"
                    className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all ${
                      pathname === "/books" || pathname.startsWith("/books/")
                        ? "bg-slate-900 text-white"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <BookOpen className="h-4 w-4" />
                      <span>Browse Books & Spatial Shelf</span>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 opacity-60" />
                  </Link>
                </div>
              </div>

              {/* Student Section */}
              {isStudent && (
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                    My Academic Activity
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    <Link
                      href="/bookings"
                      className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all ${
                        pathname === "/bookings" || pathname.startsWith("/bookings/")
                          ? "bg-slate-900 text-white"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <ClipboardList className="h-4 w-4" />
                        <span>My Seat Bookings & Passes</span>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 opacity-60" />
                    </Link>

                    <Link
                      href="/loans"
                      className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all ${
                        pathname === "/loans" || pathname.startsWith("/loans/")
                          ? "bg-slate-900 text-white"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Bookmark className="h-4 w-4 text-indigo-600" />
                        <span>My Borrowed Books & Renewals</span>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 opacity-60" />
                    </Link>
                  </div>
                </div>
              )}

              {/* Admin Section */}
              {canManage && (
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-indigo-600 mb-2">
                    Staff & Admin Controls
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href="/admin"
                      className="rounded-xl bg-slate-50 border border-slate-200 p-2.5 text-xs font-bold text-slate-800 hover:bg-indigo-50 hover:border-indigo-200 transition-all flex items-center gap-2"
                    >
                      <LayoutDashboard className="h-4 w-4 text-indigo-600 shrink-0" />
                      <span>Dashboard</span>
                    </Link>
                    <Link
                      href="/admin/books"
                      className="rounded-xl bg-slate-50 border border-slate-200 p-2.5 text-xs font-bold text-slate-800 hover:bg-indigo-50 hover:border-indigo-200 transition-all flex items-center gap-2"
                    >
                      <BookOpen className="h-4 w-4 text-indigo-600 shrink-0" />
                      <span>Inventory</span>
                    </Link>
                    <Link
                      href="/admin/loans"
                      className="rounded-xl bg-slate-50 border border-slate-200 p-2.5 text-xs font-bold text-slate-800 hover:bg-indigo-50 hover:border-indigo-200 transition-all flex items-center gap-2"
                    >
                      <BookMarked className="h-4 w-4 text-indigo-600 shrink-0" />
                      <span>Circulation</span>
                    </Link>
                    <Link
                      href="/admin/checkin"
                      className="rounded-xl bg-slate-50 border border-slate-200 p-2.5 text-xs font-bold text-slate-800 hover:bg-indigo-50 hover:border-indigo-200 transition-all flex items-center gap-2"
                    >
                      <ScanLine className="h-4 w-4 text-indigo-600 shrink-0" />
                      <span>QR Scanner</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── Mobile Bottom Navigation Bar (4-5 Clean Fixed Items) ── */}
      {isAuthenticated && !isLoading && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/95 backdrop-blur-xl border-t border-slate-200/90 px-3 py-2 flex items-center justify-around shadow-lg">
          <Link
            href="/"
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
              pathname === "/" ? "text-slate-900 font-extrabold" : "text-slate-400 font-semibold"
            }`}
          >
            <Home className={`h-4.5 w-4.5 ${pathname === "/" ? "text-slate-900" : "text-slate-400"}`} />
            <span className="text-[10px]">Home</span>
          </Link>

          <Link
            href="/book"
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
              pathname === "/book" || pathname.startsWith("/book/") || pathname.startsWith("/zones")
                ? "text-slate-900 font-extrabold"
                : "text-slate-400 font-semibold"
            }`}
          >
            <Armchair
              className={`h-4.5 w-4.5 ${
                pathname === "/book" || pathname.startsWith("/book/") || pathname.startsWith("/zones")
                  ? "text-slate-900"
                  : "text-slate-400"
              }`}
            />
            <span className="text-[10px]">Seats</span>
          </Link>

          <Link
            href="/books"
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
              pathname === "/books" || pathname.startsWith("/books/")
                ? "text-slate-900 font-extrabold"
                : "text-slate-400 font-semibold"
            }`}
          >
            <BookOpen
              className={`h-4.5 w-4.5 ${
                pathname === "/books" || pathname.startsWith("/books/") ? "text-slate-900" : "text-slate-400"
              }`}
            />
            <span className="text-[10px]">Books</span>
          </Link>

          {isStudent ? (
            <>
              <Link
                href="/loans"
                className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
                  pathname === "/loans" || pathname.startsWith("/loans/")
                    ? "text-slate-900 font-extrabold"
                    : "text-slate-400 font-semibold"
                }`}
              >
                <Bookmark
                  className={`h-4.5 w-4.5 ${
                    pathname === "/loans" || pathname.startsWith("/loans/") ? "text-slate-900" : "text-slate-400"
                  }`}
                />
                <span className="text-[10px]">Loans</span>
              </Link>

              <Link
                href="/bookings"
                className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
                  pathname === "/bookings" || pathname.startsWith("/bookings/")
                    ? "text-slate-900 font-extrabold"
                    : "text-slate-400 font-semibold"
                }`}
              >
                <ClipboardList
                  className={`h-4.5 w-4.5 ${
                    pathname === "/bookings" || pathname.startsWith("/bookings/")
                      ? "text-slate-900"
                      : "text-slate-400"
                  }`}
                />
                <span className="text-[10px]">Passes</span>
              </Link>
            </>
          ) : (
            <Link
              href="/admin"
              className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
                pathname.startsWith("/admin") ? "text-indigo-700 font-extrabold" : "text-slate-400 font-semibold"
              }`}
            >
              <Shield
                className={`h-4.5 w-4.5 ${pathname.startsWith("/admin") ? "text-indigo-700" : "text-slate-400"}`}
              />
              <span className="text-[10px]">Admin</span>
            </Link>
          )}
        </nav>
      )}
    </>
  );
}

export default Navbar;
