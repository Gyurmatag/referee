import { DEFAULT_TRACKS, JudgeReportSchema, type JudgeReport, type Phase } from "@referee/shared";
import type { JudgeInput, JudgeRunner } from "./types.js";

/** Deterministic runner for local pipeline tests. Never talks to Devin. */
export class FixtureRunner implements JudgeRunner {
  private runs = new Map<
    string,
    { ticks: number; input: JudgeInput; done: boolean }
  >();

  async start(input: JudgeInput): Promise<{ runId: string }> {
    const runId = `fix_${input.submissionId}_${input.judge}`;
    this.runs.set(runId, { ticks: 0, input, done: false });
    return { runId };
  }

  async poll(runId: string) {
    const run = this.runs.get(runId);
    if (!run) {
      return { phase: "failed" as Phase, logTail: "unknown run", report: null, exited: true };
    }
    run.ticks += 1;
    if (run.ticks < 2) {
      return {
        phase: "building" as Phase,
        logTail: "fixture runner\ninstall ok\nbuilding",
        report: fixtureReport(run.input, "building"),
        exited: false,
      };
    }
    run.done = true;
    return {
      phase: "done" as Phase,
      logTail: "fixture runner\ninstall ok\nbuild ok\nclaims pass",
      report: fixtureReport(run.input, "done"),
      exited: true,
    };
  }

  async cancel(runId: string): Promise<void> {
    this.runs.delete(runId);
  }

  async collect(runId: string) {
    const run = this.runs.get(runId);
    return {
      transcriptKey: null,
      evidenceKeys: [] as string[],
      report: run ? fixtureReport(run.input, "done") : null,
    };
  }
}

function fixtureReport(input: JudgeInput, phase: Phase): JudgeReport {
  return JudgeReportSchema.parse({
    judge: input.judge,
    phase,
    build: { status: phase === "done" ? "ok" : "skipped", notes: "fixture" },
    recipe: {
      install: "npm ci",
      build: "npm run build",
      start: "npm start",
      port: 3000,
      env: {},
      needs_db: false,
      notes: "",
    },
    claims:
      input.judge === "build_e2e"
        ? input.claims.map((c) => ({
            claim: c.claim,
            test: "fixture",
            result: phase === "done" ? "pass" : "untestable",
            evidence: [],
            notes: phase === "done" ? "fixture pass" : "",
          }))
        : [],
    tracks:
      input.judge === "tracks"
        ? DEFAULT_TRACKS.tracks.map((t) => ({
            track: t.id,
            score: phase === "done" ? 4 : 0,
            max: 5,
            evidence: ["fixture"],
            notes: "fixture track",
          }))
        : [],
    confidence: phase === "done" ? 0.7 : 0,
    summary:
      phase === "done"
        ? input.judge === "tracks"
          ? "Fixture runner completed tracks."
          : "Fixture runner completed judge1."
        : "",
  });
}
