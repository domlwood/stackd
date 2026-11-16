"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useOptimistic,
  useState,
  useSyncExternalStore,
  useTransition,
  type ReactNode,
} from "react"
import { toast } from "sonner"

import type { StoredInput, View } from "@/lib/inputs/resolve"
import { resetDealInput, setDealInput } from "@/features/deals/actions"
import type { DealWorkspaceData } from "@/features/deals/types"
import { buildAnalysis, type BuiltAnalysis } from "../build"

export type InputMeta = {
  sourceText?: string
  sourceUrl?: string
  note?: string
}

type OptimisticAction =
  | {
      type: "set"
      key: string
      value: unknown
      meta: InputMeta
      userId: string
    }
  | { type: "reset"; key: string }

function reduce(
  stored: StoredInput[],
  action: OptimisticAction
): StoredInput[] {
  const others = stored.filter(
    (s) => !(s.key === action.key && s.scope === "agreed")
  )
  if (action.type === "reset") return others
  return [
    ...others,
    {
      key: action.key,
      scope: "agreed",
      userId: null,
      value: action.value,
      setBy: action.userId,
      setAt: new Date().toISOString(),
      sourceText: action.meta.sourceText ?? null,
      sourceUrl: action.meta.sourceUrl ?? null,
      note: action.meta.note ?? null,
    },
  ]
}

type DealContextValue = {
  data: DealWorkspaceData
  view: View
  built: BuiltAnalysis
  pending: boolean
  setInput: (key: string, value: unknown, meta?: InputMeta) => Promise<boolean>
  resetInput: (key: string) => Promise<boolean>
  /** Which input's side sheet is open. */
  activeInputKey: string | null
  openInput: (key: string | null) => void
  memberName: (userId: string | null) => string
}

/** Everything except the analysis: safe to read during the server render. */
export type DealBaseValue = Omit<DealContextValue, "built">

const DealContext = createContext<
  (DealBaseValue & { built: BuiltAnalysis | null }) | null
>(null)

const noopSubscribe = () => () => {}

/**
 * False during the server render and hydration, true afterwards. The engine
 * runs dozens of scenarios per deal; doing that in the Worker's server render
 * blows its CPU budget, so the browser does it instead.
 */
function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  )
}

/**
 * Holds a deal's data, applies edits optimistically and re-runs the pure engine
 * on the client so every number updates instantly. The server stays the source of truth.
 */
export function DealProvider({
  data,
  children,
}: {
  data: DealWorkspaceData
  children: ReactNode
}) {
  const [stored, apply] = useOptimistic(data.stored, reduce)
  const [pending, startTransition] = useTransition()
  const [activeInputKey, setActiveInputKey] = useState<string | null>(null)
  const view: View = { kind: "agreed" }
  const hydrated = useHydrated()

  const built = useMemo(
    () =>
      hydrated
        ? buildAnalysis({
            deal: data.deal,
            stored,
            refurbLines: data.refurbLines,
            products: data.products,
            ruleRecords: data.ruleRecords,
            settings: data.settings,
            today: data.today,
            view,
            freeBuyingPowerPence: data.freeBuyingPowerPence,
          })
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- view is constant until phase 6
    [hydrated, data, stored]
  )

  const setInput = useCallback(
    (key: string, value: unknown, meta: InputMeta = {}) =>
      new Promise<boolean>((resolve) => {
        startTransition(async () => {
          apply({ type: "set", key, value, meta, userId: data.currentUserId })
          const result = await setDealInput({
            dealId: data.deal.id,
            key,
            value,
            ...meta,
          })
          if (!result.ok) toast.error(result.message)
          resolve(result.ok)
        })
      }),
    [apply, data.currentUserId, data.deal.id]
  )

  const resetInput = useCallback(
    (key: string) =>
      new Promise<boolean>((resolve) => {
        startTransition(async () => {
          apply({ type: "reset", key })
          const result = await resetDealInput(data.deal.id, key)
          if (!result.ok) toast.error(result.message)
          resolve(result.ok)
        })
      }),
    [apply, data.deal.id]
  )

  const memberName = useCallback(
    (userId: string | null) => {
      if (!userId) return "System"
      const member = data.members.find((m) => m.userId === userId)
      return member
        ? member.isYou
          ? "You"
          : member.displayName
        : "Former member"
    },
    [data.members]
  )

  const value = useMemo(
    () => ({
      data,
      view,
      built,
      pending,
      setInput,
      resetInput,
      activeInputKey,
      openInput: setActiveInputKey,
      memberName,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- view is constant until phase 6
    [data, built, pending, setInput, resetInput, activeInputKey, memberName]
  )

  return <DealContext.Provider value={value}>{children}</DealContext.Provider>
}

function useDealContext() {
  const ctx = useContext(DealContext)
  if (!ctx) throw new Error("useDeal must be used inside <DealProvider>")
  return ctx
}

/** Deal data and actions without the analysis; works in the server render. */
export function useDealBase(): DealBaseValue {
  return useDealContext()
}

/** Full context including the analysis. Only call inside <AnalysisReady>. */
export function useDeal(): DealContextValue {
  const ctx = useDealContext()
  const { built } = ctx
  if (!built)
    throw new Error(
      "useDeal() needs the analysis: render inside <AnalysisReady>"
    )
  return { ...ctx, built }
}

/** Renders children once the analysis has run in the browser; `fallback` until then. */
export function AnalysisReady({
  children,
  fallback = null,
}: {
  children: ReactNode
  fallback?: ReactNode
}) {
  return useDealContext().built ? children : fallback
}
