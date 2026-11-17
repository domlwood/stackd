import { expect, test } from "@playwright/test"

test("unauthenticated visitors are redirected to sign-in", async ({ page }) => {
  await page.goto("/finance")
  await expect(page).toHaveURL(/\/sign-in\?next=%2Ffinance/)
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible()
})

test("there is no sign-up link", async ({ page }) => {
  await page.goto("/sign-in")
  await expect(page.getByRole("link", { name: /sign up/i })).toHaveCount(0)
})

test("wrong credentials show a plain-language error", async ({ page }) => {
  await page.goto("/sign-in")
  await page.getByLabel("Email").fill("nobody@example.com")
  await page.getByLabel("Password").fill("definitely-wrong-password")
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(
    page.getByText("That email and password don't match an account.")
  ).toBeVisible()
})

test("seeded user can sign in and sees the shell", async ({
  page,
  isMobile,
}) => {
  const email = process.env.SEED_USER_A_EMAIL
  const password = process.env.SEED_USER_A_PASSWORD
  test.skip(!email || !password, "SEED_USER_A_* not set")
  await page.goto("/sign-in")
  await page.getByLabel("Email").fill(email ?? "")
  await page.getByLabel("Password").fill(password ?? "")
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(
    page.getByRole("heading", { name: "Inbox", exact: true, level: 1 })
  ).toBeVisible()
  const primaryNav = isMobile
    ? page.getByRole("navigation", { name: "Primary" })
    : page.locator("[data-sidebar=sidebar]")
  await expect(primaryNav.getByRole("link", { name: "Finance" })).toBeVisible()
})
