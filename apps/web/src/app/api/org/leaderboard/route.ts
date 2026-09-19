import { coreFetch } from "@/lib/core";
import { requireOrganizer } from "@/lib/org";

export async function GET() {
  const gate = await requireOrganizer();
  if (gate instanceof Response) return gate;
  const res = await coreFetch("/org/leaderboard", {
    headers: { "x-user-id": gate.login },
  });
  const json = await res.json().catch(() => ({ error: "core unavailable" }));
  return Response.json(json, { status: res.status });
}
