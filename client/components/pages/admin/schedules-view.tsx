"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { scheduleService } from "@/services/schedule-service";
import { settingService } from "@/services/setting-service";
import {
  Schedule,
  SlotType,
  SlotConfig,
  DEFAULT_SLOT_CONFIG,
  BulkToggleSchedulePayload,
  ApiError,
} from "@/lib/types";
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  Loader2,
  CalendarDays,
  Check,
  X,
  Plus,
  ArrowRight,
  ShieldCheck,
  Power,
  Users,
  Layers,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

const ALL_SLOTS: SlotType[] = ["morning", "noon", "afternoon", "evening"];

export function SchedulesView() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [slotConfig, setSlotConfig] = useState<SlotConfig>(DEFAULT_SLOT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter state
  const [daysFilter, setDaysFilter] = useState<number>(14);
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  // Action states
  const [togglingSlotId, setTogglingSlotId] = useState<string | null>(null);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Bulk modal form state
  const [bulkStartDate, setBulkStartDate] = useState<string>("");
  const [bulkEndDate, setBulkEndDate] = useState<string>("");
  const [bulkSelectedSlots, setBulkSelectedSlots] = useState<SlotType[]>([
    "morning",
    "noon",
    "afternoon",
    "evening",
  ]);
  const [bulkIsOpen, setBulkIsOpen] = useState<boolean>(false);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState<boolean>(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  // ── Fetch Schedules & Config ──────────────────────────────────────────────
  const fetchSchedules = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];

      let startDate = todayStr;
      let endDate: string | undefined;

      if (customStartDate && customEndDate) {
        startDate = customStartDate;
        endDate = customEndDate;
      } else {
        const future = new Date(now);
        future.setDate(now.getDate() + daysFilter);
        endDate = future.toISOString().split("T")[0];
      }

      const [schedulesRes, configRes] = await Promise.allSettled([
        scheduleService.getAdminSchedules({ startDate, endDate }),
        settingService.getPublicConfig(),
      ]);

      if (schedulesRes.status === "fulfilled") {
        setSchedules(schedulesRes.value.data ?? []);
      } else {
        const err = schedulesRes.reason as ApiError;
        setError(err?.message ?? "Failed to load schedules.");
      }

      if (configRes.status === "fulfilled" && configRes.value.data?.slotConfig) {
        setSlotConfig(configRes.value.data.slotConfig);
      }
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setError(apiErr?.message ?? "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [daysFilter, customStartDate, customEndDate]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // Set default dates for bulk modal when opened
  useEffect(() => {
    if (isBulkModalOpen && !bulkStartDate) {
      const todayStr = new Date().toISOString().split("T")[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 7);
      setBulkStartDate(todayStr);
      setBulkEndDate(tomorrow.toISOString().split("T")[0]);
    }
  }, [isBulkModalOpen, bulkStartDate]);

  // ── Toggle Individual Slot ────────────────────────────────────────────────
  const handleToggleSlot = async (scheduleId: string, currentIsOpen: boolean) => {
    setTogglingSlotId(scheduleId);
    setSuccessMessage(null);
    setError(null);

    const newIsOpen = !currentIsOpen;

    // Optimistic UI update
    setSchedules((prev) =>
      prev.map((s) => (s.id === scheduleId ? { ...s, isOpen: newIsOpen } : s))
    );

    try {
      await scheduleService.toggle(scheduleId, newIsOpen);
      setSuccessMessage(`Schedule slot marked as ${newIsOpen ? "OPEN" : "CLOSED"}.`);
    } catch (err: unknown) {
      // Revert on error
      setSchedules((prev) =>
        prev.map((s) => (s.id === scheduleId ? { ...s, isOpen: currentIsOpen } : s))
      );
      const apiErr = err as ApiError;
      setError(apiErr?.message ?? "Failed to update slot status.");
    } finally {
      setTogglingSlotId(null);
    }
  };

  // ── Quick Toggle Entire Day ───────────────────────────────────────────────
  const handleToggleDay = async (dateStr: string, setOpen: boolean) => {
    setError(null);
    setSuccessMessage(null);

    // Optimistic UI update
    setSchedules((prev) =>
      prev.map((s) => {
        const sDate = new Date(s.date).toISOString().split("T")[0];
        return sDate === dateStr ? { ...s, isOpen: setOpen } : s;
      })
    );

    try {
      await scheduleService.bulkToggle({
        dates: [dateStr],
        slots: ALL_SLOTS,
        isOpen: setOpen,
      });
      setSuccessMessage(
        `All slots for ${new Date(dateStr).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        })} marked as ${setOpen ? "OPEN" : "CLOSED"}.`
      );
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setError(apiErr?.message ?? "Failed to update day schedules.");
      fetchSchedules();
    }
  };

  // ── Bulk Toggle Submit ────────────────────────────────────────────────────
  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkStartDate) {
      setBulkError("Please select a start date.");
      return;
    }
    if (bulkSelectedSlots.length === 0) {
      setBulkError("Please select at least one time slot.");
      return;
    }

    setBulkError(null);
    setIsBulkSubmitting(true);

    try {
      const payload: BulkToggleSchedulePayload = {
        startDate: bulkStartDate,
        endDate: bulkEndDate || bulkStartDate,
        slots: bulkSelectedSlots,
        isOpen: bulkIsOpen,
      };

      const res = await scheduleService.bulkToggle(payload);
      setSuccessMessage(res.data?.message ?? "Bulk schedule update applied successfully.");
      setIsBulkModalOpen(false);
      fetchSchedules();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setBulkError(apiErr?.message ?? "Failed to apply bulk update.");
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  // ── Proactive Generate Schedules ──────────────────────────────────────────
  const handleGenerate = async (days: number) => {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await scheduleService.generate(days);
      setSuccessMessage(res.data?.message ?? `Generated schedules for next ${days} days.`);
      fetchSchedules();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setError(apiErr?.message ?? "Failed to generate schedules.");
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Group Schedules By Date ───────────────────────────────────────────────
  const groupedSchedules = useMemo(() => {
    const map = new Map<string, Schedule[]>();
    schedules.forEach((s) => {
      const dateStr = new Date(s.date).toISOString().split("T")[0];
      if (!map.has(dateStr)) {
        map.set(dateStr, []);
      }
      map.get(dateStr)!.push(s);
    });

    return Array.from(map.entries()).map(([dateStr, items]) => {
      const dateObj = new Date(`${dateStr}T00:00:00.000Z`);
      const totalBookings = items.reduce((acc, curr) => acc + (curr._count?.bookings ?? 0), 0);
      const openCount = items.filter((i) => i.isOpen).length;
      const closedCount = items.filter((i) => !i.isOpen).length;

      return {
        dateStr,
        dateObj,
        items,
        totalBookings,
        openCount,
        closedCount,
      };
    });
  }, [schedules]);

  // ── Summary Metrics ───────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const totalSlots = schedules.length;
    const openSlots = schedules.filter((s) => s.isOpen).length;
    const closedSlots = schedules.filter((s) => !s.isOpen).length;
    const totalBookings = schedules.reduce((acc, curr) => acc + (curr._count?.bookings ?? 0), 0);
    return {
      totalDays: groupedSchedules.length,
      totalSlots,
      openSlots,
      closedSlots,
      totalBookings,
    };
  }, [schedules, groupedSchedules]);

  return (
    <div className="space-y-6 pb-12">
      {/* ── Header Section ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="kicker-label">ADMINISTRATION &rsaquo; SCHEDULES & TIME SLOTS</p>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">
              Schedule Management
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500 font-medium">
              Configure daily operating time slots, toggle slot availability, and schedule library holiday closures
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="pulse-button-secondary py-2 px-3 text-xs"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>Bulk Actions</span>
            </button>

            <button
              onClick={() => handleGenerate(14)}
              disabled={isGenerating}
              className="pulse-button-secondary py-2 px-3 text-xs"
              title="Generate schedule slots for next 14 days"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 text-amber-500" />
              )}
              <span>Auto-Generate (14d)</span>
            </button>

            <button
              onClick={fetchSchedules}
              disabled={isLoading}
              className="pulse-button-primary py-2 px-3 text-xs"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* ── Alerts ── */}
        {error && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-700 animate-in fade-in">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span className="flex-1">{error}</span>
            <button
              onClick={() => setError(null)}
              className="rounded-lg p-1 hover:bg-rose-100 text-rose-500 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800 animate-in fade-in">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            <span className="flex-1">{successMessage}</span>
            <button
              onClick={() => setSuccessMessage(null)}
              className="rounded-lg p-1 hover:bg-emerald-100 text-emerald-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ── Metrics Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="pulse-card p-4 flex items-center gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 border border-slate-200/60 shrink-0">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Days in View
              </span>
              <p className="text-xl font-black text-slate-900 mt-0.5">{metrics.totalDays}</p>
            </div>
          </div>

          <div className="pulse-card p-4 flex items-center gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Open Slots
              </span>
              <p className="text-xl font-black text-emerald-700 mt-0.5">{metrics.openSlots}</p>
            </div>
          </div>

          <div className="pulse-card p-4 flex items-center gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-700 border border-rose-100 shrink-0">
              <XCircle className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Closed / Holiday
              </span>
              <p className="text-xl font-black text-rose-700 mt-0.5">{metrics.closedSlots}</p>
            </div>
          </div>

          <div className="pulse-card p-4 flex items-center gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Active Bookings
              </span>
              <p className="text-xl font-black text-indigo-700 mt-0.5">{metrics.totalBookings}</p>
            </div>
          </div>
        </div>

        {/* ── Date Filters & Quick Config Link ── */}
        <div className="pulse-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mr-1">
              Time Horizon:
            </span>
            {[7, 14, 30].map((days) => (
              <button
                key={days}
                onClick={() => {
                  setCustomStartDate("");
                  setCustomEndDate("");
                  setDaysFilter(days);
                }}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                  daysFilter === days && !customStartDate
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Next {days} Days
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span>Need to change operating hours?</span>
            <Link
              href="/admin/settings"
              className="text-slate-900 font-extrabold underline hover:text-indigo-600 transition-colors inline-flex items-center gap-1"
            >
              Operating Hours Config &rsaquo;
            </Link>
          </div>
        </div>

        {/* ── Schedules Day Cards ── */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
              Loading schedules...
            </p>
          </div>
        ) : groupedSchedules.length === 0 ? (
          <div className="pulse-card p-12 text-center space-y-3">
            <Calendar className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="text-base font-extrabold text-slate-900">No Schedules Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              There are no schedule records for the selected date range. Click below to automatically generate them.
            </p>
            <button
              onClick={() => handleGenerate(14)}
              className="pulse-button-primary mt-2"
            >
              <Sparkles className="h-4 w-4" />
              <span>Generate 14 Days</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedSchedules.map((group) => {
              const todayStr = new Date().toISOString().split("T")[0];
              const isToday = group.dateStr === todayStr;
              const isPastDay = group.dateStr < todayStr;
              const formattedWeekday = group.dateObj.toLocaleDateString(undefined, {
                weekday: "long",
              });
              const formattedFullDate = group.dateObj.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              });

              return (
                <div
                  key={group.dateStr}
                  className={`pulse-card p-5 transition-all ${
                    isToday ? "ring-2 ring-slate-900/20 bg-white" : "bg-white/80"
                  }`}
                >
                  {/* Day Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 font-black text-xs">
                        {group.dateObj.getDate()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                            {formattedWeekday}, {formattedFullDate}
                          </h3>
                          {isToday && (
                            <span className="rounded-full bg-slate-900 text-white px-2 py-0.5 text-[10px] font-black uppercase">
                              Today
                            </span>
                          )}
                          {isPastDay && (
                            <span className="rounded-full bg-slate-100 text-slate-500 px-2 py-0.5 text-[10px] font-bold uppercase">
                              Past Date
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium">
                          {group.openCount} open / {group.closedCount} closed slot(s) &bull;{" "}
                          <span className="font-bold text-slate-700">
                            {group.totalBookings} active reservation(s)
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Quick Day Controls */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleToggleDay(group.dateStr, true)}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-colors"
                        title="Open all 4 slots for this date"
                      >
                        Open Day
                      </button>
                      <button
                        onClick={() => handleToggleDay(group.dateStr, false)}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 transition-colors"
                        title="Close all 4 slots for this date (Holiday / Maintenance)"
                      >
                        Close Day
                      </button>
                    </div>
                  </div>

                  {/* 4 Slot Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {group.items.map((schedule) => {
                      const slotKey = schedule.slot;
                      const detail = slotConfig[slotKey] ?? DEFAULT_SLOT_CONFIG[slotKey];
                      const isToggling = togglingSlotId === schedule.id;
                      const isOpen = !!schedule.isOpen;
                      const bookingsCount = schedule._count?.bookings ?? 0;

                      return (
                        <div
                          key={schedule.id}
                          className={`rounded-2xl border p-3.5 transition-all flex flex-col justify-between gap-3 ${
                            isOpen
                              ? "bg-slate-50/70 border-slate-200 hover:border-slate-300"
                              : "bg-rose-50/40 border-rose-200/70 opacity-80"
                          }`}
                        >
                          {/* Slot Header */}
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-base">{detail?.icon ?? "⏱️"}</span>
                                <span className="text-xs font-black capitalize text-slate-900">
                                  {detail?.label ?? slotKey}
                                </span>
                              </div>

                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold border ${
                                  isOpen
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                    : "bg-rose-100/70 border-rose-200 text-rose-700"
                                }`}
                              >
                                {isOpen ? "OPEN" : "CLOSED"}
                              </span>
                            </div>

                            {/* Timing */}
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                              <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span>
                                {detail?.startTime ?? "00:00"} &ndash; {detail?.endTime ?? "00:00"}
                              </span>
                            </div>

                            {/* Bookings Count */}
                            <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-600 font-bold">
                              <Users className="h-3 w-3 text-slate-400 shrink-0" />
                              <span>{bookingsCount} student pass(es)</span>
                            </div>
                          </div>

                          {/* Toggle Action Switch */}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                              Status
                            </span>

                            <button
                              type="button"
                              disabled={isToggling}
                              onClick={() => handleToggleSlot(schedule.id, isOpen)}
                              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                isOpen ? "bg-slate-900" : "bg-slate-300"
                              } ${isToggling ? "opacity-50 cursor-not-allowed" : ""}`}
                              title={isOpen ? "Click to Close Slot" : "Click to Open Slot"}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                  isOpen ? "translate-x-5" : "translate-x-0"
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Bulk Actions Modal ── */}
        {isBulkModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-4 sm:p-6 flex items-center justify-center">
            <div className="pulse-card relative w-full max-w-lg p-6 text-left shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-auto">
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-2xs">
                  <SlidersHorizontal className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">Bulk Schedule Actions</h3>
                  <p className="text-xs text-slate-500">
                    Quickly open or close time slots across a date range or for library holidays
                  </p>
                </div>
              </div>

              {bulkError && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{bulkError}</span>
                </div>
              )}

              <form onSubmit={handleBulkSubmit} className="space-y-4">
                {/* Date Range */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5 block">
                      From Date
                    </label>
                    <input
                      type="date"
                      required
                      value={bulkStartDate}
                      onChange={(e) => setBulkStartDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5 block">
                      To Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={bulkEndDate}
                      min={bulkStartDate}
                      onChange={(e) => setBulkEndDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Target Slots */}
                <div>
                  <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2 block">
                    Target Time Slots
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {ALL_SLOTS.map((slot) => {
                      const isChecked = bulkSelectedSlots.includes(slot);
                      const detail = slotConfig[slot] ?? DEFAULT_SLOT_CONFIG[slot];
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => {
                            if (isChecked) {
                              setBulkSelectedSlots((prev) => prev.filter((s) => s !== slot));
                            } else {
                              setBulkSelectedSlots((prev) => [...prev, slot]);
                            }
                          }}
                          className={`flex items-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition-all text-left ${
                            isChecked
                              ? "bg-slate-900 border-slate-900 text-white"
                              : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-white"
                          }`}
                        >
                          <span className="text-base">{detail?.icon ?? "⏱️"}</span>
                          <span className="capitalize flex-1">{detail?.label ?? slot}</span>
                          {isChecked && <Check className="h-4 w-4 shrink-0 text-white" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Status Action Choice */}
                <div>
                  <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2 block">
                    Action / Status
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setBulkIsOpen(true)}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-extrabold transition-all ${
                        bulkIsOpen
                          ? "bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-white"
                      }`}
                    >
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 mb-1" />
                      <span>Set to OPEN</span>
                      <span className="text-[10px] font-medium text-slate-400 mt-0.5">
                        Students can reserve seats
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBulkIsOpen(false)}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-extrabold transition-all ${
                        !bulkIsOpen
                          ? "bg-rose-50 border-rose-500 text-rose-900 ring-2 ring-rose-500/20"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-white"
                      }`}
                    >
                      <XCircle className="h-5 w-5 text-rose-600 mb-1" />
                      <span>Set to CLOSED</span>
                      <span className="text-[10px] font-medium text-slate-400 mt-0.5">
                        Holiday / Maintenance closure
                      </span>
                    </button>
                  </div>
                </div>

                {/* Submit button */}
                <div className="pt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsBulkModalOpen(false)}
                    className="pulse-button-secondary w-1/3 text-xs py-2.5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isBulkSubmitting}
                    className="pulse-button-primary flex-1 text-xs py-2.5"
                  >
                    {isBulkSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    <span>Apply Changes</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  );
}

export default SchedulesView;
