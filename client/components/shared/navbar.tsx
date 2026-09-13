"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { UserMenu } from "@/components/shared/dashboard/user-menu"
import { isSelfServiceRole } from "@/lib/roles"
import { useNavBadges } from "@/hooks/use-nav-badges"
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
  Megaphone,
} from "lucide-react"

interface NavLinkProps {
  href: string
  icon: React.ElementType
  label: string
  active: boolean
  /** Unread count pinned to the top-right corner; 0 renders nothing. */
  badgeCount?: number
}

function NavLink({
  href,
  icon: Icon,
  label,
  active,
  badgeCount = 0,
}: NavLinkProps) {
  const badgeText = badgeCount > 99 ? "99+" : String(badgeCount)

  return (
    <Link
      href={href}
      className={`relative flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-all ${
        active
          ? "border border-slate-200/90 bg-white font-extrabold text-slate-900 shadow-2xs"
          : "text-slate-500 hover:bg-white/60 hover:text-slate-900"
      }`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="whitespace-nowrap">{label}</span>

      {badgeCount > 0 && (
        <span
          aria-label={`${badgeText} new`}
          className="absolute -top-1 -right-1 min-w-[17px] rounded-full bg-rose-500 px-1 text-center text-[9px] leading-[17px] font-extrabold text-white tabular-nums shadow-2xs ring-2 ring-[#efeff1]"
        >
          {badgeText}
        </span>
      )}
    </Link>
  )
}

function NavSeparator() {
  return (
    <span className="mx-1 h-3.5 w-px shrink-0 rounded-full bg-slate-300/60" />
  )
}

export function Navbar() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const pathname = usePathname()
  const isAdmin = user?.role === "admin" || user?.role === "super_admin"
  const isLibrarian = user?.role === "librarian"
  const isStudent = isSelfServiceRole(user?.role)
  const { counts } = useNavBadges()
  const canManage = isAdmin || isLibrarian

  const isBookSeatActive =
    pathname === "/book" ||
    pathname.startsWith("/book/") ||
    pathname.startsWith("/zones")
  const isCatalogActive =
    pathname === "/books" || pathname.startsWith("/books/")
  const isDashboardActive =
    pathname.startsWith("/dashboard") || pathname.startsWith("/bookings/")
  const isNoticesActive = pathname.startsWith("/notice")
  const isCheckinActive = pathname.startsWith("/admin/checkin")
  const isAdminActive = pathname.startsWith("/admin") && !isCheckinActive

  // Dashboard routes render their own sidebar shell and the auth pages render a
  // full-bleed split screen, so the public navbar stays out of both.
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/auth")
  ) {
    return null
  }

  return (
    <>
      {/* ── Top Navbar ── */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-[#f4f5f7]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-2.5 sm:gap-4 sm:px-6">
          {/* Brand Logo */}
          <Link href="/" className="group flex shrink-0 items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 shadow-2xs transition-colors group-hover:bg-slate-800">
              <Activity className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-base font-extrabold tracking-tight whitespace-nowrap text-slate-900">
              Smart Library
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          {isAuthenticated && !isLoading && (
            <nav className="hidden shrink-0 items-center gap-1 rounded-full border border-slate-200/70 bg-[#efeff1] p-1 lg:flex">
              <NavLink
                href="/"
                icon={Home}
                label="Overview"
                active={pathname === "/"}
              />
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
              <NavLink
                href="/notice"
                icon={Megaphone}
                label="Notices"
                active={isNoticesActive}
                badgeCount={counts.newAnnouncements}
              />

              {/* Staff / Admin Shortcuts (Clean & Non-Breaking) */}
              {canManage && (
                <>
                  <NavSeparator />
                  <Link
                    href="/admin/checkin"
                    className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-all ${
                      isCheckinActive
                        ? "border border-slate-200/90 bg-white font-extrabold text-slate-900 shadow-2xs"
                        : "text-slate-600 hover:bg-white/60 hover:text-slate-900"
                    }`}
                  >
                    <ScanLine className="h-3.5 w-3.5 shrink-0 text-indigo-600" />
                    <span>Scan QR</span>
                  </Link>
                </>
              )}
            </nav>
          )}

          {/* User Controls */}
          <div className="flex shrink-0 items-center gap-2">
            {isLoading ? (
              <div className="h-8 w-20 animate-pulse rounded-full bg-slate-200" />
            ) : isAuthenticated && user ? (
              /* Dashboard and sign-out both live in the advance user menu. */
              <UserMenu placement="bottom" variant="pill" />
            ) : (
              <div className="flex items-center gap-2 whitespace-nowrap">
                <Link
                  href="/auth/login"
                  className="pulse-button-secondary px-3 py-1.5 text-xs"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Sign In</span>
                </Link>
                <Link
                  href="/auth/register"
                  className="pulse-button-primary px-3 py-1.5 text-xs"
                >
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
        <nav className="fixed right-0 bottom-0 left-0 z-50 flex items-center justify-around border-t border-slate-200/90 bg-white/95 px-2 py-2 shadow-lg backdrop-blur-xl lg:hidden">
          <Link
            href="/"
            className={`flex flex-col items-center gap-1 rounded-xl px-2.5 py-1 transition-all ${
              pathname === "/"
                ? "font-extrabold text-slate-900"
                : "font-medium text-slate-400"
            }`}
          >
            <Home
              className={`h-4.5 w-4.5 ${pathname === "/" ? "text-slate-900" : "text-slate-400"}`}
            />
            <span className="text-[10px] whitespace-nowrap">Home</span>
          </Link>

          <Link
            href="/book"
            className={`flex flex-col items-center gap-1 rounded-xl px-2.5 py-1 transition-all ${
              isBookSeatActive
                ? "font-extrabold text-slate-900"
                : "font-medium text-slate-400"
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
            className={`flex flex-col items-center gap-1 rounded-xl px-2.5 py-1 transition-all ${
              isCatalogActive
                ? "font-extrabold text-slate-900"
                : "text-slate-400"
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
              className={`flex flex-col items-center gap-1 rounded-xl px-2.5 py-1 transition-all ${
                isDashboardActive
                  ? "font-extrabold text-slate-900"
                  : "text-slate-400"
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
                className={`flex flex-col items-center gap-1 rounded-xl px-2.5 py-1 transition-all ${
                  isCheckinActive
                    ? "font-extrabold text-indigo-600"
                    : "font-medium text-slate-400"
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
                className={`flex flex-col items-center gap-1 rounded-xl px-2.5 py-1 transition-all ${
                  isAdminActive
                    ? "font-extrabold text-slate-900"
                    : "text-slate-400"
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
  )
}

export default Navbar
