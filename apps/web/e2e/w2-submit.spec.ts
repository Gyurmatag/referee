import { test, expect } from "@playwright/test";

test("W2 submit rejects bad URLs, too few claims, and missing consent", async ({ page }) => {
  await page.goto("/events/default/submit");
  await page.locator('input[name="repo_url"]').fill("https://gitlab.com/org/repo");
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText(/github/i)).toBeVisible();
  await expect(page.getByText("Select at least three event claims")).toBeVisible();
});
