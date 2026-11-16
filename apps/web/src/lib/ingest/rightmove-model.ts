/** Decode the reference-table page model seen in saved Rightmove listings.
 * Container values are table indices; primitive table entries are literal values.
 * Never execute the page's scripts. Invalid/unsupported data falls back to meta.
 */
export function decodeRightmoveModel(model: unknown): unknown {
  if (!model || typeof model !== "object" || Array.isArray(model)) return model
  const wrapper = model as Record<string, unknown>
  if (wrapper.encoding !== "on") return model
  if (typeof wrapper.data !== "string") return undefined

  try {
    const table: unknown = JSON.parse(wrapper.data)
    if (!Array.isArray(table) || !table.length || table.length > 100_000)
      return undefined
    const cache = new Map<number, unknown>()
    const active = new Set<number>()
    const resolve = (index: unknown, depth: number): unknown => {
      if (
        typeof index !== "number" ||
        !Number.isInteger(index) ||
        index < 0 ||
        index >= table.length ||
        depth > 100 ||
        active.has(index)
      )
        throw new Error("Unsupported page model reference")
      if (cache.has(index)) return cache.get(index)
      active.add(index)
      const entry: unknown = table[index]
      const value: unknown = Array.isArray(entry)
        ? entry.map((ref: unknown) => resolve(ref, depth + 1))
        : entry && typeof entry === "object"
          ? Object.fromEntries(
              Object.entries(entry).map(([key, ref]) => [
                key,
                resolve(ref, depth + 1),
              ])
            )
          : entry
      active.delete(index)
      cache.set(index, value)
      return value
    }
    return resolve(0, 0)
  } catch {
    return undefined
  }
}
