"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { userService } from "@/services/user-service";
import { ApiError, OtpChallenge, UserProfile } from "@/lib/types";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";

type Banner = { kind: "success" | "error"; text: string } | null;

function BannerNote({ banner }: { banner: Banner }) {
  if (!banner) return null;
  const isError = banner.kind === "error";
  return (
    <div
      role="status"
      className={`flex items-start gap-2 rounded-xl border p-3 text-xs font-bold ${
        isError
          ? "border-rose-200 bg-rose-50 text-rose-800"
          : "border-emerald-200 bg-emerald-50 text-emerald-800"
      }`}
    >
      {isError ? (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <span>{banner.text}</span>
    </div>
  );
}

function SectionCard({
  title,
  description,
  Icon,
  children,
}: {
  title: string;
  description: string;
  Icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 sm:text-base">{title}</h3>
          <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-900";
const labelClass = "mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-500";

export function ProfileView() {
  const { refreshSession } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── Name ──
  const [name, setName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameBanner, setNameBanner] = useState<Banner>(null);

  // ── Email change (OTP to the new address) ──
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailChallenge, setEmailChallenge] = useState<OtpChallenge | null>(null);
  const [isEmailBusy, setIsEmailBusy] = useState(false);
  const [emailBanner, setEmailBanner] = useState<Banner>(null);

  // ── Password change (OTP to the current address) ──
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordCode, setPasswordCode] = useState("");
  const [passwordChallenge, setPasswordChallenge] = useState<OtpChallenge | null>(null);
  const [isPasswordBusy, setIsPasswordBusy] = useState(false);
  const [passwordBanner, setPasswordBanner] = useState<Banner>(null);

  const loadProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const res = await userService.getProfile();
      if (res.success && res.data) {
        setProfile(res.data);
        setName(res.data.name);
      }
    } catch (err: unknown) {
      setLoadError((err as ApiError)?.message || "Could not load your profile.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameBanner(null);
    if (name.trim().length < 2) {
      setNameBanner({ kind: "error", text: "Name must be at least 2 characters." });
      return;
    }
    setIsSavingName(true);
    try {
      const res = await userService.updateProfile({ name: name.trim() });
      if (res.data) setProfile(res.data);
      await refreshSession();
      setNameBanner({ kind: "success", text: "Name updated." });
    } catch (err: unknown) {
      setNameBanner({ kind: "error", text: (err as ApiError)?.message || "Could not update your name." });
    } finally {
      setIsSavingName(false);
    }
  };

  const handleRequestEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailBanner(null);
    setIsEmailBusy(true);
    try {
      const res = await userService.requestEmailChange({
        newEmail: newEmail.trim(),
        currentPassword: emailPassword,
      });
      if (res.data) setEmailChallenge(res.data);
      setEmailBanner({
        kind: "success",
        text: `Verification code sent to ${res.data?.sentTo ?? newEmail}. It expires in ${
          res.data?.expiresInMinutes ?? 10
        } minutes.`,
      });
    } catch (err: unknown) {
      setEmailBanner({ kind: "error", text: (err as ApiError)?.message || "Could not send the code." });
    } finally {
      setIsEmailBusy(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailBanner(null);
    setIsEmailBusy(true);
    try {
      const res = await userService.verifyEmailChange(emailCode.trim());
      if (res.data?.user) setProfile(res.data.user);
      await refreshSession();
      setEmailChallenge(null);
      setNewEmail("");
      setEmailPassword("");
      setEmailCode("");
      setEmailBanner({ kind: "success", text: "Email address updated." });
    } catch (err: unknown) {
      setEmailBanner({ kind: "error", text: (err as ApiError)?.message || "Could not verify the code." });
    } finally {
      setIsEmailBusy(false);
    }
  };

  const handleRequestPasswordOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordBanner(null);
    if (newPassword.length < 6) {
      setPasswordBanner({ kind: "error", text: "New password must be at least 6 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordBanner({ kind: "error", text: "The two new passwords do not match." });
      return;
    }
    setIsPasswordBusy(true);
    try {
      const res = await userService.requestPasswordChange({ currentPassword });
      if (res.data) setPasswordChallenge(res.data);
      setPasswordBanner({
        kind: "success",
        text: `Verification code sent to ${res.data?.sentTo ?? "your email"}. It expires in ${
          res.data?.expiresInMinutes ?? 10
        } minutes.`,
      });
    } catch (err: unknown) {
      setPasswordBanner({ kind: "error", text: (err as ApiError)?.message || "Could not send the code." });
    } finally {
      setIsPasswordBusy(false);
    }
  };

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordBanner(null);
    setIsPasswordBusy(true);
    try {
      await userService.verifyPasswordChange({
        currentPassword,
        newPassword,
        code: passwordCode.trim(),
      });
      setPasswordChallenge(null);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordCode("");
      setPasswordBanner({ kind: "success", text: "Password updated. Use it the next time you sign in." });
    } catch (err: unknown) {
      setPasswordBanner({ kind: "error", text: (err as ApiError)?.message || "Could not verify the code." });
    } finally {
      setIsPasswordBusy(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
        <div>
          <p className="text-sm font-bold text-rose-800">{loadError}</p>
          <button onClick={loadProfile} className="mt-2 text-xs font-bold text-rose-700 underline">
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="kicker-label">ACCOUNT &rsaquo; PROFILE</p>
        <h2 className="mt-1 text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">Profile</h2>
        <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
          Your account details. Email and password changes are confirmed by a one-time code.
        </p>
      </div>

      {/* ── Identity summary ── */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="kicker-label">STUDENT ID</p>
          <p className="mt-1 truncate text-sm font-extrabold text-slate-900">
            {profile?.studentId || "Not set"}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="kicker-label">ROLE</p>
          <p className="mt-1 text-sm font-extrabold capitalize text-slate-900">{profile?.role}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="kicker-label">MEMBER SINCE</p>
          <p className="mt-1 text-sm font-extrabold text-slate-900">
            {profile?.createdAt
              ? new Date(profile.createdAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
              : "—"}
          </p>
        </div>
      </div>

      {/* ── Name ── */}
      <SectionCard
        title="Display name"
        description="Shown on your reservations and loan records."
        Icon={UserRound}
      >
        <form onSubmit={handleSaveName} className="space-y-3">
          <div>
            <label className={labelClass} htmlFor="profile-name">
              Full name
            </label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              autoComplete="name"
            />
          </div>
          <BannerNote banner={nameBanner} />
          <button type="submit" disabled={isSavingName} className="pulse-button-primary">
            {isSavingName ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            <span>Save name</span>
          </button>
        </form>
      </SectionCard>

      {/* ── Email ── */}
      <SectionCard
        title="Email address"
        description={`Current: ${profile?.email ?? "—"}. A code is sent to the new address to prove you own it.`}
        Icon={Mail}
      >
        {emailChallenge ? (
          <form onSubmit={handleVerifyEmail} className="space-y-3">
            <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
              <span>
                Enter the 6-digit code sent to <strong>{emailChallenge.sentTo}</strong>.
              </span>
            </div>
            <div>
              <label className={labelClass} htmlFor="email-code">
                Verification code
              </label>
              <input
                id="email-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={emailCode}
                onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, ""))}
                className={`${inputClass} tracking-[0.5em] font-black`}
                placeholder="000000"
                autoComplete="one-time-code"
              />
            </div>
            <BannerNote banner={emailBanner} />
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={isEmailBusy} className="pulse-button-primary">
                {isEmailBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                <span>Confirm new email</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmailChallenge(null);
                  setEmailCode("");
                  setEmailBanner(null);
                }}
                className="pulse-button-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRequestEmailOtp} className="space-y-3">
            <div>
              <label className={labelClass} htmlFor="new-email">
                New email address
              </label>
              <input
                id="new-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className={inputClass}
                placeholder="you@university.edu"
                autoComplete="email"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="email-current-password">
                Current password
              </label>
              <input
                id="email-current-password"
                type="password"
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
                className={inputClass}
                autoComplete="current-password"
              />
            </div>
            <BannerNote banner={emailBanner} />
            <button type="submit" disabled={isEmailBusy} className="pulse-button-primary">
              {isEmailBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              <span>Send verification code</span>
            </button>
          </form>
        )}
      </SectionCard>

      {/* ── Password ── */}
      <SectionCard
        title="Password"
        description="Requires your current password plus a code sent to your registered email."
        Icon={Lock}
      >
        {passwordChallenge ? (
          <form onSubmit={handleVerifyPassword} className="space-y-3">
            <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
              <span>
                Enter the 6-digit code sent to <strong>{passwordChallenge.sentTo}</strong>.
              </span>
            </div>
            <div>
              <label className={labelClass} htmlFor="password-code">
                Verification code
              </label>
              <input
                id="password-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={passwordCode}
                onChange={(e) => setPasswordCode(e.target.value.replace(/\D/g, ""))}
                className={`${inputClass} tracking-[0.5em] font-black`}
                placeholder="000000"
                autoComplete="one-time-code"
              />
            </div>
            <BannerNote banner={passwordBanner} />
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={isPasswordBusy} className="pulse-button-primary">
                {isPasswordBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                <span>Confirm new password</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPasswordChallenge(null);
                  setPasswordCode("");
                  setPasswordBanner(null);
                }}
                className="pulse-button-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRequestPasswordOtp} className="space-y-3">
            <div>
              <label className={labelClass} htmlFor="current-password">
                Current password
              </label>
              <input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={inputClass}
                autoComplete="current-password"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="new-password">
                  New password
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={inputClass}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="confirm-password">
                  Repeat new password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClass}
                  autoComplete="new-password"
                />
              </div>
            </div>
            <BannerNote banner={passwordBanner} />
            <button type="submit" disabled={isPasswordBusy} className="pulse-button-primary">
              {isPasswordBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              <span>Send verification code</span>
            </button>
          </form>
        )}
      </SectionCard>
    </div>
  );
}

export default ProfileView;
