"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { authService } from "@/services/auth-service"
import { ApiError } from "@/lib/types"
import { AuthShell } from "./auth-shell"
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
} from "lucide-react"

const FIELD_CLASS =
  "w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-10 pr-4 text-sm font-medium text-slate-900 placeholder-slate-400 transition-all focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"

/**
 * Step two of registration: consume the 6-digit code.
 * A student lands in the dashboard; a faculty account stops at the
 * "awaiting approval" panel because no session is issued until an admin acts.
 */
export function VerifyEmailForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { verifyEmail } = useAuth()

  const [email, setEmail] = useState(searchParams.get("email") ?? "")
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [awaitingApproval, setAwaitingApproval] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setNotice(null)

    if (!email.trim() || code.trim().length !== 6) {
      setError("Enter your email address and the 6-digit code we sent you.")
      return
    }

    setIsSubmitting(true)
    try {
      const result = await verifyEmail({
        email: email.trim(),
        code: code.trim(),
      })

      if (result.requiresAdminApproval) {
        setAwaitingApproval(true)
        return
      }

      router.push("/dashboard")
    } catch (err: unknown) {
      const apiErr = err as ApiError
      setError(apiErr?.message || "Verification failed. Try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResend = async () => {
    setError(null)
    setNotice(null)

    if (!email.trim()) {
      setError("Enter the email address you registered with.")
      return
    }

    setIsResending(true)
    try {
      const res = await authService.resendOtp(email.trim())
      setNotice(res.message ?? "A new code is on its way.")
    } catch (err: unknown) {
      const apiErr = err as ApiError
      setError(
        apiErr?.message || "Could not send a new code. Try again shortly."
      )
    } finally {
      setIsResending(false)
    }
  }

  if (awaitingApproval) {
    return (
      <AuthShell
        kicker="ONE STEP LEFT"
        heading="Awaiting admin approval"
        subheading="Your email is verified. A library administrator now reviews your faculty request."
      >
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <Clock className="h-5 w-5" />
          </div>
          <p className="text-sm font-bold text-amber-900">
            You will hear back by email
          </p>
          <p className="mt-1 text-xs leading-relaxed text-amber-800">
            Sign-in stays locked until the request is decided. If it is
            declined, the reason is shown the next time you try to sign in.
          </p>
        </div>

        <Link
          href="/auth/login"
          className="pulse-button-primary mt-6 w-full py-3 text-sm"
        >
          <span>Back to sign in</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      kicker="STEP 2 OF 2"
      heading="Verify your email"
      subheading="Enter the 6-digit code we emailed you. It expires in 10 minutes."
      footer={
        <>
          Wrong address?{" "}
          <Link
            href="/auth/register"
            className="font-bold text-slate-900 hover:underline"
          >
            Register again
          </Link>
        </>
      }
    >
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
              className={FIELD_CLASS}
            />
          </div>
        </div>

        <div>
          <label className="kicker-label mb-1.5 block">
            Verification Code *
          </label>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 text-center text-xl font-black tracking-[0.5em] text-slate-900 placeholder-slate-300 transition-all focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="pulse-button-primary mt-4 w-full py-3 text-sm"
        >
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
    </AuthShell>
  )
}

export default VerifyEmailForm
