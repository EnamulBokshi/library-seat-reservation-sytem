"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { ApiError } from "@/lib/types"
import { AuthShell } from "./auth-shell"
import {
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react"

const FIELD_CLASS =
  "w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-10 pr-4 text-sm font-medium text-slate-900 placeholder-slate-400 transition-all focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectPath = searchParams.get("redirect") || "/"
  const { login, isAuthenticated, isLoading: isAuthLoading } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const safeDestination = () =>
    redirectPath.startsWith("/") && !redirectPath.startsWith("//")
      ? redirectPath
      : "/"

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push(safeDestination())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, redirectPath, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email || !password) {
      setError("Please fill in all required fields.")
      return
    }

    setIsSubmitting(true)
    try {
      await login({ email, password })
      router.push(safeDestination())
    } catch (err: unknown) {
      const apiErr = err as ApiError
      setError(
        apiErr?.message || "Failed to log in. Please check your credentials."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
      </div>
    )
  }

  return (
    <AuthShell
      kicker="SMART LIBRARY MANAGEMENT"
      heading="Welcome back"
      subheading="Sign in to reserve a seat, track your loans and settle any dues."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link
            href="/auth/register"
            className="font-bold text-slate-900 hover:underline"
          >
            Create an account
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

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="kicker-label mb-1.5 block">Email Address</label>
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
          <label className="kicker-label mb-1.5 block">Password</label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <Lock className="h-4 w-4" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={`${FIELD_CLASS} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 transition-colors hover:text-slate-700"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="pulse-button-primary w-full py-3 text-sm"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <span>Sign in</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
    </AuthShell>
  )
}

export default LoginForm
