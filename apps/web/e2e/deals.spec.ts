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
  await page.getByLabel("Address").fill(address)
  await page.getByLabel("Postcode").fill("ls6 1ab")
  await page.getByLabel("Asking price").fill("150k")
  await page.getByRole("button", { name: "Create deal" }).click()
  await expect(page.getByRole("heading", { name: address })).toBeVisible()
  await expect(page.getByText("LS6 1AB")).toBeVisible()

  // Edit the end value: analysis recalculates and the change is logged.
  await page
    .getByRole("button", { name: /End value \(GDV\)/ })
    .first()
    .click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel("Value", { exact: true }).fill("210000")
  await dialog.getByLabel("Source", { exact: true }).fill("E2E comparables")
  await dialog.getByRole("button", { name: "Save" }).click()
  await expect(
    page.getByRole("button", { name: /End value \(GDV\).*£210,000/ }).first()
  ).toBeVisible()

  await page.getByRole("link", { name: "Activity" }).click()
  await expect(page.getByText("set End value (GDV) to £210,000")).toBeVisible()

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
