"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/context/auth-context"
import { reportService } from "@/services/report-service"
import {
  ApiError,
  CreateReportPayload,
  ReportCategory,
  ReportPriority,
} from "@/lib/types"
import { REPORT_CATEGORY_LABELS } from "@/lib/announcement-labels"
import {
  AlertCircle,
  Armchair,
  BookOpen,
  Bug,
  Building2,
  CheckCircle2,
  HelpCircle,
  Loader2,
  LogIn,
  MessageSquare,
  Send,
  Wind,
  X,
} from "lucide-react"

const CATEGORY_OPTIONS: {
  value: ReportCategory
  icon: React.ElementType
  hint: string
}[] = [
  { value: "bug", icon: Bug, hint: "Something in the app is broken" },
  {
    value: "service",
    icon: MessageSquare,
    hint: "Desk service, staff or process",
  },
  {
    value: "facilities",
    icon: Building2,
    hint: "Seats, lights, power, washrooms",
  },
  { value: "environment", icon: Wind, hint: "Noise, temperature, cleanliness" },
  { value: "book", icon: BookOpen, hint: "Missing, damaged or miscatalogued" },
  { value: "other", icon: HelpCircle, hint: "Anything else" },
]

const PRIORITY_OPTIONS: { value: ReportPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
]

const FIELD_CLASS =
  "w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder-slate-400 transition-all focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"

interface ReportIssueModalProps {
  isOpen: boolean
  onClose: () => void
  /** Called after a report is filed, so a list behind the modal can refresh. */
  onSubmitted?: () => void
}

/**
 * The single place a report is written. Every entry point — the home page link,
 * the reports page — opens this, so the form lives in one file.
 *
 * A signed-out visitor still sees the modal: it explains that reporting needs
 * an account and links to sign-in, rather than failing on submit.
 */
export function ReportIssueModal({
  isOpen,
  onClose,
  onSubmitted,
}: ReportIssueModalProps) {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth()

  const [category, setCategory] = useState<ReportCategory>("facilities")
  const [priority, setPriority] = useState<ReportPriority>("normal")
  const [subject, setSubject] = useState("")
  const [description, setDescription] = useState("")
  const [location, setLocation] = useState("")

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDone, setIsDone] = useState(false)

  // Escape closes, and the page behind must not scroll under the modal.
  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }

    document.addEventListener("keydown", onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const resetForm = () => {
    setSubject("")
    setDescription("")
    setLocation("")
    setPriority("normal")
    setCategory("facilities")
    setError(null)
    setIsDone(false)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (subject.trim().length < 4) {
      setError("Give the report a subject of at least 4 characters.")
      return
    }

    if (description.trim().length < 15) {
      setError(
        "Describe the issue in at least 15 characters so staff can act on it."
      )
      return
    }

    const payload: CreateReportPayload = {
      category,
      priority,
      subject: subject.trim(),
      description: description.trim(),
      location: location.trim() || undefined,
    }

    setIsSubmitting(true)
    try {
      await reportService.create(payload)
      setIsDone(true)
      onSubmitted?.()
    } catch (err: unknown) {
      setError((err as ApiError)?.message || "Could not submit the report.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Report an issue"
      onClick={(event) => {
        if (event.target === event.currentTarget) handleClose()
      }}
    >
      <div className="pulse-card my-8 w-full max-w-lg bg-white p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="kicker-label">TELL THE LIBRARY</p>
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
              Report an issue
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="text-slate-400 transition-colors hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {isAuthLoading ? (
          <div className="flex items-center justify-center p-10">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : !isAuthenticated ? (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-slate-600">
              Reports are tied to your library account, so staff can follow up
              with you. Sign in and the form opens straight away.
            </p>
            <Link
              href="/auth/login?redirect=/"
              className="pulse-button-primary w-full py-2.5 text-xs"
            >
              <LogIn className="h-4 w-4" />
              <span>Sign in to report</span>
            </Link>
          </div>
        ) : isDone ? (
          <div className="space-y-4 text-center">
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-900">
                Report submitted
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                The library team has been notified. You will get an email when
                the status changes.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={resetForm}
                className="pulse-button-secondary flex-1 py-2.5 text-xs"
              >
                Report something else
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="pulse-button-primary flex-1 py-2.5 text-xs"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="flex-1">{error}</div>
              </div>
            )}

            <div>
              <label className="kicker-label mb-1.5 block">
                What is it about? *
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {CATEGORY_OPTIONS.map((option) => {
                  const Icon = option.icon
                  const isSelected = category === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setCategory(option.value)}
                      title={option.hint}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition-all ${
                        isSelected
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-slate-50/50 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">
                        {REPORT_CATEGORY_LABELS[option.value]}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="kicker-label mb-1.5 block">Subject *</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Desk lamp out in Silent Zone"
                  className={FIELD_CLASS}
                />
              </div>
              <div>
                <label className="kicker-label mb-1.5 block">
                  Where{" "}
                  <span className="text-slate-400 normal-case">(Optional)</span>
                </label>
                <div className="relative">
                  <Armchair className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Silent Zone, seat S-14"
                    className={`${FIELD_CLASS} pl-10`}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="kicker-label mb-1.5 block">
                What happened? *
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the problem, when you noticed it, and anything staff should know."
                className={FIELD_CLASS}
              />
            </div>

            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <label className="kicker-label mb-1.5 block">How urgent?</label>
                <div className="flex items-center gap-1.5 rounded-xl bg-slate-100/80 p-1">
                  {PRIORITY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setPriority(option.value)}
                      className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-black transition-all ${
                        priority === option.value
                          ? "bg-white text-slate-900 shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="pulse-button-primary px-5 py-2.5 text-xs"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span>Submit report</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default ReportIssueModal
