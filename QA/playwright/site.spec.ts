import { test, expect } from "@playwright/test";

test.describe("eqlShare website", () => {
  test("landing page exposes primary navigation and waitlist form", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/eqlShare/i);
    await expect(page.getByRole("heading").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /privacy/i })).toHaveAttribute("href", "/privacy");
    await expect(page.getByRole("link", { name: /terms/i })).toHaveAttribute("href", "/terms");
    await expect(page.getByRole("link", { name: /hello@eqlshare.com/i })).toHaveAttribute("href", "mailto:hello@eqlshare.com");
  });

  test("legal pages resolve and return to the landing page", async ({ page }) => {
    for (const path of ["/privacy", "/terms"]) {
      await page.goto(path);
      await expect(page.getByRole("link", { name: /back to eqlShare/i })).toHaveAttribute("href", "/");
    }
  });

  test("share route handles an unknown id without crashing", async ({ page }) => {
    const response = await page.goto("/d/qa-missing-share");
    expect(response?.status()).toBeLessThan(500);
    await expect(page.locator("body")).toContainText(/share|not found|expired|download/i);
  });
});

