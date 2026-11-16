import { expect, test } from "@playwright/test"

test.skip(!process.env.SEED_USER_A_EMAIL, "SEED_USER_A_* not set")

test.beforeEach(async ({ page }) => {
  await page.goto("/sign-in")
  await page.getByLabel("Email").fill(process.env.SEED_USER_A_EMAIL ?? "")
  await page.getByLabel("Password").fill(process.env.SEED_USER_A_PASSWORD ?? "")
  await page.getByRole("button", { name: "Sign in" }).click()
  await page.waitForURL("**/")
})

test("create a deal manually, edit a number, pass with a reason, delete", async ({
  page,
}) => {
  const address = `E2E ${Date.now()} Test Street, Leeds`
  await page.goto("/deals/new")
  await page
    .getByRole("button", { name: "Enter details manually instead" })
    .click()
  await page.getByLabel("Address").fill(address)
  await page.getByLabel("Postcode").fill("ls6 1ab")
  await page.getByLabel("Asking price").fill("150k")
  await page.getByRole("button", { name: "Create deal" }).click()
  await expect(page.getByRole("heading", { name: address })).toBeVisible()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(10)
  await expect(page.getByText("LS6 1AB")).toBeVisible()

  // Both pipeline layouts must open above the shared summary on phones too.
  for (const layout of ["Board", "Table"]) {
    await page.goto("/")
    await page.getByLabel(layout, { exact: true }).click()
    await page.getByRole("link", { name: address }).first().click()
    await expect(page).toHaveURL(/\/deals\/[^/]+#top$/)
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(10)
    await expect(page.getByRole("heading", { name: address })).toBeInViewport()
  }

  // Refurb cost and end value are inline and saved on Enter.
  await page.getByLabel("Refurb cost").fill("25000")
  await page.getByLabel("Refurb cost").press("Enter")
  await page.getByLabel("End value").fill("210000")
  await page.getByLabel("End value").press("Enter")
  await expect(page.getByText("Using the asking price for now.")).toHaveCount(0)
  await expect(page.getByText("Saving…")).toHaveCount(0)

  await page.getByRole("link", { name: "Activity" }).click()
  await expect(page.getByText("set End value (GDV) to £210,000")).toBeVisible()
  await expect(page.getByText("set Refurb cost to £25,000")).toBeVisible()

  // Passing requires a reason.
  await page.getByRole("combobox").first().click()
  await page.getByRole("option", { name: "Passed" }).click()
  await page.getByRole("button", { name: "Pass on deal" }).click()
  await expect(page.getByText("Say why you're passing.")).toBeVisible()
  await page.getByLabel("Reason").fill("E2E: numbers don't work")
  await page.getByRole("button", { name: "Pass on deal" }).click()
  await expect(page.getByText("Moved to Passed")).toBeVisible()

  // Clean up.
  await page.getByRole("button", { name: "Deal actions" }).click()
  await page.getByRole("menuitem", { name: "Delete deal" }).click()
  await page.getByRole("button", { name: "Delete deal" }).click()
  await page.waitForURL("**/")
  await expect(page.getByText(address)).toHaveCount(0)
})

test("a non-Rightmove link falls back to manual entry with the link kept", async ({
  page,
}) => {
  await page.goto("/deals/new")
  await page
    .getByLabel("Rightmove link", { exact: true })
    .fill("https://www.example.com/some-house")
  await page.getByRole("button", { name: "Analyse", exact: true }).click()
  // Generous timeout: the first call compiles the server action in dev.
  await expect(
    page.getByText("That doesn't look like a Rightmove property link.")
  ).toBeVisible({ timeout: 15_000 })
  await expect(page.getByLabel("Listing link")).toHaveValue(
    "https://www.example.com/some-house"
  )
})
