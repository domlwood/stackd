import { EnvError, parseAdminEnv, parsePublicEnv, parseServerEnv } from "./env"

const valid = {
  NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
  SUPABASE_SERVICE_ROLE_KEY: "service",
}

describe("env", () => {
  it("runs the deployed app without a service-role key", () => {
    const runtime = { ...valid, SUPABASE_SERVICE_ROLE_KEY: undefined }
    expect(parseServerEnv(runtime).INGEST_RIGHTMOVE_ENABLED).toBe(true)
    expect(parseServerEnv(runtime)).not.toHaveProperty(
      "SUPABASE_SERVICE_ROLE_KEY"
    )
    expect(() => parseAdminEnv(runtime)).toThrow(/SUPABASE_SERVICE_ROLE_KEY/)
  })

  it("still requires and reads the service-role key for admin scripts", () => {
    expect(parseAdminEnv(valid).SUPABASE_SERVICE_ROLE_KEY).toBe("service")
  })
  it("parses valid public env", () => {
    expect(parsePublicEnv(valid).NEXT_PUBLIC_SUPABASE_URL).toBe(
      valid.NEXT_PUBLIC_SUPABASE_URL
    )
  })

  it("rejects a missing anon key with a readable message", () => {
    expect(() =>
      parsePublicEnv({ ...valid, NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined })
    ).toThrow(EnvError)
    expect(() =>
      parsePublicEnv({ ...valid, NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined })
    ).toThrow(/NEXT_PUBLIC_SUPABASE_ANON_KEY/)
  })

  it("rejects a non-URL supabase url", () => {
    expect(() =>
      parsePublicEnv({ ...valid, NEXT_PUBLIC_SUPABASE_URL: "not a url" })
    ).toThrow(EnvError)
  })

  it("defaults the Rightmove kill-switch to enabled", () => {
    expect(parseServerEnv(valid).INGEST_RIGHTMOVE_ENABLED).toBe(true)
    expect(
      parseServerEnv({ ...valid, INGEST_RIGHTMOVE_ENABLED: "false" })
        .INGEST_RIGHTMOVE_ENABLED
    ).toBe(false)
  })
})
