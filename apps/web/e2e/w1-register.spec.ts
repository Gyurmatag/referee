import { test, expect } from "@playwright/test";

test("W1 register shows event window and GitHub sign-in", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Referee event" })).toBeVisible();
  await expect(page.getByText(/Window 2026-09-19/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with GitHub" })).toBeVisible();
  await page.getByPlaceholder("you@example.com").fill("judge@example.com");
  await page.getByRole("button", { name: "Continue with GitHub" }).click();
  const saved = await page.request.get("/api/me/luma");
  expect(await saved.json()).toEqual({ luma_email: "judge@example.com" });
});
