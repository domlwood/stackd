import { defineConfig, devices } from "@playwright/test"

const PORT = 3100
/** Point at an already-running server (e.g. E2E_BASE_URL=http://localhost:3000) to skip starting one. */
const EXTERNAL = process.env.E2E_BASE_URL

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: EXTERNAL ?? `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 13"] } },
  ],
  webServer: EXTERNAL
    ? undefined
    : {
        command: `npm run dev -- --port ${PORT}`,
        url: `http://localhost:${PORT}/sign-in`,
        reuseExistingServer: !process.env.CI,
      },
})
