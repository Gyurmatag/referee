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
  });

  it("lists consented teams with deploy urls", () => {
    const teams = wallTeamsFrom([
      {
        id: "sub_1",
        user_id: "Gyurmatag",
        team_name: "Team Danube",
        repo_url: "https://github.com/Gyurmatag/budapest-voice-desk",
        live_url: "",
        claims: [],
        run_hints: "",
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
        review: null,
        external_verdict: null,
      },
    ]);
    expect(teams[0]?.team_name).toBe("Team Danube");
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
});
