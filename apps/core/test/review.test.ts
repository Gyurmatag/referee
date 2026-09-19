import { describe, expect, it } from "vitest";
import {
  heuristicReviewScore,
  parentOfFirstInWindow,
  reviewUrlFromPr,
} from "../src/review/fork-pr.js";
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
