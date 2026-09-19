import { describe, expect, it } from "vitest";
import done from "./fixtures/submission.done.json";
import failed from "./fixtures/submission.failed.json";
import running from "./fixtures/submission.running.json";
import { EventSchema } from "./schemas/event.js";
import { JudgeReportSchema } from "./schemas/judge-report.js";
import { RubricSchema, DEFAULT_RUBRIC } from "./schemas/rubric.js";
import { RecipeSchema } from "./schemas/run-recipe.js";
import { SubmissionSchema } from "./schemas/submission.js";
import { TracksConfigSchema, DEFAULT_TRACKS, claimsFromTracks } from "./schemas/track.js";

describe("zod fixtures", () => {
  it("parses submission fixtures", () => {
    expect(SubmissionSchema.parse(done).id).toBe("sub_done_1");
    expect(SubmissionSchema.parse(running).status).toBe("judging");
    expect(SubmissionSchema.parse(failed).status).toBe("failed");
  });

  it("parses nested judge reports from fixtures", () => {
    for (const raw of [done, running, failed]) {
      const sub = SubmissionSchema.parse(raw);
      for (const run of sub.judge_runs) {
        if (run.report) {
          expect(JudgeReportSchema.parse(run.report).phase).toBe(run.phase);
        }
      }
    }
  });

  it("parses default rubric, tracks, recipe and event", () => {
    expect(RubricSchema.parse(DEFAULT_RUBRIC).dimensions).toHaveLength(5);
    expect(TracksConfigSchema.parse(DEFAULT_TRACKS).tracks.length).toBeGreaterThanOrEqual(5);
    expect(claimsFromTracks(DEFAULT_TRACKS).map((c) => c.sponsor)).toContain("OpenAI");
    expect(RecipeSchema.parse({ start: "npm start", port: 8080 }).port).toBe(8080);
    expect(
      EventSchema.parse({
        id: "evt1",
        title: "Hack",
        starts_at: "2026-09-19T00:00:00.000Z",
        ends_at: "2026-09-20T00:00:00.000Z",
        window_start: "2026-09-19T00:00:00.000Z",
        window_end: "2026-09-20T00:00:00.000Z",
      }).title,
    ).toBe("Hack");
  });

  it("defaults the integrity block when a judge omits it", () => {
    const report = JudgeReportSchema.parse({ phase: "done" });
    expect(report.integrity.injection_found).toBe(0);
    expect(report.integrity.findings).toEqual([]);
  });

  it("keeps integrity findings reported by a judge", () => {
    const sub = SubmissionSchema.parse(failed);
    const integrity = sub.judge_runs[0]?.report?.integrity;
    expect(integrity?.injection_found).toBe(1);
    expect(integrity?.findings[0]?.file).toBe("README.md");
  });

  it("rejects a report with a wrong phase", () => {
    const result = JudgeReportSchema.safeParse({
      judge: "build_e2e",
      phase: "queued",
      summary: "nope",
    });
    expect(result.success).toBe(false);
  });
});
