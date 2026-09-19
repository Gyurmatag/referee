import { describe, expect, it } from "vitest";
import { buildWebhookPayload, webhookConfig } from "../src/runner/webhook-session.js";
import type { CoreEnv } from "../src/db/queries.js";

describe("webhook runner", () => {
  it("builds an ingest payload for Devin Automations", () => {
    const payload = buildWebhookPayload(
      {
        submissionId: "sub_1",
        judge: "build_e2e",
        repo: "https://github.com/a/b",
        sha: "abc",
        claims: [{ claim: "home" }],
        runHints: "",
        tracks: {},
        window: { start: "s", end: "e" },
        hints: "retry install",
        liveUrl: "https://example.com",
      },
      {
        report: "https://core/ingest/report/tok",
        evidence: "https://core/ingest/evidence/tok",
        outpost: "referee",
      },
    );
    expect(payload.ingest_report_url).toContain("/ingest/report/");
    expect(payload.outpost).toBe("referee");
    expect(payload.hints).toBe("retry install");
  });

  it("selects per-judge webhook credentials", () => {
    const env = {
      DEVIN_WEBHOOK_BUILD_URL: "https://hooks.devin.ai/build",
      DEVIN_WEBHOOK_BUILD_SECRET: "s1",
      DEVIN_WEBHOOK_TRACKS_URL: "https://hooks.devin.ai/tracks",
      DEVIN_WEBHOOK_TRACKS_SECRET: "s2",
    } as CoreEnv;
    expect(webhookConfig(env, "build_e2e").url).toContain("build");
    expect(webhookConfig(env, "tracks").secret).toBe("s2");
  });
});
