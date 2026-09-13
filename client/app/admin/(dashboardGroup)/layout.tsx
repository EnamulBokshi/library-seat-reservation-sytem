"use client";

import React from "react";
import { ScanLine } from "lucide-react";
import { AuthGuard } from "@/components/shared/auth-guard";
import { DashboardLayout } from "@/components/shared/dashboard/dashboard-layout";
import { RouteMeta } from "@/components/shared/dashboard/dashboard-topbar";
import { WORKSPACES } from "@/components/shared/dashboard/dashboard-nav";

const ROUTE_TITLES: Record<string, RouteMeta> = {
  "/admin": {
    title: "Executive Dashboard",
    subtitle: "Real-time library occupancy, daily session stats, and system telemetry",
    kicker: "OVERVIEW & ANALYTICS",
  },
  "/admin/books": {
    title: "Book Inventory",
    subtitle: "Catalogue records, copies, and shelf locations",
    kicker: "CATALOGUE",
  },
  "/admin/loans": {
    title: "Circulation Desk",
    subtitle: "Issue, return, renew, and settle overdue fines",
    kicker: "CIRCULATION",
  },
  "/admin/bookings": {
    title: "All Bookings & Passes",
    subtitle: "Comprehensive ledger of student seat reservations and attendance records",
    kicker: "RESERVATION LEDGER",
  },
  "/admin/fines": {
    title: "Fines & Revenue Ledger",
    subtitle: "Manage, collect, and waive student penalties across seat bookings and overdue loans",
    kicker: "FINES & REVENUE",
  },
  "/admin/waivers": {
    title: "Fine Waiver Requests",
    subtitle: "Faculty petitions to clear a student's outstanding fine",
    kicker: "WAIVER QUEUE",
  },
  "/admin/approvals": {
    title: "Account Approvals",
    subtitle: "Faculty signups waiting for a decision",
    kicker: "ACCESS CONTROL",
  },
  "/admin/checkin": {
    title: "QR Code Check-In Scanner",
    subtitle: "Live entrance camera verification and manual pass validation terminal",
    kicker: "ENTRANCE TERMINAL",
  },
  "/admin/schedules": {
    title: "Schedules & Time Slot Control",
    subtitle: "Daily slot availability, session operating hours, and holiday closures",
    kicker: "CALENDAR & SLOTS",
  },
  "/admin/zones": {
    title: "Zones & Capacity Planning",
    subtitle: "Study halls, quiet zones, and seat inventory management",
    kicker: "ZONE MANAGEMENT",
  },
  "/admin/settings": {
    title: "System Configuration",
    subtitle: "Global operating hours, grace period rules, and advance booking window",
    kicker: "SYSTEM PARAMETERS",
  },
};

const FALLBACK_META: RouteMeta = {
  title: "Admin Portal",
  subtitle: "Smart Library management console",
  kicker: "ADMINISTRATION",
};

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={["admin", "librarian", "super_admin"]}>
      <DashboardLayout
        workspace={WORKSPACES.admin}
        breadcrumbRoot="ADMIN"
        routeTitles={ROUTE_TITLES}
        fallbackMeta={FALLBACK_META}
        quickAction={{ href: "/admin/checkin", label: "Scan QR Pass", icon: ScanLine }}
      >
        {children}
      </DashboardLayout>
    </AuthGuard>
  );
}
