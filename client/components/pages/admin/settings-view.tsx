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
  BookOpen,
  Armchair,
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

  // Borrowing Policy states
  const [maxBorrowLimit, setMaxBorrowLimit] = useState("3");
  const [borrowPeriodDays, setBorrowPeriodDays] = useState("10");
  const [maxRenewalLimit, setMaxRenewalLimit] = useState("3");

  // Overdue Fine & Warning Policy states
  const [fineRatePerDay, setFineRatePerDay] = useState("5");
  const [warningDaysBefore, setWarningDaysBefore] = useState("2");
  const [tierDaysThreshold, setTierDaysThreshold] = useState("7");
  const [tierLateRate, setTierLateRate] = useState("10");

  const [isSavingGrace, setIsSavingGrace] = useState(false);
  const [isSavingAdvance, setIsSavingAdvance] = useState(false);
  const [isSavingSlots, setIsSavingSlots] = useState(false);
  const [isSavingBorrowPolicy, setIsSavingBorrowPolicy] = useState(false);
  // Seat Reservation Cancellation & Fine Policy states
  const [freeCancelMinutes, setFreeCancelMinutes] = useState("5");
  const [lateCancelFine, setLateCancelFine] = useState("5");
  const [lateCancelLeadMinutes, setLateCancelLeadMinutes] = useState("120");
  const [noShowFine, setNoShowFine] = useState("5");
  const [maxUnpaidFineLimit, setMaxUnpaidFineLimit] = useState("10");

  const [isSavingFinePolicy, setIsSavingFinePolicy] = useState(false);
  const [isSavingCancelPolicy, setIsSavingCancelPolicy] = useState(false);

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

      const maxBorrowItem = list.find((s) => s.key === "MAX_BORROW_LIMIT");
      if (maxBorrowItem) {
        setMaxBorrowLimit(maxBorrowItem.value);
      }

      const borrowPeriodItem = list.find((s) => s.key === "BORROW_PERIOD_DAYS");
      if (borrowPeriodItem) {
        setBorrowPeriodDays(borrowPeriodItem.value);
      }

      const maxRenewalItem = list.find((s) => s.key === "MAX_RENEWAL_LIMIT");
      if (maxRenewalItem) {
        setMaxRenewalLimit(maxRenewalItem.value);
      }

      const fineRateItem = list.find((s) => s.key === "FINE_RATE_PER_DAY");
      if (fineRateItem) setFineRatePerDay(fineRateItem.value);

      const warningDaysItem = list.find((s) => s.key === "WARNING_REMINDER_DAYS_BEFORE");
      if (warningDaysItem) setWarningDaysBefore(warningDaysItem.value);

      const fineTiersItem = list.find((s) => s.key === "FINE_TIERS");
      if (fineTiersItem) {
        try {
          const parsed = JSON.parse(fineTiersItem.value);
          if (Array.isArray(parsed) && parsed.length >= 2) {
            setTierDaysThreshold(String(parsed[1].minDays - 1));
            setTierLateRate(String(parsed[1].rate));
          }
        } catch {
          // fallback to default
        }
      }

      const freeCancelItem = list.find((s) => s.key === "BOOKING_FREE_CANCEL_MINUTES");
      if (freeCancelItem) setFreeCancelMinutes(freeCancelItem.value);

      const lateFineItem = list.find((s) => s.key === "BOOKING_LATE_CANCEL_FINE");
      if (lateFineItem) setLateCancelFine(lateFineItem.value);

      const leadItem = list.find((s) => s.key === "BOOKING_LATE_CANCEL_LEAD_MINUTES");
      if (leadItem) setLateCancelLeadMinutes(leadItem.value);

      const noShowFineItem = list.find((s) => s.key === "BOOKING_NO_SHOW_FINE");
      if (noShowFineItem) setNoShowFine(noShowFineItem.value);

      const maxUnpaidItem = list.find((s) => s.key === "BOOKING_MAX_UNPAID_FINE_LIMIT");
      if (maxUnpaidItem) setMaxUnpaidFineLimit(maxUnpaidItem.value);

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

  // ── Save Borrow Policy ───────────────────────────────────────────────────
  const handleSaveBorrowPolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const maxBorrow = parseInt(maxBorrowLimit, 10);
    const borrowDays = parseInt(borrowPeriodDays, 10);
    const maxRenewal = parseInt(maxRenewalLimit, 10);

    if (isNaN(maxBorrow) || maxBorrow < 1 || maxBorrow > 20) {
      setError("Max borrow limit must be between 1 and 20 books.");
      return;
    }
    if (isNaN(borrowDays) || borrowDays < 1 || borrowDays > 90) {
      setError("Borrow period must be between 1 and 90 days.");
      return;
    }
    if (isNaN(maxRenewal) || maxRenewal < 0 || maxRenewal > 10) {
      setError("Max renewals must be between 0 and 10 times.");
      return;
    }

    setIsSavingBorrowPolicy(true);
    try {
      await Promise.all([
        settingService.update(
          "MAX_BORROW_LIMIT",
          maxBorrowLimit.trim(),
          "Maximum active books a student can borrow concurrently"
        ),
        settingService.update(
          "BORROW_PERIOD_DAYS",
          borrowPeriodDays.trim(),
          "Default borrow period duration in days"
        ),
        settingService.update(
          "MAX_RENEWAL_LIMIT",
          maxRenewalLimit.trim(),
          "Maximum number of renewals allowed per book"
        ),
      ]);
      setSuccessMessage("Book borrowing and circulation policies updated successfully!");
      fetchSettings();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setError(apiErr?.message ?? "Failed to update borrowing policies.");
    } finally {
      setIsSavingBorrowPolicy(false);
    }
  };

  // ── Save Fine Policy ──────────────────────────────────────────────────────
  const handleSaveFinePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const baseRate = parseFloat(fineRatePerDay);
    const warnDays = parseInt(warningDaysBefore, 10);
    const tierDays = parseInt(tierDaysThreshold, 10);
    const lateRate = parseFloat(tierLateRate);

    if (isNaN(baseRate) || baseRate < 0 || baseRate > 1000) {
      setError("Daily fine rate must be between 0 and 1000 BDT.");
      return;
    }
    if (isNaN(warnDays) || warnDays < 1 || warnDays > 14) {
      setError("Warning reminder days must be between 1 and 14 days.");
      return;
    }
    if (isNaN(tierDays) || tierDays < 1 || isNaN(lateRate) || lateRate < 0) {
      setError("Please provide valid tiered threshold days and late rates.");
      return;
    }

    const tiersJson = JSON.stringify([
      { minDays: 1, rate: baseRate },
      { minDays: tierDays + 1, rate: lateRate },
    ]);

    setIsSavingFinePolicy(true);
    try {
      await Promise.all([
        settingService.update(
          "FINE_RATE_PER_DAY",
          fineRatePerDay.trim(),
          "Overdue fine rate per day in BDT (Default: 5 Tk)"
        ),
        settingService.update(
          "WARNING_REMINDER_DAYS_BEFORE",
          warningDaysBefore.trim(),
          "Days before loan due date to dispatch warning email"
        ),
        settingService.update(
          "FINE_TIERS",
          tiersJson,
          "Configurable tiered fine rates by days overdue"
        ),
      ]);
      setSuccessMessage("Overdue fine rates and email warning policies saved successfully!");
      fetchSettings();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setError(apiErr?.message ?? "Failed to update fine policies.");
    } finally {
      setIsSavingFinePolicy(false);
    }
  };

  // ── Save Seat Cancellation & Fine Policy ──────────────────────────────────
  const handleSaveCancelPolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const freeMins = parseInt(freeCancelMinutes, 10);
    const lateFine = parseFloat(lateCancelFine);
    const leadMins = parseInt(lateCancelLeadMinutes, 10);
    const noShow = parseFloat(noShowFine);
    const maxUnpaid = parseFloat(maxUnpaidFineLimit);

    if (isNaN(freeMins) || freeMins < 0 || freeMins > 180) {
      setError("Free cancellation window must be between 0 and 180 minutes.");
      return;
    }
    if (isNaN(lateFine) || lateFine < 0 || lateFine > 1000) {
      setError("Late cancellation fine must be between 0 and 1000 BDT.");
      return;
    }
    if (isNaN(leadMins) || leadMins < 0 || leadMins > 1440) {
      setError("Fineable lead window must be between 0 and 1440 minutes.");
      return;
    }
    if (isNaN(noShow) || noShow < 0 || noShow > 1000) {
      setError("No-show fine must be between 0 and 1000 BDT.");
      return;
    }
    if (isNaN(maxUnpaid) || maxUnpaid <= 0 || maxUnpaid > 10000) {
      setError("Maximum unpaid fine limit must be between 1 and 10000 BDT.");
      return;
    }

    setIsSavingCancelPolicy(true);
    try {
      await Promise.all([
        settingService.update(
          "BOOKING_FREE_CANCEL_MINUTES",
          freeCancelMinutes.trim(),
          "Minutes after booking during which a student may cancel free of charge"
        ),
        settingService.update(
          "BOOKING_LATE_CANCEL_FINE",
          lateCancelFine.trim(),
          "Fine in BDT charged for cancelling a reservation after the free window"
        ),
        settingService.update(
          "BOOKING_LATE_CANCEL_LEAD_MINUTES",
          lateCancelLeadMinutes.trim(),
          "Minutes before the slot starts within which a late cancellation is fineable"
        ),
        settingService.update(
          "BOOKING_NO_SHOW_FINE",
          noShowFine.trim(),
          "Fine in BDT charged when a reservation is auto-cancelled as a no-show"
        ),
        settingService.update(
          "BOOKING_MAX_UNPAID_FINE_LIMIT",
          maxUnpaidFineLimit.trim(),
          "Total unpaid library dues in BDT at which seat reservations are locked"
        ),
      ]);
      setSuccessMessage("Seat reservation cancellation and fine policy saved successfully!");
      fetchSettings();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setError(apiErr?.message ?? "Failed to update cancellation policy.");
    } finally {
      setIsSavingCancelPolicy(false);
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
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
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

            {/* ── CARD 4: Book Borrowing & Circulation Policies ── */}
            <div className="pulse-card p-6 shadow-sm space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-100 shrink-0">
                  <BookOpen className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-extrabold text-slate-900">
                    Book Borrowing & Circulation Policies
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed font-medium">
                    Configure the maximum books a student can borrow concurrently, the standard loan duration, and how many times a loan can be extended online.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveBorrowPolicy} className="space-y-4 pt-2 border-t border-slate-100">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="kicker-label mb-2 block">
                      Max Books Per Student
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={maxBorrowLimit}
                      onChange={(e) => setMaxBorrowLimit(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 font-mono text-sm text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 font-bold"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block font-medium">
                      Default: 3 books
                    </span>
                  </div>

                  <div>
                    <label className="kicker-label mb-2 block">
                      Loan Duration (Days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={borrowPeriodDays}
                      onChange={(e) => setBorrowPeriodDays(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 font-mono text-sm text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 font-bold"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block font-medium">
                      Default: 10 days
                    </span>
                  </div>

                  <div>
                    <label className="kicker-label mb-2 block">
                      Max Renewals Per Book
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={maxRenewalLimit}
                      onChange={(e) => setMaxRenewalLimit(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 font-mono text-sm text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 font-bold"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block font-medium">
                      Default: 3 times
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSavingBorrowPolicy}
                    className="pulse-button-primary py-2.5 px-5 text-xs inline-flex items-center gap-2"
                  >
                    {isSavingBorrowPolicy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span>Save Circulation Policy</span>
                  </button>
                </div>
              </form>
            </div>

            {/* ── CARD 5: Overdue Fines & Email Warning Policy ── */}
            <div className="pulse-card p-6 shadow-sm space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-700 border border-rose-100 shrink-0">
                  <BookOpen className="h-6 w-6 text-rose-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-extrabold text-slate-900">
                    Overdue Fines & Pre-Due Warning Alerts
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed font-medium">
                    Configure daily late fines, tiered rates for prolonged overdue durations, and automatic advance warning email triggers.
                    Students with any unpaid fines are automatically locked from borrowing new books until cleared.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveFinePolicy} className="space-y-4 pt-2 border-t border-slate-100">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="kicker-label mb-2 block">
                      Standard Fine (BDT/Day)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      value={fineRatePerDay}
                      onChange={(e) => setFineRatePerDay(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 font-mono text-sm text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 font-bold"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block font-medium">
                      Default: 5 Tk / day
                    </span>
                  </div>

                  <div>
                    <label className="kicker-label mb-2 block">
                      Tier 2 Threshold (Days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={tierDaysThreshold}
                      onChange={(e) => setTierDaysThreshold(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 font-mono text-sm text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 font-bold"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block font-medium">
                      e.g., After 7 days late
                    </span>
                  </div>

                  <div>
                    <label className="kicker-label mb-2 block">
                      Tier 2 Rate (BDT/Day)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      value={tierLateRate}
                      onChange={(e) => setTierLateRate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 font-mono text-sm text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 font-bold"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block font-medium">
                      e.g., 10 Tk / day for 8+ days
                    </span>
                  </div>

                  <div>
                    <label className="kicker-label mb-2 block">
                      Warning Email (Days Before)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="7"
                      value={warningDaysBefore}
                      onChange={(e) => setWarningDaysBefore(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 font-mono text-sm text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 font-bold"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block font-medium">
                      Default: 2 days before due
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSavingFinePolicy}
                    className="pulse-button-primary py-2.5 px-5 text-xs inline-flex items-center gap-2"
                  >
                    {isSavingFinePolicy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span>Save Fine & Alert Policy</span>
                  </button>
                </div>
              </form>
            </div>

            {/* ── CARD 6: Seat Reservation Cancellation & Fine Policy ── */}
            <div className="pulse-card p-6 shadow-sm space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 border border-amber-100 shrink-0">
                  <Armchair className="h-6 w-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-extrabold text-slate-900">
                    Seat Reservation Cancellation & Fine Policy
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed font-medium">
                    Discourage last-minute seat hoarding. Students cancel free inside the grace window, or whenever the
                    session is still far away. Cancelling close to the session, or failing to scan in at all, is charged
                    the same way so abandoning a seat is never cheaper than releasing it.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveCancelPolicy} className="space-y-4 pt-2 border-t border-slate-100">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="kicker-label mb-2 block">
                      Free Cancellation Window (Min)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="180"
                      value={freeCancelMinutes}
                      onChange={(e) => setFreeCancelMinutes(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 font-mono text-sm text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 font-bold"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block font-medium">
                      Default: 5 minutes after booking
                    </span>
                  </div>

                  <div>
                    <label className="kicker-label mb-2 block">
                      Late Cancellation Fine (BDT)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      step="0.5"
                      value={lateCancelFine}
                      onChange={(e) => setLateCancelFine(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 font-mono text-sm text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 font-bold"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block font-medium">
                      Default: 5 Tk
                    </span>
                  </div>

                  <div>
                    <label className="kicker-label mb-2 block">
                      Fineable Lead Window (Min)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="1440"
                      value={lateCancelLeadMinutes}
                      onChange={(e) => setLateCancelLeadMinutes(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 font-mono text-sm text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 font-bold"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block font-medium">
                      Default: 120 min before the session
                    </span>
                  </div>

                  <div>
                    <label className="kicker-label mb-2 block">
                      No-Show Fine (BDT)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      step="0.5"
                      value={noShowFine}
                      onChange={(e) => setNoShowFine(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 font-mono text-sm text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 font-bold"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block font-medium">
                      Charged on auto-cancel after {gracePeriod} min
                    </span>
                  </div>

                  <div>
                    <label className="kicker-label mb-2 block">
                      Reservation Lock Limit (BDT)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10000"
                      step="0.5"
                      value={maxUnpaidFineLimit}
                      onChange={(e) => setMaxUnpaidFineLimit(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 font-mono text-sm text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 font-bold"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block font-medium">
                      Default: 10 Tk total unpaid dues
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3.5 text-[11px] leading-relaxed text-amber-900 font-medium">
                  Seat fines and overdue book fines are counted together. Once a student&apos;s total unpaid dues reach the
                  lock limit, new seat reservations are refused until the balance is settled at the circulation desk.
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSavingCancelPolicy}
                    className="pulse-button-primary py-2.5 px-5 text-xs inline-flex items-center gap-2"
                  >
                    {isSavingCancelPolicy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span>Save Cancellation Policy</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  );
}

export default SettingsView;

