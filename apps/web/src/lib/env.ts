import { z } from "zod"

/**
 * Environment validation. Public vars are inlined by Next at build time, so
 * they must be referenced explicitly (not via a dynamic process.env lookup).
 */
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
})

const serverSchema = publicSchema.extend({
  INGEST_RIGHTMOVE_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
})

const adminSchema = publicSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
})

export type PublicEnv = z.infer<typeof publicSchema>
export type ServerEnv = z.infer<typeof serverSchema>
export type AdminEnv = z.infer<typeof adminSchema>

export class EnvError extends Error {
  override name = "EnvError"
}

function format(issues: z.core.$ZodIssue[]): string {
  return issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n")
}

export function parsePublicEnv(
  source: Record<string, string | undefined>
): PublicEnv {
  const result = publicSchema.safeParse(source)
  if (!result.success) {
    throw new EnvError(
      `Invalid public environment variables:\n${format(result.error.issues)}\nSee apps/web/.env.example.`
    )
  }
  return result.data
}

export function parseServerEnv(
  source: Record<string, string | undefined>
): ServerEnv {
  const result = serverSchema.safeParse(source)
  if (!result.success) {
    throw new EnvError(
      `Invalid server environment variables:\n${format(result.error.issues)}\nSee apps/web/.env.example.`
    )
  }
  return result.data
}

export const publicEnv = (): PublicEnv =>
  parsePublicEnv({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  })

export const serverEnv = (): ServerEnv => parseServerEnv(process.env)

/** Only local account/seed scripts need the privileged service-role key. */
export function parseAdminEnv(
  source: Record<string, string | undefined>
): AdminEnv {
  const result = adminSchema.safeParse(source)
  if (!result.success) {
    throw new EnvError(
      `Invalid admin environment variables:\n${format(result.error.issues)}\nSee apps/web/.env.example.`
    )
  }
  return result.data
}
