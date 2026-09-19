import { describe, expect, it } from "vitest";
import {
  heuristicReviewScore,
  parentOfFirstInWindow,
  reviewUrlFromPr,
} from "../src/review/fork-pr.js";
import { E2E_CAPTURE_JS, reviewFromE2e } from "../src/review/sandbox-review-helpers.js";
import { parseLumaHtml, parseGuestCsv } from "../src/luma/event.js";
import { isQuotaSignature, retentionCutoff } from "../src/cron-helpers.js";

describe("review helpers", () => {
  it("rewrites the PR host to devinreview.com", () => {
    expect(reviewUrlFromPr("https://github.com/org/repo/pull/3")).toBe(
      "https://devinreview.com/org/repo/pull/3",
    );
  });

  it("picks the earliest commit as the review base", () => {
    const sha = parentOfFirstInWindow([
      { sha: "bb", at: "2026-09-19T02:00:00.000Z", author: "a", is_bot: false, coauthored_by_devin: false, additions: 1, deletions: 0 },
      { sha: "aa", at: "2026-09-19T01:00:00.000Z", author: "a", is_bot: false, coauthored_by_devin: false, additions: 1, deletions: 0 },
    ]);
    expect(sha).toBe("aa");
  });

  it("scores from provenance ratios", () => {
    expect(
      heuristicReviewScore({
        repo_created_at: "",
        is_fork: false,
        parent_repo: null,
        commits: [],
        in_window_ratio: 1,
        bot_commit_ratio: 0,
        coauthor_devin_ratio: 0,
        devin_prs: 0,
        notes: "",
      }),
    ).toBe(1);
  });

  it("scores a sandbox e2e review from clone and screenshots", () => {
    const review = reviewFromE2e({
      teamName: "Team Danube",
      repoUrl: "https://github.com/Gyurmatag/budapest-voice-desk",
      target: "https://hackathon-team-danube.cfi-ops.workers.dev",
      fileCount: 12,
      pass: 2,
      fail: 0,
      screenshots: ["submissions/sub_1/review/evidence/e2e-home.png"],
      provenance: {
        repo_created_at: "",
        is_fork: false,
        parent_repo: null,
        commits: [],
        in_window_ratio: 1,
        bot_commit_ratio: 0,
        coauthor_devin_ratio: 0,
        devin_prs: 0,
        notes: "",
      },
    });
    expect(review.summary).toContain("Sandbox review of Team Danube");
    expect(review.screenshots).toHaveLength(1);
    expect(review.summary_score).toBeGreaterThan(0.9);
    expect(review.pr_url).toBe("");
  });

  it("launches Chromium without a sandbox in the capture script", () => {
    expect(E2E_CAPTURE_JS).toContain("--no-sandbox");
    expect(E2E_CAPTURE_JS).toContain("/tmp/referee-target.txt");
    expect(E2E_CAPTURE_JS).toContain("/tmp/referee-demo.json");
    expect(E2E_CAPTURE_JS).not.toContain("Continue with Google");
  });
});

describe("luma and cron helpers", () => {
  it("parses JSON-LD events and guest CSV", () => {
    const html = `<script type="application/ld+json">{"@type":"Event","name":"Hack","startDate":"2026-09-19","endDate":"2026-09-20"}</script>`;
    expect(parseLumaHtml(html).title).toBe("Hack");
    expect(parseGuestCsv("email,name\na@b.com,Ada\nskip\n").map((r) => r.email)).toEqual(["a@b.com"]);
  });

  it("detects quota signatures and retention cutoff", () => {
    expect(isQuotaSignature(["no credentials", "login failed", "quota"])).toBe(true);
    expect(isQuotaSignature(["timeout", "timeout", "timeout"])).toBe(false);
    expect(retentionCutoff(new Date("2026-09-20T00:00:00.000Z"), 20)).toBe(
      "2026-09-19T04:00:00.000Z",
    );
  });
});
