import { describe, expect, it } from "vitest";
import { FixtureRunner } from "../src/runner/fixture.js";
import { isTerminalPhase, lastLines, timedOut } from "../src/runner/types.js";

describe("runner helpers", () => {
  it("keeps the last 40 log lines", () => {
    const text = Array.from({ length: 50 }, (_, i) => `line ${i + 1}`).join("\n");
    const tail = lastLines(text, 40);
    expect(tail.split("\n")).toHaveLength(40);
    expect(tail.startsWith("line 11")).toBe(true);
  });

  it("detects terminal phases and timeouts", () => {
    expect(isTerminalPhase("done")).toBe(true);
    expect(isTerminalPhase("building")).toBe(false);
    expect(timedOut("2026-09-19T00:00:00.000Z", Date.parse("2026-09-19T00:21:00.000Z"), 20)).toBe(
      true,
    );
    expect(timedOut("2026-09-19T00:00:00.000Z", Date.parse("2026-09-19T00:10:00.000Z"), 20)).toBe(
      false,
    );
  });

  it("fixture runner finishes judge1 after two polls", async () => {
    const runner = new FixtureRunner();
    const { runId } = await runner.start({
      submissionId: "sub_test",
      judge: "build_e2e",
      repo: "https://github.com/example/app",
      sha: "abc",
      claims: [{ claim: "a" }, { claim: "b" }, { claim: "c" }],
      runHints: "",
      tracks: {},
      window: { start: "", end: "" },
      hints: "",
    });
    const first = await runner.poll(runId);
    expect(first.phase).toBe("building");
    const second = await runner.poll(runId);
    expect(second.phase).toBe("done");
    expect(second.report?.build.status).toBe("ok");
    expect(second.report?.claims).toHaveLength(3);
  });
});
