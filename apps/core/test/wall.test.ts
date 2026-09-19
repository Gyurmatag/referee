import { describe, expect, it } from "vitest";
import { DEFAULT_TRACKS } from "@referee/shared";
import { publicEventFrom, wallPayloadFrom, wallTeamsFrom } from "../src/wall.js";

describe("wall payload", () => {
  it("exposes Budapest sponsor claims", () => {
    const event = publicEventFrom({
      id: "default",
      luma_url: "",
      title: "Budapest Build",
      city: "Budapest",
      venue: "Impact Hub Budapest",
      starts_at: "2026-09-19T07:00:00.000Z",
      ends_at: "2026-09-20T16:00:00.000Z",
      window_start: "2026-09-19T07:00:00.000Z",
      window_end: "2026-09-20T16:00:00.000Z",
      reveal_scores: false,
      quota_alert: false,
      tracks: DEFAULT_TRACKS,
      submissions: 2,
      judges_running: 1,
    });
    expect(event.city).toBe("Budapest");
    expect(event.claims.map((c) => c.id)).toContain("openai");
    expect(event.claims.map((c) => c.id)).toContain("elevenlabs");
    expect(event.claims.map((c) => c.id)).toContain("devin_role");
    expect(event.claims.map((c) => c.id)).not.toContain("cloudflare");
    expect(event.claims.map((c) => c.claim)).toContain("Cognition Devin API used");
  });

  it("lists consented teams with deploy urls", () => {
    const teams = wallTeamsFrom([
      {
        id: "sub_1",
        event_id: "default",
        user_id: "Gyurmatag",
        team_name: "Team Danube",
        repo_url: "https://github.com/Gyurmatag/budapest-voice-desk",
        live_url: "",
        claims: [],
        run_hints: "",
        has_secrets: false,
        devin_links: [],
        display_consent: true,
        head_sha: "",
        status: "queued",
        confidence: null,
        score: null,
        created_at: "2026-09-19T10:00:00.000Z",
        updated_at: "2026-09-19T10:00:00.000Z",
        queue_position: 1,
        provenance: null,
        judge_runs: [],
        deployment: null,
        review: {
          fork_repo: "https://github.com/Gyurmatag/budapest-voice-desk",
          pr_url: "",
          review_url: "https://hackathon-team-danube.cfi-ops.workers.dev",
          summary: "Sandbox review",
          summary_score: 0.9,
          screenshots: ["submissions/sub_1/review/evidence/e2e-home.png"],
        },
        external_verdict: null,
      },
    ]);
    expect(teams[0]?.team_name).toBe("Team Danube");
    expect(teams[0]?.created_at).toBe("2026-09-19T10:00:00.000Z");
    expect(teams[0]?.screenshots).toEqual(["submissions/sub_1/review/evidence/e2e-home.png"]);
    expect(teams[0]?.needs_login).toBe(false);
    const payload = wallPayloadFrom({
      event: publicEventFrom({
        id: "default",
        luma_url: "",
        title: "Budapest Build",
        starts_at: "2026-09-19T07:00:00.000Z",
        ends_at: "2026-09-20T16:00:00.000Z",
        window_start: "2026-09-19T07:00:00.000Z",
        window_end: "2026-09-20T16:00:00.000Z",
        reveal_scores: false,
        quota_alert: false,
        tracks: DEFAULT_TRACKS,
        submissions: 1,
        judges_running: 0,
      }),
      in_use: 0,
      queued: 1,
      quota_alert: false,
      submissions: [],
      events: [],
    });
    expect(payload.teams).toEqual([]);
    expect(payload.event.title).toBe("Budapest Build");
  });

  it("redacts team secrets from wall run hints", () => {
    const payload = wallPayloadFrom({
      event: publicEventFrom({
        id: "default",
        luma_url: "",
        title: "Budapest Build",
        starts_at: "2026-09-19T07:00:00.000Z",
        ends_at: "2026-09-20T16:00:00.000Z",
        window_start: "2026-09-19T07:00:00.000Z",
        window_end: "2026-09-20T16:00:00.000Z",
        reveal_scores: false,
        quota_alert: false,
        tracks: DEFAULT_TRACKS,
        submissions: 1,
        judges_running: 0,
      }),
      in_use: 0,
      queued: 0,
      quota_alert: false,
      submissions: [
        {
          id: "sub_2",
          event_id: "default",
          user_id: "Gyurmatag",
          team_name: "Team Danube",
          repo_url: "https://github.com/Gyurmatag/budapest-voice-desk",
          live_url: "",
          claims: [],
          run_hints: "OPENAI_API_KEY=sk-live\nDEMO_USER=ada",
          has_secrets: true,
          devin_links: [],
          display_consent: true,
          head_sha: "",
          status: "done",
          confidence: null,
          score: null,
          created_at: "2026-09-19T10:00:00.000Z",
          updated_at: "2026-09-19T10:00:00.000Z",
          queue_position: null,
          provenance: null,
          judge_runs: [],
          deployment: null,
          review: null,
          external_verdict: null,
        },
      ],
      events: [],
    });
    expect(payload.submissions[0]?.run_hints).toContain("OPENAI_API_KEY=***");
    expect(payload.submissions[0]?.run_hints).not.toContain("sk-live");
    expect(payload.submissions[0]?.run_hints).toContain("DEMO_USER=ada");
  });
});
