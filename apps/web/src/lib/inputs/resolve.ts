import {
  inputDef,
  INPUT_DEFS,
  parseRefurbItemKey,
  refurbItemCostKey,
  type DefaultsSource,
} from "./registry"

/** A stored value from deal_input (Agreed when userId is null, otherwise a user's proposal). */
export type StoredInput = {
  key: string
  scope: "agreed" | "proposal"
  userId: string | null
  value: unknown
  setBy: string | null
  setAt: string
  sourceText?: string | null
  sourceUrl?: string | null
  note?: string | null
}

export type View = { kind: "agreed" } | { kind: "user"; userId: string }

export type Provenance = {
  origin: "default" | "agreed" | "proposal"
  /** Default computed from other inputs (rent from end value, tax from the plan). */
  derived?: boolean
  /** The Agreed value (or default if none agreed), for diffing. */
  agreedValue: unknown
  /** True when this view's value differs from Agreed. */
  differsFromAgreed: boolean
  stored: StoredInput | null
}

export type ResolvedInputs = {
  view: View
  values: Record<string, unknown>
  provenance: Record<string, Provenance>
  /** Keys in this view whose value differs from Agreed. */
  diffKeys: string[]
  /** Stored values that were ignored (unknown key, invalid value, deleted refurb line). */
  issues: { key: string; reason: string }[]
}

function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

/**
 * Effective inputs for a view: defaults ← Agreed ← (this user's proposals).
 * Used by the deal page, the pipeline cache and the share pack alike.
 */
export function resolveInputs(args: {
  stored: readonly StoredInput[]
  defaults: DefaultsSource
  view: View
  refurbItemIds: readonly string[]
}): ResolvedInputs {
  const { stored, defaults, view } = args
  const liveItems = new Set(args.refurbItemIds)
  const issues: ResolvedInputs["issues"] = []
  const values: Record<string, unknown> = {}
  const provenance: Record<string, Provenance> = {}

  const keys = [
    ...INPUT_DEFS.map((d) => d.key as string),
    ...args.refurbItemIds.map(refurbItemCostKey),
  ]
  for (const key of keys) {
    const definition = inputDef(key)
    if (!definition) continue
    const value = definition.defaultValue(defaults)
    values[key] = value
    provenance[key] = {
      origin: "default",
      agreedValue: value,
      differsFromAgreed: false,
      stored: null,
    }
  }

  const accept = (input: StoredInput): boolean => {
    const definition = inputDef(input.key)
    if (!definition) {
      issues.push({ key: input.key, reason: "Unknown input" })
      return false
    }
    const itemId = parseRefurbItemKey(input.key)
    if (itemId && !liveItems.has(itemId)) {
      issues.push({ key: input.key, reason: "Refurb line no longer exists" })
      return false
    }
    if (!definition.schema.safeParse(input.value).success) {
      issues.push({ key: input.key, reason: "Stored value is invalid" })
      return false
    }
    return true
  }

  for (const input of stored) {
    if (input.scope !== "agreed" || !accept(input)) continue
    values[input.key] = input.value
    provenance[input.key] = {
      origin: "agreed",
      agreedValue: input.value,
      differsFromAgreed: false,
      stored: input,
    }
  }

  const agreedValues = { ...values }

  if (view.kind === "user") {
    for (const input of stored) {
      if (
        input.scope !== "proposal" ||
        input.userId !== view.userId ||
        !accept(input)
      )
        continue
      const agreedValue = provenance[input.key]?.agreedValue
      values[input.key] = input.value
      provenance[input.key] = {
        origin: "proposal",
        agreedValue,
        differsFromAgreed: !sameValue(input.value, agreedValue),
        stored: input,
      }
    }
  }

  // Derived defaults: computed from this view's values; Agreed comparison uses Agreed values.
  for (const key of keys) {
    const definition = inputDef(key)
    const current = provenance[key]
    if (!definition?.derive || current?.origin !== "default") continue
    const value = definition.derive(values, defaults)
    const agreedValue = definition.derive(agreedValues, defaults)
    values[key] = value
    // Later derived inputs may depend on this one (tax treatment ← plan).
    agreedValues[key] = agreedValue
    provenance[key] = {
      origin: "default",
      derived: true,
      agreedValue,
      differsFromAgreed: !sameValue(value, agreedValue),
      stored: null,
    }
  }

  const diffKeys = Object.entries(provenance)
    .filter(([, p]) => p.differsFromAgreed)
    .map(([key]) => key)

  return { view, values, provenance, diffKeys, issues }
}
