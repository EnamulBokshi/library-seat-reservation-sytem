"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { ApiError, SelfRegisterRole } from "@/lib/types"
import { AuthShell } from "./auth-shell"
import {
  Mail,
  Lock,
  User,
  IdCard,
  ArrowRight,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  GraduationCap,
  Building2,
  BriefcaseBusiness,
} from "lucide-react"

const FIELD_CLASS =
  "w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-10 pr-4 text-sm font-medium text-slate-900 placeholder-slate-400 transition-all focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"

export function RegisterForm() {
  const router = useRouter()
  const { register, isAuthenticated, isLoading: isAuthLoading } = useAuth()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [studentId, setStudentId] = useState("")
  const [accountType, setAccountType] = useState<SelfRegisterRole>("student")
  const [facultyId, setFacultyId] = useState("")
  const [department, setDepartment] = useState("")
  const [designation, setDesignation] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isFaculty = accountType === "faculty"

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/")
    }
  }, [isAuthenticated, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name || !email || !password) {
      setError("Please fill in all required fields.")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.")
      return
    }

    if (isFaculty && (!facultyId.trim() || !department.trim())) {
      setError("Faculty accounts need a faculty ID and a department.")
      return
    }

    setIsSubmitting(true)
    try {
      await register({
        name,
        email,
        password,
        role: accountType,
        studentId: isFaculty ? undefined : studentId.trim() || undefined,
        facultyId: isFaculty ? facultyId.trim() : undefined,
        department: isFaculty ? department.trim() : undefined,
        designation:
          isFaculty && designation.trim() ? designation.trim() : undefined,
      })
      // Every signup verifies its email before the account does anything.
      router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`)
    } catch (err: unknown) {
      const apiErr = err as ApiError
      setError(
        apiErr?.message || "Failed to register account. Please try again."
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
      heading="Create an account"
      subheading="Join the reading rooms. Students start straight after email verification; faculty accounts are approved by an administrator."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="font-bold text-slate-900 hover:underline"
          >
            Sign in
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

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="kicker-label mb-1.5 block">Account Type *</label>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { value: "student", label: "Student", icon: GraduationCap },
                { value: "faculty", label: "Faculty", icon: BriefcaseBusiness },
              ] as const
            ).map((option) => {
              const Icon = option.icon
              const isSelected = accountType === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setAccountType(option.value)}
                  className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-bold transition-all ${
                    isSelected
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-slate-50/50 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {option.label}
                </button>
              )
            })}
          </div>
          {isFaculty && (
            <p className="mt-2 text-[11px] font-medium text-slate-500">
              Faculty accounts need admin approval after email verification.
            </p>
          )}
        </div>

        <div>
          <label className="kicker-label mb-1.5 block">Full Name *</label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <User className="h-4 w-4" />
            </div>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              className={FIELD_CLASS}
            />
          </div>
        </div>

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

        {isFaculty ? (
          <>
            <div>
              <label className="kicker-label mb-1.5 block">Faculty ID *</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <IdCard className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  value={facultyId}
                  onChange={(e) => setFacultyId(e.target.value)}
                  placeholder="FAC-2041"
                  className={FIELD_CLASS}
                />
              </div>
            </div>

            <div>
              <label className="kicker-label mb-1.5 block">Department *</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Building2 className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Computer Science & Engineering"
                  className={FIELD_CLASS}
                />
              </div>
            </div>

            <div>
              <label className="kicker-label mb-1.5 block">
                Designation{" "}
                <span className="text-slate-400 normal-case">(Optional)</span>
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <BriefcaseBusiness className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="Assistant Professor"
                  className={FIELD_CLASS}
                />
              </div>
            </div>
          </>
        ) : (
          <div>
            <label className="kicker-label mb-1.5 block">
              Student ID{" "}
              <span className="text-slate-400 normal-case">(Optional)</span>
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <IdCard className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="STU-12345"
                className={FIELD_CLASS}
              />
            </div>
          </div>
        )}

        <div>
          <label className="kicker-label mb-1.5 block">Password *</label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <Lock className="h-4 w-4" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
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
          className="pulse-button-primary mt-4 w-full py-3 text-sm"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Sending verification code...</span>
            </>
          ) : (
            <>
              <span>{isFaculty ? "Register as Faculty" : "Register"}</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
    </AuthShell>
  )
}

export default RegisterForm
