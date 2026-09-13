import React from "react";
import { AuthGuard } from "@/components/shared/auth-guard";
import { DashboardShell } from "@/components/pages/dashboard/dashboard-shell";

export const metadata = {
  title: "My Dashboard | Smart Library",
  description: "Reservations, loans, fines and account settings",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <DashboardShell>{children}</DashboardShell>
    </AuthGuard>
  );
}
