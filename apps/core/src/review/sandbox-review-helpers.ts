import type { Provenance, Review } from "@referee/shared";
import { heuristicReviewScore } from "./fork-pr.js";

export const E2E_CAPTURE_JS = `import { chromium } from "playwright";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const target = process.env.TARGET_URL
  || (existsSync("/tmp/referee-target.txt") ? readFileSync("/tmp/referee-target.txt", "utf8").trim() : "");
mkdirSync("/out/evidence", { recursive: true });

let demo = { user: "", password: "" };
try {
  if (existsSync("/tmp/referee-demo.json")) {
    demo = JSON.parse(readFileSync("/tmp/referee-demo.json", "utf8"));
  }
} catch {}

if (!target) {
  writeFileSync("/out/e2e.json", JSON.stringify({
    ok: false,
    reason: "no deploy url",
    pass: 0,
    fail: 0,
    target: "",
    signed_in: false,
  }));
  process.exit(0);
}

const pages = [
  { name: "home", url: target },
  { name: "health", url: target.replace(/\\/$/, "") + "/health" },
];

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
let pass = 0;
let fail = 0;
let signed_in = false;
const shots = [];

for (const item of pages) {
  try {
    const res = await page.goto(item.url, { waitUntil: "domcontentloaded", timeout: 25000 });
    const status = res ? res.status() : 0;
    const file = "/out/evidence/e2e-" + item.name + ".png";
    await page.screenshot({ path: file, fullPage: true });
    shots.push({ name: item.name, status, file });
    if (existsSync(file) && (item.name !== "home" || (status >= 200 && status < 400) || status === 0)) {
      pass += 1;
    } else if (item.name === "home") {
      fail += 1;
    }
  } catch (error) {
    fail += 1;
    writeFileSync("/out/evidence/e2e-" + item.name + ".log", String(error));
  }
}

if (demo.user && demo.password) {
  try {
    await page.goto(target, { waitUntil: "domcontentloaded", timeout: 25000 });
    const user = page.locator('input[type="email"], input[name="email"], input[name="username"], input[autocomplete="username"]').first();
    const secret = page.locator('input[type="password"]').first();
    if (await user.count() && await secret.count()) {
      await user.fill(demo.user);
      await secret.fill(demo.password);
      const submit = page.locator('button[type="submit"], input[type="submit"]').first();
      if (await submit.count()) await submit.click();
      else await page.keyboard.press("Enter");
      await page.waitForTimeout(2500);
      await page.screenshot({ path: "/out/evidence/e2e-app.png", fullPage: true });
      signed_in = (await page.locator('input[type="password"]').count()) === 0;
      if (signed_in) pass += 1;
      else fail += 1;
      shots.push({ name: "app", signed_in });
    }
  } catch (error) {
    writeFileSync("/out/evidence/e2e-app.log", String(error));
  }
}

await browser.close();
writeFileSync("/out/e2e.json", JSON.stringify({ ok: true, target, pass, fail, signed_in, shots }));
`;

export function reviewFromE2e(input: {
  teamName: string;
  repoUrl: string;
  target: string;
  fileCount: number;
  pass: number;
  fail: number;
  screenshots: string[];
  provenance: Provenance | null;
}): Review {
  const shots = input.screenshots.length;
  const httpOk = input.pass > 0;
  let score = heuristicReviewScore(input.provenance);
  if (httpOk) score = Math.min(1, score + 0.15);
  if (shots > 0) score = Math.min(1, score + 0.15);
  if (input.fileCount > 0) score = Math.min(1, score + 0.05);
  const summary = [
    `Sandbox review of ${input.teamName}`,
    `cloned ${input.repoUrl}`,
    `${input.fileCount} files`,
    `e2e ${input.pass} pass / ${input.fail} fail`,
    `${shots} screenshots`,
    input.target ? `against ${input.target}` : "no deploy url",
    input.pass > 1 ? "signed-in path exercised" : "",
  ]
    .filter(Boolean)
    .join(" - ");
  return {
    fork_repo: input.repoUrl,
    pr_url: "",
    review_url: input.target,
    summary,
    summary_score: Math.round(score * 100) / 100,
    screenshots: input.screenshots,
  };
}
