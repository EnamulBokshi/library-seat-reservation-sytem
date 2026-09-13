import React from "react"
import Link from "next/link"
import { Activity } from "lucide-react"

interface AuthShellProps {
  /** Small label above the form heading. */
  kicker: string
  heading: string
  subheading: string
  children: React.ReactNode
  /** Rendered under the form, usually the cross-link to the other auth page. */
  footer?: React.ReactNode
}

/**
 * Split-screen shell for the auth pages: the date-due card on the left, the
 * form on the right. The card collapses below `lg`, where a compact brand mark
 * takes its place.
 */
export function AuthShell({
  kicker,
  heading,
  subheading,
  children,
  footer,
}: AuthShellProps) {
  return (
    <div className="grid min-h-screen grid-cols-1 bg-white lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* ── Date-due card ── */}
      <aside className="relative hidden overflow-hidden bg-[#0b0f19] p-10 text-white select-none lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(110%_80%_at_20%_0%,#1e1b4b_0%,transparent_60%)]"
        />

        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/15 backdrop-blur">
              <Activity className="h-5 w-5" />
            </span>
            <span className="text-sm font-extrabold tracking-tight">
              Smart Library
            </span>
          </Link>
        </div>

        <div className="relative z-10 flex flex-1 items-center justify-center py-10">
          <DateDueCard />
        </div>

        <p className="relative z-10 font-mono text-[11px] tracking-[0.28em] text-white/35 uppercase">
          Return by the date last stamped
        </p>
      </aside>

      {/* ── Form column ── */}
      <main className="flex items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
        <div className="w-full max-w-md">
          <div className="mb-8">
            {/* The brand mark stands in for the card on small screens. */}
            <Link
              href="/"
              className="mb-6 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-2xs lg:hidden"
            >
              <Activity className="h-5 w-5" />
            </Link>
            <p className="kicker-label">{kicker}</p>
            <h1 className="mt-1.5 text-3xl font-extrabold tracking-tight text-slate-900">
              {heading}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              {subheading}
            </p>
          </div>

          {children}

          {footer && (
            <div className="mt-8 border-t border-slate-100 pt-6 text-center text-xs text-slate-500">
              {footer}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

/** Stamps on the card. The last one is deliberately blank — the next borrower's. */
const STAMPS: { date: string; slot: string; tilt: string }[] = [
  { date: "14 JAN", slot: "MORNING", tilt: "-rotate-[1.4deg]" },
  { date: "02 FEB", slot: "EVENING", tilt: "rotate-[0.8deg]" },
  { date: "27 FEB", slot: "NOON", tilt: "-rotate-[0.6deg]" },
  { date: "16 MAR", slot: "AFTERNOON", tilt: "rotate-[1.6deg]" },
  { date: "09 APR", slot: "MORNING", tilt: "-rotate-[1deg]" },
]

/**
 * The paper pocket card glued inside the back cover of a library book, with a
 * column of ink stamps. Drawn in markup so the page ships without an asset.
 */
function DateDueCard() {
  return (
    <div className="relative w-[290px] rotate-[-2.5deg] xl:w-[320px]">
      {/* A second card peeking out from underneath gives the stack some depth. */}
      <div
        aria-hidden
        className="absolute inset-0 -rotate-[3.5deg] rounded-[4px] bg-[#e7e0cf]/25"
      />

      <div className="relative rounded-[4px] bg-[#f4efe2] px-6 pt-6 pb-7 text-[#1c1a17] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.75)]">
        <p className="text-center font-mono text-[10px] tracking-[0.42em] text-[#1c1a17]/55 uppercase">
          Smart Library
        </p>
        <p className="mt-3 text-center font-mono text-2xl font-bold tracking-[0.3em] text-[#1c1a17] uppercase">
          Date Due
        </p>

        <div className="mt-6 space-y-0">
          {STAMPS.map((stamp) => (
            <div
              key={stamp.date}
              className="flex items-baseline justify-between border-b border-dashed border-[#1c1a17]/20 py-2.5"
            >
              <span
                className={`font-mono text-[15px] font-bold tracking-[0.12em] text-[#3d3ba8]/85 ${stamp.tilt}`}
              >
                {stamp.date}
              </span>
              <span
                className={`font-mono text-[9px] tracking-[0.24em] text-[#3d3ba8]/55 uppercase ${stamp.tilt}`}
              >
                {stamp.slot}
              </span>
            </div>
          ))}
          {/* The empty rule: the seat and the date still to be claimed. */}
          <div className="h-[38px] border-b border-dashed border-[#1c1a17]/20" />
        </div>

        <div className="mt-5 flex items-center justify-between font-mono text-[9px] tracking-[0.22em] text-[#1c1a17]/45 uppercase">
          <span>Card no. 0001</span>
          <span>Do not remove</span>
        </div>
      </div>
    </div>
  )
}

export default AuthShell
