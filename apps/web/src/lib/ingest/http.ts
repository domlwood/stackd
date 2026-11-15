/**
 * Outbound HTTP for ingestion: HTTPS only, host allowlist (SSRF guard), timeout,
 * bounded retries with jittered backoff, and a response size cap.
 */

export class IngestError extends Error {
  override name = "IngestError"
  constructor(
    message: string,
    readonly kind:
      "blocked" | "not_found" | "timeout" | "network" | "too_large" | "http"
  ) {
    super(message)
  }
}

export type FetchTextOptions = {
  allowedHosts: readonly string[]
  timeoutMs?: number
  retries?: number
  maxBytes?: number
  headers?: Record<string, string>
  fetchImpl?: typeof fetch
  signal?: AbortSignal
}

const DEFAULT_TIMEOUT_MS = 10_000
const DEFAULT_RETRIES = 2
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024
const BACKOFF_BASE_MS = 400

export const INGEST_USER_AGENT =
  "Mozilla/5.0 (compatible; DealAnalyser/1.0; personal use)"

export function assertAllowedUrl(
  raw: string,
  allowedHosts: readonly string[]
): URL {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new IngestError("That isn't a valid link.", "blocked")
  }
  if (url.protocol !== "https:")
    throw new IngestError("Only https links are supported.", "blocked")
  const host = url.hostname.toLowerCase()
  if (
    !allowedHosts.some(
      (allowed) => host === allowed || host.endsWith(`.${allowed}`)
    )
  ) {
    throw new IngestError("That site isn't supported.", "blocked")
  }
  return url
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function fetchText(
  raw: string,
  opts: FetchTextOptions
): Promise<string> {
  const url = assertAllowedUrl(raw, opts.allowedHosts)
  const fetchImpl = opts.fetchImpl ?? fetch
  const retries = opts.retries ?? DEFAULT_RETRIES
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES
  let lastError: IngestError | null = null

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    if (attempt > 0)
      await sleep(BACKOFF_BASE_MS * 2 ** (attempt - 1) * (0.5 + Math.random()))
    const controller = new AbortController()
    const timer = setTimeout(
      () => controller.abort(),
      opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
    )
    opts.signal?.addEventListener("abort", () => controller.abort(), {
      once: true,
    })
    try {
      const res = await fetchImpl(url, {
        headers: {
          "user-agent": INGEST_USER_AGENT,
          accept: "text/html,application/json",
          ...opts.headers,
        },
        signal: controller.signal,
        redirect: "follow",
      })
      // Redirects must stay on allowed hosts.
      if (res.url) assertAllowedUrl(res.url, opts.allowedHosts)
      if (res.status === 404 || res.status === 410)
        throw new IngestError("That listing no longer exists.", "not_found")
      if (!res.ok) {
        lastError = new IngestError(
          `The site responded with an error (${res.status}).`,
          "http"
        )
        if (res.status < 500 && res.status !== 429) throw lastError
        continue
      }
      const length = Number(res.headers.get("content-length") ?? 0)
      if (length > maxBytes)
        throw new IngestError("That page is too large to read.", "too_large")
      const text = await res.text()
      if (text.length > maxBytes)
        throw new IngestError("That page is too large to read.", "too_large")
      return text
    } catch (error) {
      if (error instanceof IngestError && error.kind !== "http") throw error
      if (error instanceof IngestError) throw error
      lastError =
        error instanceof Error && error.name === "AbortError"
          ? new IngestError("The site took too long to respond.", "timeout")
          : new IngestError("We couldn't reach the site.", "network")
    } finally {
      clearTimeout(timer)
    }
  }
  throw lastError ?? new IngestError("We couldn't reach the site.", "network")
}
