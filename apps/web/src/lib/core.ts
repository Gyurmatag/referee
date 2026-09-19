import { DEFAULT_TRACKS, EventPublicSchema, claimsFromTracks, type EventPublic } from "@referee/shared";

export const DEFAULT_EVENT: EventPublic = EventPublicSchema.parse({
  id: "default",
  title: "Event",
  city: "",
  venue: "",
  starts_at: "2026-09-19T07:00:00.000Z",
  ends_at: "2026-09-20T16:00:00.000Z",
  window_start: "2026-09-19T07:00:00.000Z",
  window_end: "2026-09-20T16:00:00.000Z",
  submissions: 0,
  judges_running: 0,
  wall_enabled: true,
  claims: claimsFromTracks(DEFAULT_TRACKS),
});


export function formatWindow(start: string, end: string): string {
  const a = start.replace("T", " ").replace(".000Z", " UTC");
  const b = end.replace("T", " ").replace(".000Z", " UTC");
  return `${a} to ${b}`;
}

export async function coreFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("x-internal-key", process.env.INTERNAL_API_KEY ?? "");
  if (!headers.has("user-agent")) {
    headers.set(
      "user-agent",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    );
  }
  if (!headers.has("content-type") && init.body) {
    headers.set("content-type", "application/json");
  }

  const base = process.env.CORE_URL;
  if (base) {
    return fetch(`${base}${path}`, { ...init, headers });
  }
  const binding = await getCoreBinding();
  if (binding) {
    return binding.fetch(`https://core${path}`, { ...init, headers });
  }
  return fetch(`http://127.0.0.1:8787${path}`, { ...init, headers });
}

async function getCoreBinding(): Promise<{ fetch: typeof fetch } | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext({ async: true });
    const core = (env as { CORE?: { fetch: typeof fetch } }).CORE;
    return core ?? null;
  } catch {
    return null;
  }
}
