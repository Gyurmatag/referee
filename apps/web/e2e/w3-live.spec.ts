import { test, expect } from "@playwright/test";
import { fixtures, SubmissionSchema } from "@referee/shared";

test("W3 live page updates phase and log tail without reload", async ({ page }) => {
  const running = SubmissionSchema.parse(fixtures.running);
  let phase = "building";
  let tail = "npm ci\ncompiling...";
  await page.route("**/api/submissions/sub_w3", async (route) => {
    await route.fulfill({
      json: {
        ...running,
        id: "sub_w3",
        judge_runs: running.judge_runs.map((run) => ({
          ...run,
          phase,
          log_tail: tail,
        })),
      },
    });
  });

  await page.goto("/s/sub_w3");
  await expect(page.getByText("building")).toBeVisible();
  await expect(page.getByText("compiling...")).toBeVisible();

  phase = "testing";
  tail = "claim 1 pass\nclaim 2 running";
  await expect(page.getByText("testing")).toBeVisible({ timeout: 8000 });
  await expect(page.getByText("claim 2 running")).toBeVisible();
});
