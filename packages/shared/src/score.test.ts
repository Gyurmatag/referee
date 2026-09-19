import { describe, expect, it } from "vitest";
import done from "./fixtures/submission.done.json";
import failed from "./fixtures/submission.failed.json";
import { aggregate, compareExternalVerdict } from "./score.js";
import { DEFAULT_RUBRIC, rubricWeightsSum } from "./schemas/rubric.js";
import { JudgeReportSchema } from "./schemas/judge-report.js";
import { SubmissionSchema, type Override } from "./schemas/submission.js";

function reportsOf(raw: unknown) {
  const sub = SubmissionSchema.parse(raw);
  return (sub.judge_runs ?? [])
    .map((r) => r.report)
    .filter((r): r is NonNullable<typeof r> => r !== null);
}

describe("aggregate", () => {
  it("weights sum to 100", () => {
    expect(rubricWeightsSum(DEFAULT_RUBRIC)).toBe(100);
  });

  it("scores a done submission from fixtures", () => {
    const sub = SubmissionSchema.parse(done);
    const card = aggregate({
      reports: reportsOf(done),
      provenance: sub.provenance,
      review: sub.review,
      rubric: DEFAULT_RUBRIC,
    });
    expect(card.dimensions).toHaveLength(5);
    const works = card.dimensions.find((d) => d.id === "works");
    expect(works?.value).toBeCloseTo((1 + 1 + 0.5) / 3);
    const provenance = card.dimensions.find((d) => d.id === "provenance");
    expect(provenance?.value).toBeCloseTo(0.67);
    const role = card.dimensions.find((d) => d.id === "devin_role");
    expect(role?.value).toBeCloseTo(0.8);
    const quality = card.dimensions.find((d) => d.id === "quality");
    expect(quality?.value).toBeCloseTo(0.8);
    const security = card.dimensions.find((d) => d.id === "security");
    expect(security?.value).toBe(1);
    expect(card.total).toBeCloseTo(
      (5 / 6) * 35 + 0.67 * 20 + 0.8 * 20 + 0.8 * 15 + 1 * 10,
    );
    expect(card.confidence).toBeCloseTo(0.9 * 0.85);
    expect(card.dimensions.every((d) => !d.overridden)).toBe(true);
  });

  it("penalizes failed builds and untestable claims", () => {
    const sub = SubmissionSchema.parse(failed);
    const card = aggregate({
      reports: reportsOf(failed),
      provenance: sub.provenance,
      review: sub.review,
      rubric: DEFAULT_RUBRIC,
    });
    const works = card.dimensions.find((d) => d.id === "works");
    expect(works?.value).toBeCloseTo((1 + 0 + 0) / 3);
    const security = card.dimensions.find((d) => d.id === "security");
    expect(security?.value).toBeCloseTo(0.75);
    expect(card.confidence).toBeCloseTo(Math.max(0, 0.4 - 0.15 - 0.08));
  });

  it("applies untestable penalties on a hand-built report", () => {
    const report = JudgeReportSchema.parse({
      judge: "build_e2e",
      phase: "done",
      build: { status: "ok", notes: "" },
      claims: [
        { claim: "a", result: "untestable" },
        { claim: "b", result: "untestable" },
        { claim: "c", result: "pass" },
      ],
      confidence: 1,
    });
    const card = aggregate({
      reports: [report],
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
      review: {
        fork_repo: "",
        pr_url: "",
        review_url: "",
        summary: "",
        summary_score: 1,
      },
      rubric: DEFAULT_RUBRIC,
    });
    expect(card.confidence).toBeCloseTo(1 - 0.08 * 2);
    expect(card.dimensions.find((d) => d.id === "works")?.value).toBeCloseTo(
      1 / 3,
    );
  });

  it("leaves the score untouched when an external verdict is present", () => {
    const sub = SubmissionSchema.parse(done);
    const withVerdict = aggregate({
      reports: reportsOf(done),
      provenance: sub.provenance,
      review: sub.review,
      rubric: DEFAULT_RUBRIC,
    });
    expect(sub.external_verdict?.source).toBe("Event AI judge");
    expect(withVerdict.total).toBeCloseTo(
      (5 / 6) * 35 + 0.67 * 20 + 0.8 * 20 + 0.8 * 15 + 1 * 10,
    );
  });

  it("overrides replace a computed dimension value", () => {
    const sub = SubmissionSchema.parse(done);
    const overrides: Override[] = [
      {
        submission_id: sub.id,
        dimension: "works",
        value: 0.2,
        note: "organizer saw a flake",
        by_user: "org",
        at: "2026-09-19T10:00:00.000Z",
      },
    ];
    const card = aggregate({
      reports: reportsOf(done),
      provenance: sub.provenance,
      review: sub.review,
      rubric: DEFAULT_RUBRIC,
      overrides,
    });
    const works = card.dimensions.find((d) => d.id === "works");
    expect(works?.value).toBe(0.2);
    expect(works?.overridden).toBe(true);
    expect(works?.note).toBe("organizer saw a flake");
  });
});

describe("compareExternalVerdict", () => {
  it("calls a verdict supported when it matches the executed evidence", () => {
    const sub = SubmissionSchema.parse(done);
    const cmp = compareExternalVerdict(sub.external_verdict, reportsOf(done));
    expect(cmp.external).toBeCloseTo(0.9);
    expect(cmp.evidence).toBeCloseTo((1 + 1 + 0.5) / 3);
    expect(cmp.agreement).toBe("supported");
    expect(cmp.testedClaims).toBe(3);
    expect(cmp.untestedClaims).toBe(0);
  });

  it("flags a verdict the evidence does not support", () => {
    const sub = SubmissionSchema.parse(failed);
    const cmp = compareExternalVerdict(sub.external_verdict, reportsOf(failed));
    expect(cmp.external).toBeCloseTo(0.8);
    // One claim passed, one failed, one was untestable and is excluded.
    expect(cmp.evidence).toBeCloseTo(0.5);
    expect(cmp.delta).toBeCloseTo(0.3);
    expect(cmp.agreement).toBe("optimistic");
    expect(cmp.untestedClaims).toBe(1);
  });

  it("reports unknown when there is nothing to compare", () => {
    expect(compareExternalVerdict(null, []).agreement).toBe("unknown");
    const sub = SubmissionSchema.parse(done);
    expect(compareExternalVerdict(sub.external_verdict, []).agreement).toBe(
      "unknown",
    );
  });

  it("calls a verdict pessimistic when the evidence is stronger", () => {
    const sub = SubmissionSchema.parse(done);
    const harsh = { ...sub.external_verdict!, score: 1, max: 5 };
    const cmp = compareExternalVerdict(harsh, reportsOf(done));
    expect(cmp.agreement).toBe("pessimistic");
  });
});
