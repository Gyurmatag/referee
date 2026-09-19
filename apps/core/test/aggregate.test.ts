import { describe, expect, it } from "vitest";
import { aggregate, DEFAULT_RUBRIC, fixtures, SubmissionSchema } from "@referee/shared";

describe("core wiring", () => {
  it("aggregates the done fixture the same way shared does", () => {
    const sub = SubmissionSchema.parse(fixtures.done);
    const reports = sub.judge_runs
      .map((r) => r.report)
      .filter((r): r is NonNullable<typeof r> => r !== null);
    const card = aggregate({
      reports,
      provenance: sub.provenance,
      review: sub.review,
      rubric: DEFAULT_RUBRIC,
    });
    expect(card.total).toBeGreaterThan(50);
    expect(card.confidence).toBeGreaterThan(0.5);
  });
});
