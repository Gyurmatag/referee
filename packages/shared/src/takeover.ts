export const TAKEOVER_STATUS_PATH = "/tmp/takeover/status.json";
export const TAKEOVER_DONE_PATH = "/tmp/takeover/done";
export const TAKEOVER_INBOX = "/tmp/takeover/inbox";
export const TAKEOVER_FRAME_PATH = "/tmp/takeover/frame.png";
export const TAKEOVER_PORT = 8790;
export const TAKEOVER_VIEW = { width: 1280, height: 800 } as const;
export const TAKEOVER_LIMIT_MS = 12 * 60 * 1000;

export type TakeoverCommand =
  | { type: "click"; x: number; y: number }
  | { type: "type"; text: string }
  | { type: "key"; key: string }
  | { type: "done" };

export type TakeoverState = "idle" | "starting" | "waiting" | "done" | "failed";

export type TakeoverStatus = {
  state: TakeoverState;
  reason: string;
  url: string;
  signed_in: boolean;
  oauth: number;
  password: number;
  takeover: boolean;
};

const COMMAND_TYPES = new Set(["click", "type", "key", "done"]);

export function loginWallFromCounts(password: number, oauth: number): boolean {
  return password > 0 || oauth > 0;
}

export function takeoverReason(password: number, oauth: number): string {
  if (oauth > 0) return "Team can take over the isolated browser and finish Google or GitHub login";
  if (password > 0) return "Team can take over the isolated browser and sign in";
  return "";
}

export function parseTakeoverCommand(raw: unknown): TakeoverCommand | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as { type?: unknown; x?: unknown; y?: unknown; text?: unknown; key?: unknown };
  if (!COMMAND_TYPES.has(String(row.type))) return null;
  if (row.type === "click") {
    const x = Number(row.x);
    const y = Number(row.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { type: "click", ...clampPoint(x, y) };
  }
  if (row.type === "type") {
    const text = String(row.text ?? "");
    if (!text) return null;
    return { type: "type", text: text.slice(0, 400) };
  }
  if (row.type === "key") {
    const key = String(row.key ?? "");
    if (!key) return null;
    return { type: "key", key: key.slice(0, 40) };
  }
  return { type: "done" };
}

export function parseTakeoverStatus(raw: unknown): TakeoverStatus | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const state = String(row.state || "idle") as TakeoverState;
  if (!["idle", "starting", "waiting", "done", "failed"].includes(state)) return null;
  return {
    state,
    reason: String(row.reason || ""),
    url: String(row.url || ""),
    signed_in: Boolean(row.signed_in),
    oauth: Number(row.oauth || 0) || 0,
    password: Number(row.password || 0) || 0,
    takeover: Boolean(row.takeover),
  };
}

export function clampPoint(
  x: number,
  y: number,
  width = TAKEOVER_VIEW.width,
  height = TAKEOVER_VIEW.height,
) {
  return {
    x: Math.max(0, Math.min(width - 1, Math.round(x))),
    y: Math.max(0, Math.min(height - 1, Math.round(y))),
  };
}

export function mapClickToViewport(
  offsetX: number,
  offsetY: number,
  clientWidth: number,
  clientHeight: number,
) {
  const width = clientWidth || TAKEOVER_VIEW.width;
  const height = clientHeight || TAKEOVER_VIEW.height;
  return clampPoint(
    (offsetX / width) * TAKEOVER_VIEW.width,
    (offsetY / height) * TAKEOVER_VIEW.height,
  );
}
