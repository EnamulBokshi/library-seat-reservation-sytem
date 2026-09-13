"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, ChevronRight, ExternalLink, X } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { DashboardWorkspace, NavTabItem, visibleTabs } from "./dashboard-nav";
import { UserMenu } from "./user-menu";

interface DashboardSidebarProps {
  workspace: DashboardWorkspace;
  isOpen?: boolean;
  onClose?: () => void;
}

export function DashboardSidebar({ workspace, isOpen, onClose }: DashboardSidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const tabs = visibleTabs(workspace, user?.role);

  const isTabActive = (item: NavTabItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <>
      {/* ── Mobile Backdrop Overlay ── */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden animate-in fade-in duration-200"
        />
      )}

      {/* ── Sidebar Container ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-72 shrink-0 flex-col justify-between overflow-y-auto border-r border-slate-200/80 bg-[#f8f9fa]/95 p-4 backdrop-blur-xl transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:translate-x-0 ${
          isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:shadow-none"
        }`}
      >
        {/* Top Branding Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2 pt-2">
            <Link href={workspace.homeHref} className="group flex items-center gap-2.5" onClick={onClose}>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm transition-colors group-hover:bg-slate-800">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <span className="block text-base font-black leading-tight tracking-tight text-slate-900">
                  Smart Library
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-slate-900/5 px-2 py-0.2 text-[9px] font-extrabold uppercase tracking-wider text-slate-600">
                  {workspace.portalLabel}
                </span>
              </div>
            </Link>

            {/* Mobile close button */}
            {onClose && (
              <button
                onClick={onClose}
                className="rounded-xl p-1.5 text-slate-400 transition-colors hover:bg-slate-200/60 hover:text-slate-700 lg:hidden"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Navigation Tabs List */}
          <nav className="space-y-1.5 px-1">
            <p className="px-3 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              {workspace.sectionLabel}
            </p>

            {tabs.map((item) => {
              const active = isTabActive(item);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  aria-current={active ? "page" : undefined}
                  className={`group relative flex items-center justify-between rounded-2xl px-3.5 py-2.5 text-xs font-bold transition-all duration-200 ${
                    active
                      ? "bg-slate-900 font-black text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`h-4 w-4 shrink-0 transition-colors ${
                        active ? "text-white" : "text-slate-400 group-hover:text-slate-900"
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {active ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  ) : item.badge ? (
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-extrabold text-slate-700">
                      {item.badge}
                    </span>
                  ) : (
                    <ChevronRight className="h-3 w-3 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* ── Bottom Section: cross-link + advance user menu ── */}
        <div className="space-y-3 border-t border-slate-200/60 px-1 pt-4">
          <Link
            href={workspace.switchLink.href}
            onClick={onClose}
            className="group flex items-center justify-between rounded-xl px-3 py-2 text-[11px] font-bold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-900" />
              <span>{workspace.switchLink.label}</span>
            </span>
            <span className="text-[10px] font-extrabold text-slate-400">&rsaquo;</span>
          </Link>

          <UserMenu placement="top" variant="card" />
        </div>
      </aside>
    </>
  );
}

export default DashboardSidebar;
