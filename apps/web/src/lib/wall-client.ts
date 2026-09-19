export type WallRow = {
  id: string;
  team_name: string;
  status: string;
  repo_url?: string;
  live_url?: string | null;
  judge_runs?: { phase?: string }[];
};

export type WallTeam = {
  id: string;
  team_name: string;
  status: string;
  repo_url?: string;
  live_url?: string | null;
  deploy_url?: string | null;
  phase?: string;
  screenshots?: string[];
  created_at?: string;
  needs_login?: boolean;
};

export type WallLog = {
  id?: number;
  submission_id?: string;
  kind: string;
  message: string;
  at: string;
};

export type WallPayload = {
  event?: { title?: string; city?: string; venue?: string; submissions?: number };
  quota_alert?: boolean;
  in_use?: number;
  queued?: number;
  judging?: WallRow[];
  submissions?: WallRow[];
  teams?: WallTeam[];
  events?: WallLog[];
};

export const MILESTONE_KINDS = new Set(["submitted", "done", "failed", "takeover"]);

export function prettyKind(kind: string) {
  const labels: Record<string, string> = {
    submitted: "Submitted",
    build_e2e: "Build",
    provenance: "Provenance",
    tracks: "Tracks",
    review: "Review",
    deploy: "Deploy",
    done: "Judging finished",
    failed: "Judging failed",
    teardown: "Teardown",
    quota: "Quota",
    error: "Error",
    takeover: "Team login",
  };
  return labels[kind] ?? kind.replace(/_/g, " ");
}

export function prettyTime(at: string) {
  return at.replace("T", " ").replace(/\.\d+Z$/, " UTC").replace("Z", " UTC");
}

export function eventTone(kind: string, message = ""): "running" | "pass" | "fail" {
  if (kind === "failed" || kind === "error" || message.toLowerCase().includes("fail")) return "fail";
  if (kind === "done" || kind === "submitted") return "pass";
  if (kind === "takeover") return "running";
  return "running";
}

export function eventsForTeam(payload: WallPayload, id: string): WallLog[] {
  return [...(payload.events ?? [])]
    .filter((event) => event.submission_id === id)
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

export function milestoneEvents(payload: WallPayload): WallLog[] {
  const teams = payload.teams ?? [];
  const events = (payload.events ?? []).filter((event) => MILESTONE_KINDS.has(event.kind));
  const submitted = new Set(events.filter((event) => event.kind === "submitted").map((event) => event.submission_id));
  for (const team of teams) {
    if (!submitted.has(team.id) && team.created_at) {
      events.push({
        submission_id: team.id,
        kind: "submitted",
        message: `${team.team_name} submitted`,
        at: team.created_at,
      });
    }
  }
  const newestFirst = events.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const seen = new Set<string>();
  const unique: WallLog[] = [];
  for (const event of newestFirst) {
    const key = `${event.submission_id}:${event.kind}`;
    if (event.kind !== "failed" && seen.has(key)) continue;
    if (event.kind !== "failed") seen.add(key);
    unique.push(event);
  }
  return unique.slice(0, 16);
}

export function findTeam(payload: WallPayload, id: string): WallTeam | WallRow | undefined {
  return (
    payload.teams?.find((team) => team.id === id) ??
    payload.submissions?.find((row) => row.id === id) ??
    payload.judging?.find((row) => row.id === id)
  );
}
