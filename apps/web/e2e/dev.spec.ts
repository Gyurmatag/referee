import { test, expect } from "@playwright/test";

test("dev page cycles fixtures", async ({ page }) => {
  await page.goto("/dev");
  await expect(page.getByRole("heading", { name: "Component fixtures" })).toBeVisible();
  await expect(page.getByText("North Star")).toBeVisible();
});
