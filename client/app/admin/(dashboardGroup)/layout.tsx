"use client";

import React, { useState } from "react";
import { AuthGuard } from "@/components/shared/auth-guard";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <AuthGuard allowedRoles={["admin", "librarian", "super_admin"]}>
      <div className="flex min-h-screen bg-[#f4f5f7] text-slate-900 selection:bg-slate-900 selection:text-white font-sans">
        {/* ── Vertical Left Sidebar ── */}
        <AdminSidebar
          isOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
        />

        {/* ── Main Layout Column ── */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Top Bar with Breadcrumbs & Live Time */}
          <AdminTopbar
            onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
          />

          {/* Main Content Viewport */}
          <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="mx-auto max-w-7xl">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
