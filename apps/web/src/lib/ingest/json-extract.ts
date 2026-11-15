/** Extracts a balanced JSON object literal starting at the first "{" after `marker`. */
export function extractJsonAfter(
  html: string,
  marker: string | RegExp
): unknown {
  const match =
    typeof marker === "string"
      ? { index: html.indexOf(marker), length: marker.length }
      : (() => {
          const m = marker.exec(html)
          return m
            ? { index: m.index, length: m[0].length }
            : { index: -1, length: 0 }
        })()
  if (match.index < 0) return undefined
  const start = html.indexOf("{", match.index + match.length)
  if (start < 0) return undefined

  let depth = 0
  let inString = false
  let escaped = false
  for (let i = start; i < html.length; i += 1) {
    const ch = html[i]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === "\\") escaped = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') inString = true
    else if (ch === "{") depth += 1
    else if (ch === "}") {
      depth -= 1
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(start, i + 1))
        } catch {
          return undefined
        }
      }
    }
  }
  return undefined
}

/** Depth-first search for the first object satisfying `predicate`. */
export function findObject(
  root: unknown,
  predicate: (o: Record<string, unknown>) => boolean,
  maxDepth = 12
): Record<string, unknown> | undefined {
  const stack: { node: unknown; depth: number }[] = [{ node: root, depth: 0 }]
  while (stack.length) {
    const { node, depth } = stack.pop() as { node: unknown; depth: number }
    if (!node || typeof node !== "object" || depth > maxDepth) continue
    if (!Array.isArray(node) && predicate(node as Record<string, unknown>))
      return node as Record<string, unknown>
    for (const child of Object.values(node as Record<string, unknown>))
      stack.push({ node: child, depth: depth + 1 })
  }
  return undefined
}

export function scriptContents(html: string, typeAttr: string): string[] {
  const pattern = new RegExp(
    `<script[^>]*type=["']${typeAttr.replace(/[/+]/g, "\\$&")}["'][^>]*>([\\s\\S]*?)</script>`,
    "gi"
  )
  return [...html.matchAll(pattern)].map((m) => m[1] ?? "")
}

export function metaContent(
  html: string,
  property: string
): string | undefined {
  const a = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*)["']`,
    "i"
  ).exec(html)
  const b = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${property}["']`,
    "i"
  ).exec(html)
  const raw = a?.[1] ?? b?.[1]
  return raw === undefined ? undefined : decodeEntities(raw)
}

export function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&pound;/g, "£")
    .replace(/&nbsp;/g, " ")
}

export function stripTags(s: string): string {
  return decodeEntities(s.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, ""))
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}
