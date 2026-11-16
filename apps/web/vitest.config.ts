import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      include: ["src/lib/**", "src/features/**/{schemas,rules,mappers}.ts"],
      exclude: ["**/*.test.ts", "**/fixtures.ts", "src/lib/supabase/**"],
      reporter: ["text-summary", "html"],
      thresholds: { "src/lib/calc/**": { lines: 95 } },
    },
  },
})
