"use client"

/**
 * "Last opened the notice page" stamp, kept per account in localStorage.
 *
 * The badge counts notices published after this moment. Storage is per browser
 * on purpose: it needs no schema, and the worst failure — a cleared store —
 * only means the reader sees every live notice marked new once more.
 */

const STORAGE_PREFIX = "smartlibrary:notices-seen:"

/** Fired after the stamp moves so open badges can refresh. */
export const NOTICES_SEEN_EVENT = "notices:seen"

const storageKey = (userId: string): string => `${STORAGE_PREFIX}${userId}`

/** The stored ISO stamp, or null when the reader has never opened the page. */
export const getNoticesSeenAt = (userId?: string | null): string | null => {
  if (!userId || typeof window === "undefined") return null

  try {
    return window.localStorage.getItem(storageKey(userId))
  } catch {
    // Private mode or blocked storage: treat every notice as new.
    return null
  }
}

/** Stamp the current moment and tell any listening badge to refresh. */
export const markNoticesSeen = (userId?: string | null): void => {
  if (!userId || typeof window === "undefined") return

  try {
    window.localStorage.setItem(storageKey(userId), new Date().toISOString())
  } catch {
    // Nothing to do: the badge simply keeps counting these notices as new.
  }

  window.dispatchEvent(new Event(NOTICES_SEEN_EVENT))
}
