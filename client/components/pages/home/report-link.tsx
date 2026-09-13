"use client"

import React, { useState } from "react"
import { ReportIssueModal } from "@/components/shared/report-issue-modal"
import { Flag } from "lucide-react"

/**
 * Quiet "report" affordance pinned to the bottom corner of the home page.
 *
 * Styled as a link rather than a call-to-action button: it should be findable
 * when something is wrong, and ignorable the rest of the time. Shown to every
 * visitor; the modal handles the signed-out case by asking them to sign in.
 *
 * Sits above the mobile bottom navigation so it never covers those controls.
 */
export function ReportLink() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed right-4 bottom-20 z-30 inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/90 px-3 py-1.5 text-xs font-bold text-slate-500 underline decoration-slate-300 decoration-dotted underline-offset-4 shadow-2xs backdrop-blur transition-colors hover:text-slate-900 hover:decoration-slate-900 sm:right-6 sm:bottom-6"
      >
        <Flag className="h-3.5 w-3.5" />
        <span>report</span>
      </button>

      <ReportIssueModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}

export default ReportLink
