"use client";

import React, { useState, useEffect, useCallback } from "react";
import { settingService, SettingItem } from "@/services/setting-service";
import { ApiError } from "@/lib/types";
import {
  Settings, Clock, Save, Loader2, AlertCircle, CheckCircle2, RefreshCw,
} from "lucide-react";

export function SettingsView() {
  const [settings, setSettings] = useState<SettingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [gracePeriod, setGracePeriod] = useState("15");
  const [isSaving, setIsSaving] = useState(false);

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
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setError(apiErr?.message ?? "Failed to load system settings.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleSaveGracePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const val = parseInt(gracePeriod, 10);
    if (isNaN(val) || val <= 0) {
      setError("Please enter a valid positive number of minutes.");
      return;
    }

    setIsSaving(true);
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
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-slate-900">
      <div className="mx-auto max-w-4xl px-6 py-8 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="kicker-label">ADMINISTRATION &rsaquo; SYSTEM CONFIG</p>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">System Settings</h1>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
              Configure system-wide parameters and background automation rules
            </p>
          </div>
          <button
            onClick={fetchSettings}
            className="pulse-button-secondary shrink-0"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
        {error && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-700">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
          </div>
        ) : (
          <div className="pulse-card p-6 shadow-sm space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 border border-amber-100 shrink-0">
                <Clock className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-extrabold text-slate-900">Check-In Grace Period</h2>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed font-medium">
                  Defines how many minutes a student has after a schedule slot starts to check in at the entrance.
                  If not verified within this window, their booking is automatically cancelled and the seat is released.
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
                    disabled={isSaving}
                    className="pulse-button-primary py-2.5 shrink-0"
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    <span>Save</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default SettingsView;

