import {
  claimsFromTracks,
  EventPublicSchema,
  type EventPublic,
  type Submission,
  type TracksConfig,
  type WallPayload,
} from "@referee/shared";

export function publicEventFrom(input: {
  id: string;
  luma_url: string;
  title: string;
  city?: string;
  venue?: string;
  starts_at: string;
  ends_at: string;
  window_start: string;
  window_end: string;
  reveal_scores: boolean;
  quota_alert: boolean;
  tracks: TracksConfig;
  submissions: number;
  judges_running: number;
}): EventPublic {
  return EventPublicSchema.parse({
    id: input.id,
    luma_url: input.luma_url,
    title: input.title,
    city: input.city || "Budapest",
    venue: input.venue || "Impact Hub Budapest",
    starts_at: input.starts_at,
    ends_at: input.ends_at,
    window_start: input.window_start,
    window_end: input.window_end,
    reveal_scores: input.reveal_scores,
    quota_alert: input.quota_alert,
    submissions: input.submissions,
    judges_running: input.judges_running,
    wall_enabled: true,
    claims: claimsFromTracks(input.tracks),
  });
}

export function wallTeamsFrom(submissions: Submission[]) {
  return submissions.map((s) => ({
    id: s.id,
    team_name: s.team_name,
    status: s.status,
    repo_url: s.repo_url,
    live_url: s.live_url || null,
    deploy_url: s.deployment?.url || s.live_url || null,
    phase: s.judge_runs[0]?.phase || s.status,
  }));
}

export function wallPayloadFrom(input: {
  event: EventPublic;
  in_use: number;
  queued: number;
  quota_alert: boolean;
  submissions: Submission[];
  events: { id?: number; submission_id: string; kind: string; message: string; at: string }[];
}): WallPayload {
  const judging = input.submissions.filter(
    (s) => s.status === "judging" || s.status === "deploying" || s.status === "queued",
  );
  return {
    event: input.event,
    in_use: input.in_use,
    queued: input.queued,
    quota_alert: input.quota_alert,
    judging,
    submissions: input.submissions,
    teams: wallTeamsFrom(input.submissions),
    events: input.events,
  };
}
