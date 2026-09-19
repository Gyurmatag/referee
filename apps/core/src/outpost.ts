import type { CoreEnv } from "./db/queries.js";

export type OutpostStatus = {
  ok: boolean;
  id: string;
  name: string;
  platform: string;
  queue_depth: number;
  active_claims: number;
  worker: string;
};

export async function fetchOutpostStatus(env: CoreEnv): Promise<OutpostStatus | { ok: false; error: string }> {
  const id = env.DEVIN_OUTPOST_ID?.trim() || "";
  const token = (env.DEVIN_OUTPOSTS_TOKEN || env.DEVIN_API_TOKEN || "").trim();
  if (!id || !token) {
    return { ok: false, error: "outpost token or id missing" };
  }
  const res = await fetch(`https://api.devin.ai/opbeta/outposts/${id}`, {
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/json",
      "user-agent": "referee-core",
    },
  });
  if (!res.ok) {
    return { ok: false, error: `outpost api ${res.status}` };
  }
  const body = (await res.json()) as {
    metadata?: { outpost_id?: string };
    spec?: { name?: string; platform?: string };
    status?: { queue_depth?: number; active_claims?: number };
  };
  return {
    ok: true,
    id: body.metadata?.outpost_id || id,
    name: body.spec?.name || "referee",
    platform: body.spec?.platform || "",
    queue_depth: body.status?.queue_depth ?? 0,
    active_claims: body.status?.active_claims ?? 0,
    worker: "devin worker start",
  };
}
