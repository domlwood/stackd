import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import { publicEnv } from "@/lib/env"
import type { Database } from "./database.types"

/** Paths reachable without a session. */
export const PUBLIC_PATH_PREFIXES = ["/sign-in", "/share/"] as const

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix)
  )
}

/**
 * Refreshes the auth session cookie on every request and redirects
 * unauthenticated visitors to sign-in. Authorisation is still enforced by
 * requireSession() and RLS; this is only the optimistic gate.
 */
export async function updateSession(request: NextRequest) {
  const env = publicEnv()
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value } of cookiesToSet)
            request.cookies.set(name, value)
          response = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet)
            response.cookies.set(name, value, options)
        },
      },
    }
  )

  const { data } = await supabase.auth.getClaims()
  const signedIn = Boolean(data?.claims?.sub)
  const { pathname } = request.nextUrl

  if (!signedIn && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = "/sign-in"
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`
    return NextResponse.redirect(url)
  }

  if (signedIn && pathname === "/sign-in") {
    const url = request.nextUrl.clone()
    url.pathname = "/inbox"
    url.search = ""
    return NextResponse.redirect(url)
  }

  return response
}
