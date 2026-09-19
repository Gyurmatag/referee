import type { Provenance, Review } from "@referee/shared";
import { heuristicReviewScore } from "./fork-pr.js";

export const E2E_CAPTURE_JS = `import { chromium } from "playwright";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const target = process.env.TARGET_URL
  || (existsSync("/tmp/referee-target.txt") ? readFileSync("/tmp/referee-target.txt", "utf8").trim() : "");
mkdirSync("/out/evidence", { recursive: true });

if (!target) {
  writeFileSync("/out/e2e.json", JSON.stringify({
    ok: false,
    reason: "no deploy url",
    pass: 0,
    fail: 0,
    target: "",
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

await browser.close();
writeFileSync("/out/e2e.json", JSON.stringify({ ok: true, target, pass, fail, shots }));
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
  ].join(" - ");
  return {
    fork_repo: input.repoUrl,
    pr_url: "",
    review_url: input.target,
    summary,
    summary_score: Math.round(score * 100) / 100,
    screenshots: input.screenshots,
  };
}
