"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import {
  BookOpen, LogOut, User as UserIcon, LogIn, UserPlus,
  MapPin, ClipboardList, ScanLine, Home, Shield, Settings, Activity, Search, Calendar, Armchair
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
      className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${active
          ? "bg-white text-slate-900 shadow-2xs border border-slate-200/80 font-bold"
          : "text-slate-500 hover:text-slate-900 hover:bg-white/60"
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

  const isAdmin = user?.role === "admin";
  const isLibrarian = user?.role === "librarian";
  const isStudent = user?.role === "student";
  const canManage = isAdmin || isLibrarian;

  // Do not render student/public navbar on dedicated admin dashboard pages
  if (pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <>
      {/* ── Top Navbar ── */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-[#f4f5f7]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 py-3">

          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 shadow-2xs group-hover:bg-slate-800 transition-colors">
              <Activity className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-base font-extrabold tracking-tight text-slate-900">
              Smart Library
            </span>
          </Link>

          {/* Desktop Navigation Links (hidden on mobile, shown on md+) */}
          {isAuthenticated && !isLoading && (
            <nav className="hidden md:flex items-center gap-1 rounded-full bg-[#efeff1] p-1 border border-slate-200/60">
              <NavLink href="/" icon={Home} label="Overview" active={pathname === "/"} />
              <NavLink href="/book" icon={Armchair} label="Book Seat" active={pathname.startsWith("/book") || pathname.startsWith("/zones")} />

              {isStudent && (
                <>
                  <NavSeparator />
                  <NavLink
                    href="/bookings"
                    icon={ClipboardList}
                    label="My Bookings"
                    active={pathname.startsWith("/bookings")}
                  />
                </>
              )}

              {canManage && (
                <>
                  <NavSeparator />
                  <NavLink
                    href="/admin/bookings"
                    icon={ClipboardList}
                    label="All Bookings"
                    active={pathname.startsWith("/admin/bookings")}
                  />
                  <NavLink
                    href="/admin/checkin"
                    icon={ScanLine}
                    label="Check-In"
                    active={pathname.startsWith("/admin/checkin")}
                  />
                  <NavLink
                    href="/admin/schedules"
                    icon={Calendar}
                    label="Schedules"
                    active={pathname.startsWith("/admin/schedules")}
                  />
                  <NavLink
                    href="/admin/settings"
                    icon={Settings}
                    label="Settings"
                    active={pathname.startsWith("/admin/settings")}
                  />
                </>
              )}
            </nav>
          )}

          {/* User Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {isLoading ? (
              <div className="h-8 w-20 animate-pulse rounded-full bg-slate-200" />
            ) : isAuthenticated && user ? (
              <div className="flex items-center gap-2">
                {/* User Pill */}
                <div className="flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-2xs">
                  <UserIcon className="h-3.5 w-3.5 text-slate-900 shrink-0" />
                  <span className="truncate max-w-[100px] sm:max-w-[140px] font-bold">{user.name}</span>
                  <span className="hidden sm:inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-600 uppercase border border-slate-200/60">
                    {user.role}
                  </span>
                </div>
                {/* Logout */}
                <button
                  onClick={logout}
                  className="flex items-center gap-1 rounded-full border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                  title="Logout"
                >
                  <LogOut className="h-3.5 w-3.5 text-slate-600" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
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

      {/* ── Mobile Bottom Navigation Bar (Visible on screens < md) ── */}
      {isAuthenticated && !isLoading && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/95 backdrop-blur-xl border-t border-slate-200/90 px-2 py-2 flex items-center justify-around shadow-lg">
          <Link
            href="/"
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${pathname === "/" ? "text-slate-900 font-extrabold" : "text-slate-400 font-medium"
              }`}
          >
            <Home className={`h-5 w-5 ${pathname === "/" ? "text-slate-900" : "text-slate-400"}`} />
            <span className="text-[10px]">Home</span>
          </Link>

          <Link
            href="/book"
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${pathname.startsWith("/book") || pathname.startsWith("/zones") ? "text-slate-900 font-extrabold" : "text-slate-400 font-medium"
              }`}
          >
            <Armchair className={`h-5 w-5 ${pathname.startsWith("/book") || pathname.startsWith("/zones") ? "text-slate-900" : "text-slate-400"}`} />
            <span className="text-[10px]">Book</span>
          </Link>

          {isStudent && (
            <Link
              href="/bookings"
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${pathname.startsWith("/bookings") ? "text-slate-900 font-extrabold" : "text-slate-400 font-medium"
                }`}
            >
              <ClipboardList className={`h-5 w-5 ${pathname.startsWith("/bookings") ? "text-slate-900" : "text-slate-400"}`} />
              <span className="text-[10px]">Bookings</span>
            </Link>
          )}

          {canManage && (
            <>
              <Link
                href="/admin/bookings"
                className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${pathname.startsWith("/admin/bookings") ? "text-slate-900 font-extrabold" : "text-slate-400 font-medium"
                  }`}
              >
                <ClipboardList className={`h-5 w-5 ${pathname.startsWith("/admin/bookings") ? "text-slate-900" : "text-slate-400"}`} />
                <span className="text-[10px]">Bookings</span>
              </Link>
              <Link
                href="/admin/checkin"
                className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${pathname.startsWith("/admin/checkin") ? "text-slate-900 font-extrabold" : "text-slate-400 font-medium"
                  }`}
              >
                <ScanLine className={`h-5 w-5 ${pathname.startsWith("/admin/checkin") ? "text-slate-900" : "text-slate-400"}`} />
                <span className="text-[10px]">Scan QR</span>
              </Link>
              <Link
                href="/admin/schedules"
                className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${pathname.startsWith("/admin/schedules") ? "text-slate-900 font-extrabold" : "text-slate-400 font-medium"
                  }`}
              >
                <Calendar className={`h-5 w-5 ${pathname.startsWith("/admin/schedules") ? "text-slate-900" : "text-slate-400"}`} />
                <span className="text-[10px]">Schedules</span>
              </Link>
              <Link
                href="/admin/settings"
                className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${pathname.startsWith("/admin/settings") ? "text-slate-900 font-extrabold" : "text-slate-400 font-medium"
                  }`}
              >
                <Settings className={`h-5 w-5 ${pathname.startsWith("/admin/settings") ? "text-slate-900" : "text-slate-400"}`} />
                <span className="text-[10px]">Settings</span>
              </Link>
            </>
          )}
        </nav>
      )}
    </>
  );
}

export default Navbar;


