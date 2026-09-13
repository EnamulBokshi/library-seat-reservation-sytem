"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { authService } from "@/services/auth-service";
import { ApiError } from "@/lib/types";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
} from "lucide-react";

/**
 * Step two of registration: consume the 6-digit code.
 * A student lands in the dashboard; a faculty account stops at the
 * "awaiting approval" panel because no session is issued until an admin acts.
 */
export function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { verifyEmail } = useAuth();

  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [awaitingApproval, setAwaitingApproval] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!email.trim() || code.trim().length !== 6) {
      setError("Enter your email address and the 6-digit code we sent you.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await verifyEmail({ email: email.trim(), code: code.trim() });

      if (result.requiresAdminApproval) {
        setAwaitingApproval(true);
        return;
      }

      router.push("/dashboard");
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setError(apiErr?.message || "Verification failed. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setNotice(null);

    if (!email.trim()) {
      setError("Enter the email address you registered with.");
      return;
    }

    setIsResending(true);
    try {
      const res = await authService.resendOtp(email.trim());
      setNotice(res.message ?? "A new code is on its way.");
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setError(apiErr?.message || "Could not send a new code. Try again shortly.");
    } finally {
      setIsResending(false);
    }
  };

  if (awaitingApproval) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f5f7] p-4 sm:p-6 lg:p-8">
        <div className="pulse-card w-full max-w-md p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <Clock className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Awaiting Admin Approval
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Your email is verified. A library administrator now reviews your faculty request.
            You will receive an email as soon as it is decided.
          </p>
          <Link href="/auth/login" className="pulse-button-primary mt-6 inline-flex w-full py-3 text-sm">
            <span>Back to sign in</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f5f7] p-4 sm:p-6 lg:p-8">
      <div className="pulse-card relative w-full max-w-md p-8 shadow-sm">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-2xs">
            <Activity className="h-6 w-6" />
          </div>
          <p className="kicker-label">SMART LIBRARY MANAGEMENT</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Verify Your Email
          </h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Enter the 6-digit code we emailed you. It expires in 10 minutes.
          </p>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {notice && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex-1 font-medium">{notice}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="kicker-label mb-1.5 block">Email Address *</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Mail className="h-4 w-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@university.edu"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-10 pr-4 text-sm font-medium text-slate-900 placeholder-slate-400 transition-all focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              />
            </div>
          </div>

          <div>
            <label className="kicker-label mb-1.5 block">Verification Code *</label>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 text-center text-xl font-black tracking-[0.5em] text-slate-900 placeholder-slate-300 transition-all focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>

          <button type="submit" disabled={isSubmitting} className="pulse-button-primary mt-4 w-full py-3 text-sm">
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <span>Verify Email</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <button
          type="button"
          onClick={handleResend}
          disabled={isResending}
          className="mt-4 w-full text-xs font-bold text-slate-900 hover:underline disabled:opacity-50"
        >
          {isResending ? "Sending a new code..." : "Send me a new code"}
        </button>

        <div className="mt-8 border-t border-slate-100 pt-6 text-center text-xs text-slate-500">
          Wrong address?{" "}
          <Link href="/auth/register" className="font-bold text-slate-900 hover:underline">
            Register again
          </Link>
        </div>
      </div>
    </div>
  );
}

export default VerifyEmailForm;
