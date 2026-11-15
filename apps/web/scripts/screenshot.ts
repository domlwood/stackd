import { chromium, devices } from "@playwright/test"

const OUT = process.argv[2] ?? "."
const BASE = process.env.BASE_URL ?? "http://localhost:3000"

async function main() {
  const browser = await chromium.launch()
  for (const [label, device] of [
    ["mobile", devices["iPhone 13"]],
    ["desktop", { viewport: { width: 1280, height: 860 } }],
  ] as const) {
    for (const scheme of ["light", "dark"] as const) {
      const context = await browser.newContext({
        ...device,
        colorScheme: scheme,
      })
      const page = await context.newPage()
      const errors: string[] = []
      page.on("pageerror", (e) => errors.push(e.message))
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()))
      await page.goto(BASE + "/sign-in")
      await page.getByLabel("Email").fill(process.env.SEED_USER_A_EMAIL ?? "")
      await page
        .getByLabel("Password")
        .fill(process.env.SEED_USER_A_PASSWORD ?? "")
      await page.getByRole("button", { name: "Sign in" }).click()
      await page.waitForURL(BASE + "/")
      await page.screenshot({
        path: `${OUT}/pipeline-${label}-${scheme}.png`,
        fullPage: true,
      })
      await page.goto(BASE + "/finance?tab=products")
      await page.getByRole("heading", { name: "Finance products" }).waitFor()
      await page.screenshot({
        path: `${OUT}/products-${label}-${scheme}.png`,
        fullPage: true,
      })
      if (scheme === "light") {
        await page.getByRole("button", { name: /Example BTL Lender/ }).click()
        await page
          .getByRole("heading", { name: /Example BTL Lender/ })
          .waitFor()
        await page.waitForTimeout(400)
        await page.screenshot({ path: `${OUT}/product-sheet-${label}.png` })
        await page.keyboard.press("Escape")
        await page.goto(BASE + "/finance")
        await page.getByRole("heading", { name: "Fund pots" }).waitFor()
        await page.screenshot({
          path: `${OUT}/pots-${label}.png`,
          fullPage: true,
        })
      }
      console.log(
        label,
        scheme,
        errors.length ? "ERRORS: " + errors.join(" | ") : "no console errors"
      )
      await context.close()
    }
  }
  await browser.close()
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})
