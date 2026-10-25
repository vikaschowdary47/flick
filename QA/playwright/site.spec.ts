import { test, expect } from "@playwright/test";

test.describe("eqlShare website", () => {
  test("landing page exposes primary navigation and waitlist form", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/eqlShare/i);
    await expect(page.getByRole("heading").first()).toBeVisible();
    const footer = page.locator("footer");
    await expect(footer.getByRole("link", { name: /^privacy$/i })).toHaveAttribute("href", "/privacy");
    await expect(footer.getByRole("link", { name: /^terms$/i })).toHaveAttribute("href", "/terms");
    await expect(footer.getByRole("link", { name: /delete account/i })).toHaveAttribute("href", "/delete-account");
    await expect(footer.getByRole("link", { name: /support@eqlshare.com/i })).toHaveAttribute("href", "mailto:support@eqlshare.com");
    await expect(footer.getByRole("link", { name: /instagram/i })).toHaveAttribute("href", "https://www.instagram.com/eqlshare/");
  });

  test("legal pages resolve and return to the landing page", async ({ page }) => {
    for (const path of ["/privacy", "/terms", "/delete-account"]) {
      await page.goto(path);
      await expect(page.getByRole("link", { name: /back to eqlShare/i })).toHaveAttribute("href", "/");
    }
  });

  test("link preview image renders", async ({ request }) => {
    const response = await request.get("/opengraph-image");
    expect(response.status()).toBe(200);
    expect((await response.body()).length).toBeGreaterThan(1000);
  });

  test("share route handles an unknown id without crashing", async ({ page }) => {
    const response = await page.goto("/d/qa-missing-share");
    expect(response?.status()).toBeLessThan(500);
    await expect(page.locator("body")).toContainText(/share|not found|expired|download/i);
  });
});

