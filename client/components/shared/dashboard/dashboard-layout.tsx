"use client";

import React, { useState } from "react";
import { DashboardWorkspace } from "./dashboard-nav";
import { DashboardSidebar } from "./dashboard-sidebar";
import { DashboardTopbar, RouteMeta, TopbarQuickAction } from "./dashboard-topbar";

interface DashboardLayoutProps {
  workspace: DashboardWorkspace;
  breadcrumbRoot: string;
  routeTitles: Record<string, RouteMeta>;
  fallbackMeta: RouteMeta;
  quickAction?: TopbarQuickAction;
  children: React.ReactNode;
}

/**
 * Sidebar + topbar shell shared by the admin console and the student dashboard.
 * The two differ only in the workspace config passed in; role-based access is
 * enforced by the AuthGuard in each route's layout and by the API itself.
 */
export function DashboardLayout({
  workspace,
  breadcrumbRoot,
  routeTitles,
  fallbackMeta,
  quickAction,
  children,
}: DashboardLayoutProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f5f7] font-sans text-slate-900 selection:bg-slate-900 selection:text-white">
      {/* ── Fixed / Stationary Left Sidebar ── */}
      <DashboardSidebar
        workspace={workspace}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* ── Independently Scrollable Main Layout Column ── */}
      <div className="flex h-screen min-w-0 flex-1 flex-col overflow-y-auto">
        <DashboardTopbar
          breadcrumbRoot={breadcrumbRoot}
          routeTitles={routeTitles}
          fallbackMeta={fallbackMeta}
          quickAction={quickAction}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
        />

        {/* Main Content Viewport */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
