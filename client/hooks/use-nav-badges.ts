"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { dashboardService } from "@/services/dashboard-service"
import { NavBadgeCounts } from "@/lib/types"
import { NOTICES_SEEN_EVENT, getNoticesSeenAt } from "@/lib/notice-seen"

const ZERO_COUNTS: NavBadgeCounts = {
  pendingApprovals: 0,
  pendingWaivers: 0,
  activeBookings: 0,
  pendingBorrowRequests: 0,
  unpaidFines: 0,
  myPendingWaivers: 0,
  myUnpaidFines: 0,
  openReports: 0,
  myOpenReports: 0,
  liveAnnouncements: 0,
  newAnnouncements: 0,
}

/** How often the counters refresh while the tab stays open. */
const POLL_INTERVAL_MS = 60_000

/**
 * Live counters for the sidebar badges.
 *
 * Failures are swallowed on purpose: a badge is an accent, never the reason a
 * navigation fails to render. A failed refresh keeps the previous numbers, and
 * the first failure simply leaves every counter at zero, which renders nothing.
 *
 * Refreshes on mount, on a one-minute timer, when the route changes (so acting
 * on a queue updates its badge), and when the tab regains focus after being
 * left open.
 */
export function useNavBadges(): {
  counts: NavBadgeCounts
  refresh: () => void
} {
  const { isAuthenticated, user } = useAuth()
  // Read once: an optional chain inside a dependency list defeats memoization.
  const userId = user?.id
  const pathname = usePathname()
  const [counts, setCounts] = useState<NavBadgeCounts>(ZERO_COUNTS)
  // Guards against a slow response landing after the user signed out.
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setCounts(ZERO_COUNTS)
      return
    }

    try {
      const res = await dashboardService.getNavBadges({
        noticesSince: getNoticesSeenAt(userId) ?? undefined,
      })
      if (isMounted.current && res.data) {
        setCounts({ ...ZERO_COUNTS, ...res.data })
      }
    } catch {
      // Keep the last known numbers rather than flashing the badges away.
    }
  }, [isAuthenticated, userId])

  useEffect(() => {
    refresh()
  }, [refresh, pathname])

  // Opening the notice page moves the seen stamp; recount straight away.
  useEffect(() => {
    const onSeen = () => refresh()
    window.addEventListener(NOTICES_SEEN_EVENT, onSeen)
    return () => window.removeEventListener(NOTICES_SEEN_EVENT, onSeen)
  }, [refresh])

  useEffect(() => {
    if (!isAuthenticated) return

    const timer = setInterval(refresh, POLL_INTERVAL_MS)
    const onFocus = () => refresh()

    window.addEventListener("focus", onFocus)
    return () => {
      clearInterval(timer)
      window.removeEventListener("focus", onFocus)
    }
  }, [isAuthenticated, refresh])

  return { counts, refresh }
}

export default useNavBadges
