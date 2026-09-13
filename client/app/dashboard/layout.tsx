"use client";

import React from "react";
import { CalendarPlus } from "lucide-react";
import { AuthGuard } from "@/components/shared/auth-guard";
import { DashboardLayout } from "@/components/shared/dashboard/dashboard-layout";
import { RouteMeta } from "@/components/shared/dashboard/dashboard-topbar";
import { WORKSPACES } from "@/components/shared/dashboard/dashboard-nav";

const ROUTE_TITLES: Record<string, RouteMeta> = {
  "/dashboard": {
    title: "My Library",
    subtitle: "Reservations, borrowed books and dues at a glance",
    kicker: "OVERVIEW",
  },
  "/dashboard/bookings": {
    title: "My Bookings",
    subtitle: "Active seat passes, check-in QR codes and past reservations",
    kicker: "SEAT RESERVATIONS",
  },
  "/dashboard/loans": {
    title: "My Loans",
    subtitle: "Borrowed books, due dates, renewals and late fee statements",
    kicker: "BORROWED BOOKS",
  },
  "/dashboard/fines": {
    title: "Fines & Dues",
    subtitle: "Seat reservation fees and overdue book fees, settled at the desk",
    kicker: "ACCOUNT DUES",
  },
  "/dashboard/reports": {
    title: "My Reports",
    subtitle: "What you reported to the library, and what came of it",
    kicker: "MEMBER REPORTS",
  },
  "/dashboard/waivers": {
    title: "Fine Waivers",
    subtitle: "Petition an administrator to clear a student's outstanding fine",
    kicker: "FACULTY PRIVILEGE",
  },
  "/dashboard/suggestions": {
    title: "Book Recommendations",
    subtitle: "Recommend new volumes for the library collection and upvote faculty submissions",
    kicker: "FACULTY RECOMMENDATIONS",
  },
  "/dashboard/profile": {
    title: "Profile & Security",
    subtitle: "Account details, email address and password",
    kicker: "MY ACCOUNT",
  },
};

const FALLBACK_META: RouteMeta = {
  title: "My Library",
  subtitle: "Your reservations, loans and account",
  kicker: "MY ACCOUNT",
};

export default function StudentDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <DashboardLayout
        workspace={WORKSPACES.student}
        breadcrumbRoot="MY LIBRARY"
        routeTitles={ROUTE_TITLES}
        fallbackMeta={FALLBACK_META}
        quickAction={{ href: "/book", label: "Reserve a Seat", icon: CalendarPlus }}
      >
        {children}
      </DashboardLayout>
    </AuthGuard>
  );
}
