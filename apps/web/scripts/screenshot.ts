/**
 * Captures key screens at phone and desktop sizes (light + dark) for visual review.
 *   npm run screenshots -w web -- <out-dir>
 */
import { chromium, devices, type Page } from "@playwright/test"

const OUT = process.argv[2] ?? "."
const BASE = process.env.BASE_URL ?? "http://localhost:3000"

async function signIn(page: Page) {
  await page.goto(BASE + "/sign-in")
  await page.getByLabel("Email").fill(process.env.SEED_USER_A_EMAIL ?? "")
  await page.getByLabel("Password").fill(process.env.SEED_USER_A_PASSWORD ?? "")
  await page.getByRole("button", { name: "Sign in" }).click()
  await page.waitForURL(BASE + "/")
}

async function main() {
  const browser = await chromium.launch()
  const targets = [
    ["mobile", devices["iPhone 13"]],
    ["desktop", { viewport: { width: 1280, height: 900 } }],
  ] as const
  for (const [label, device] of targets) {
    for (const scheme of ["light", "dark"] as const) {
      const context = await browser.newContext({
        ...device,
        colorScheme: scheme,
      })
      const page = await context.newPage()
      const errors: string[] = []
      page.on("pageerror", (e) => errors.push(e.message))
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()))
      const shot = (name: string, fullPage = true) =>
        page.screenshot({
          path: `${OUT}/${name}-${label}-${scheme}.png`,
          fullPage,
        })

      await signIn(page)
      await page.getByRole("heading", { name: /Deals/ }).waitFor()
      await shot("pipeline")
      await page.goto(BASE + "/deals/new")
      await page.getByRole("button", { name: "Analyse", exact: true }).waitFor()
      await shot("new-deal", false)
      await page.goto(BASE + "/")

      await page
        .getByRole("link", { name: "8 Elm Grove, Sheffield" })
        .first()
        .click()
      await page
        .getByRole("heading", { name: "8 Elm Grove, Sheffield" })
        .waitFor()
      await page.waitForTimeout(300)
      await shot("deal")

      if (scheme === "light") {
        await page.getByRole("button", { name: /Purchase finance/ }).click()
        await page
          .getByRole("button", { name: /^Purchase\b/ })
          .first()
          .click()
        await page.waitForTimeout(300)
        await shot("deal-expanded")
        await page.getByRole("button", { name: /Exit B · Keep/ }).click()
        await page.getByRole("button", { name: /Rent \(monthly\)/ }).click()
        await page.getByRole("dialog").waitFor()
        await page.waitForTimeout(400)
        await shot("input-sheet", false)
        await page.keyboard.press("Escape")
        await page.goto(BASE + "/")
        await page
          .getByRole("radio", { name: "Table" })
          .or(page.getByRole("button", { name: "Table" }))
          .first()
          .click()
        await page.waitForTimeout(300)
        await shot("pipeline-table")
        await page
          .getByRole("radio", { name: "Board" })
          .or(page.getByRole("button", { name: "Board" }))
          .first()
          .click()
      }
      console.log(
        label,
        scheme,
        errors.length ? `ERRORS: ${errors.join(" | ")}` : "no console errors"
      )
      await context.close()
    }
  }
  await browser.close()
}

main().catch((e: unknown) => {
  console.error(e)
  process.exit(1)
})
