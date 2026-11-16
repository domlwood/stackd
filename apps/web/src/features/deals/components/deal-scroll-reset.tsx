"use client"

import { useEffect } from "react"

// Back/forward should keep the browser's restored position, so note them.
let lastPopAt = 0
if (typeof window !== "undefined")
  window.addEventListener("popstate", () => {
    lastPopAt = Date.now()
  })

/**
 * Opening a deal always starts at the top. Next scrolls the newest route
 * segment into view on navigation, and on a deal page that's the tab content
 * below the summary, so links (shared links after signing in, cards, redirects)
 * landed halfway down. This runs after Next's scroll and wins. It only fires
 * when the deal changes, so switching tabs within a deal keeps Next's
 * behaviour; it skips back/forward and links to an anchor on the page.
 */
export function DealScrollReset({ dealId }: { dealId: string }) {
  useEffect(() => {
    if (Date.now() - lastPopAt < 1_000) return
    const hash = window.location.hash
    if (hash && hash !== "#top") return
    window.scrollTo({ top: 0, left: 0, behavior: "instant" })
  }, [dealId])
  return null
}
