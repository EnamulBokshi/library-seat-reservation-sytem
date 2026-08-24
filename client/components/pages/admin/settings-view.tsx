"use client";

import React, { useState, useEffect, useCallback } from "react";
import { settingService, SettingItem } from "@/services/setting-service";
import {
  SlotType,
  SlotConfig,
  DEFAULT_SLOT_CONFIG,
  ApiError,
} from "@/lib/types";
import {
  Clock,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Calendar,
  ArrowRight,

  Sun,
  Moon,
  Sunset,
  Sunrise,
} from "lucide-react";
import Link from "next/link";

const SLOT_ICONS: Record<SlotType, React.ElementType> = {
  morning: Sunrise,
  noon: Sun,
  afternoon: Sunset,
  evening: Moon,
};

export function SettingsView() {
  const [settings, setSettings] = useState<SettingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states
  const [gracePeriod, setGracePeriod] = useState("15");
  const [advanceDays, setAdvanceDays] = useState("7");
  const [slotConfig, setSlotConfig] = useState<SlotConfig>(DEFAULT_SLOT_CONFIG);

  const [isSavingGrace, setIsSavingGrace] = useState(false);
  const [isSavingAdvance, setIsSavingAdvance] = useState(false);
  const [isSavingSlots, setIsSavingSlots] = useState(false);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await settingService.getAll();
      const list = res.data ?? [];
      setSettings(list);

      const graceItem = list.find((s) => s.key === "CHECKIN_GRACE_PERIOD_MINUTES");
      if (graceItem) {
        setGracePeriod(graceItem.value);
      }

      const advanceItem = list.find((s) => s.key === "ADVANCE_BOOKING_DAYS");
      if (advanceItem) {
        setAdvanceDays(advanceItem.value);
      }

      const slotItem = list.find((s) => s.key === "SLOT_CONFIG");
      if (slotItem) {
        try {
          const parsed = JSON.parse(slotItem.value);
          setSlotConfig({
            ...DEFAULT_SLOT_CONFIG,
            ...parsed,
          });
        } catch {
          // fallback to default
        }
      }
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setError(apiErr?.message ?? "Failed to load system settings.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // ── Save Grace Period ─────────────────────────────────────────────────────
  const handleSaveGracePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const val = parseInt(gracePeriod, 10);
    if (isNaN(val) || val <= 0) {
      setError("Please enter a valid positive number of minutes.");
      return;
    }

    setIsSavingGrace(true);
    try {
      await settingService.update(
        "CHECKIN_GRACE_PERIOD_MINUTES",
        gracePeriod.trim(),
        "Check-in grace period in minutes before auto-cancellation"
      );
      setSuccessMessage("Check-in grace period updated successfully!");
      fetchSettings();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setError(apiErr?.message ?? "Failed to update setting.");
    } finally {
      setIsSavingGrace(false);
    }
  };

  // ── Save Advance Booking Days ─────────────────────────────────────────────
  const handleSaveAdvanceDays = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const val = parseInt(advanceDays, 10);
    if (isNaN(val) || val < 1 || val > 60) {
      setError("Advance booking window must be between 1 and 60 days.");
      return;
    }

    setIsSavingAdvance(true);
    try {
      await settingService.update(
        "ADVANCE_BOOKING_DAYS",
        advanceDays.trim(),
        "Number of days in advance reservations can be made"
      );
      setSuccessMessage("Advance reservation window updated successfully!");
      fetchSettings();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setError(apiErr?.message ?? "Failed to update advance booking window.");
    } finally {
      setIsSavingAdvance(false);
    }
  };

  // ── Save Slot Timings ─────────────────────────────────────────────────────
  const handleSaveSlotConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Validate times
    const slots: SlotType[] = ["morning", "noon", "afternoon", "evening"];
    for (const s of slots) {
      const item = slotConfig[s];
      if (!item.startTime || !item.endTime) {
        setError(`Please specify both start and end time for ${item.label}.`);
        return;
      }
      if (item.startTime >= item.endTime) {
        setError(`Start time must be before end time for ${item.label}.`);
        return;
      }
    }

    setIsSavingSlots(true);
    try {
      await settingService.update(
        "SLOT_CONFIG",
        JSON.stringify(slotConfig),
        "Library operating time slot definitions and timings"
      );
      setSuccessMessage("Operating time slots updated successfully!");
      fetchSettings();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setError(apiErr?.message ?? "Failed to update slot configurations.");
    } finally {
      setIsSavingSlots(false);
    }
  };

  const updateSingleSlot = (
    slot: SlotType,
    field: "startTime" | "endTime" | "enabled",
    value: string | boolean
  ) => {
    setSlotConfig((prev) => ({
      ...prev,
      [slot]: {
        ...prev[slot],
        [field]: value,
      },
    }));
  };

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-slate-900 pb-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-6">

        {/* ── Header Section ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="kicker-label">ADMINISTRATION &rsaquo; SYSTEM CONFIG</p>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">
              System Settings & Time Slots
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
              Configure library operating hours, daily time slots, reservation rules, and background automation
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/schedules"
              className="pulse-button-secondary py-2 px-3 text-xs"
            >
              <Calendar className="h-4 w-4" />
              <span>Daily Schedules</span>
            </Link>
            <button
              onClick={fetchSettings}
              disabled={isLoading}
              className="pulse-button-primary py-2 px-3 text-xs shrink-0"
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
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800 animate-in fade-in">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* ── Quick Banner to Schedules Manager ── */}
        <div className="rounded-3xl border border-slate-900/10 bg-slate-900 p-6 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white">
              Daily Calendar & Closures
            </span>
            <h2 className="text-lg font-black text-white">Schedule Calendar & Holiday Manager</h2>
            <p className="text-xs text-slate-300 max-w-xl">
              Need to open or close specific time slots on upcoming dates or declare a public holiday closure?
            </p>
          </div>
          <Link
            href="/admin/schedules"
            className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-xs font-black text-slate-900 shadow-md hover:bg-slate-100 transition-all shrink-0"
          >
            <span>Manage Daily Schedules</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
          </div>
        ) : (
          <div className="space-y-6">

            {/* ── CARD 1: Time Slot & Operating Hours Configuration ── */}
            <div className="pulse-card p-6 shadow-sm space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-100 shrink-0">
                  <Clock className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-extrabold text-slate-900">
                    Operating Time Slots & Sessions
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed font-medium">
                    Configure the start and end hours for each session. These timings govern student booking options, QR pass validity, and grace period countdowns.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveSlotConfig} className="space-y-5 pt-2 border-t border-slate-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(["morning", "noon", "afternoon", "evening"] as SlotType[]).map((slotKey) => {
                    const detail = slotConfig[slotKey];
                    const IconComponent = SLOT_ICONS[slotKey] ?? Clock;

                    return (
                      <div
                        key={slotKey}
                        className={`rounded-2xl border p-4 transition-all space-y-3 ${detail.enabled
                            ? "bg-slate-50/70 border-slate-200"
                            : "bg-slate-100/50 border-slate-200 opacity-60"
                          }`}
                      >
                        {/* Slot Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{detail.icon ?? "⏱️"}</span>
                            <div>
                              <h3 className="text-xs font-black capitalize text-slate-900">
                                {detail.label} Slot
                              </h3>
                              <span className="text-[10px] text-slate-400 font-bold uppercase">
                                {slotKey}
                              </span>
                            </div>
                          </div>

                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <span className="text-[10px] font-extrabold text-slate-500 uppercase">
                              {detail.enabled ? "Active" : "Disabled"}
                            </span>
                            <input
                              type="checkbox"
                              checked={detail.enabled}
                              onChange={(e) =>
                                updateSingleSlot(slotKey, "enabled", e.target.checked)
                              }
                              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                            />
                          </label>
                        </div>

                        {/* Timing Inputs */}
                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1 block">
                              Start Time (24h)
                            </label>
                            <input
                              type="time"
                              required
                              value={detail.startTime}
                              onChange={(e) =>
                                updateSingleSlot(slotKey, "startTime", e.target.value)
                              }
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-xs font-bold text-slate-900 focus:border-slate-900 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1 block">
                              End Time (24h)
                            </label>
                            <input
                              type="time"
                              required
                              value={detail.endTime}
                              onChange={(e) =>
                                updateSingleSlot(slotKey, "endTime", e.target.value)
                              }
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-xs font-bold text-slate-900 focus:border-slate-900 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSavingSlots}
                    className="pulse-button-primary py-2.5 px-5 text-xs"
                  >
                    {isSavingSlots ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span>Save Operating Slots</span>
                  </button>
                </div>
              </form>
            </div>

            {/* ── CARD 2: Advance Booking Window ── */}
            <div className="pulse-card p-6 shadow-sm space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100 shrink-0">
                  <Calendar className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-extrabold text-slate-900">
                    Advance Reservation Window
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed font-medium">
                    Specifies how many days in advance students are permitted to view and reserve seats. Daily rolling schedules will automatically generate to match this window.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveAdvanceDays} className="space-y-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="kicker-label mb-2 block">
                    Advance Window (Days)
                  </label>
                  <div className="flex gap-3 max-w-xs">
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={advanceDays}
                      onChange={(e) => setAdvanceDays(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 font-mono text-sm text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 font-bold"
                    />
                    <button
                      type="submit"
                      disabled={isSavingAdvance}
                      className="pulse-button-primary py-2.5 shrink-0 text-xs"
                    >
                      {isSavingAdvance ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      <span>Save</span>
                    </button>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1.5 block font-medium">
                    Default: 7 days. Maximum: 60 days.
                  </span>
                </div>
              </form>
            </div>

            {/* ── CARD 3: Check-In Grace Period ── */}
            <div className="pulse-card p-6 shadow-sm space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 border border-amber-100 shrink-0">
                  <Clock className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-extrabold text-slate-900">
                    Check-In Grace Period
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed font-medium">
                    Defines how many minutes a student has after a schedule slot starts to scan their QR pass at the entrance.
                    If not verified within this window, their booking is automatically cancelled and the seat is released for other students.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveGracePeriod} className="space-y-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="kicker-label mb-2 block">
                    Grace Period (Minutes)
                  </label>
                  <div className="flex gap-3 max-w-xs">
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={gracePeriod}
                      onChange={(e) => setGracePeriod(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 font-mono text-sm text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 font-bold"
                    />
                    <button
                      type="submit"
                      disabled={isSavingGrace}
                      className="pulse-button-primary py-2.5 shrink-0 text-xs"
                    >
                      {isSavingGrace ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      <span>Save</span>
                    </button>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1.5 block font-medium">
                    Default: 15 minutes.
                  </span>
                </div>
              </form>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

export default SettingsView;
