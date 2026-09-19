import { coreFetch } from "@/lib/core";
import { requireOrganizer } from "@/lib/org";

export async function GET(request: Request) {
  const gate = await requireOrganizer();
  if (gate instanceof Response) return gate;
  const event = new URL(request.url).searchParams.get("event") ?? "default";
  const res = await coreFetch(`/org/leaderboard?event=${encodeURIComponent(event)}`, {
    headers: { "x-user-id": gate.login },
  });
  const json = await res.json().catch(() => ({ error: "core unavailable" }));
  return Response.json(json, { status: res.status });
}
