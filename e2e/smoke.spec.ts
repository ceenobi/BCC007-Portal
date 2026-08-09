import { expect, test } from "@playwright/test";

/**
 * Smoke gate — proves the production build path works end to end against a
 * real dev server + in-memory MongoDB. Hermetic by design: no external email,
 * QStash, Cloudinary or Paystack calls. Covers SSR render, middleware route
 * guards and client-side form validation.
 */
test.describe("BC007Portal smoke gate", () => {
  test("landing page renders server-side", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.ok()).toBe(true);
    await expect(page).toHaveTitle(/BCC007Pay/);
    await expect(
      page.getByRole("heading", { name: /great minds, great feats/i }),
    ).toBeVisible();
  });

  test("health page renders", async ({ page }) => {
    const response = await page.goto("/health");
    expect(response?.ok()).toBe(true);
    await expect(page).toHaveTitle(/System Status/i);
  });

  test("unauthenticated guests are redirected to login", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/\/auth\/login/);
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
  });

  test("login form shows client-side validation errors", async ({ page }) => {
    await page.goto("/auth/login");
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByRole("heading", { name: /welcome back/i }),
    ).toBeVisible();
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByText(/complete this field/i).first()).toBeVisible();
  });

  test("register form shows client-side validation errors", async ({ page }) => {
    await page.goto("/auth/register");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: /get started/i })).toBeVisible();
    await page.getByRole("button", { name: /register/i }).click();
    await expect(page.getByText(/complete this field/i).first()).toBeVisible();
  });
});
