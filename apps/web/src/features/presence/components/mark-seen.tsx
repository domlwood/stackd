"use client"

import { useEffect } from "react"

import { markDealSeen } from "../actions"

/** Marks the deal as seen when you open it (once per deal you navigate to). */
export function MarkSeen({ dealId }: { dealId: string }) {
  useEffect(() => {
    void markDealSeen(dealId).catch(() => {})
  }, [dealId])
  return null
}
