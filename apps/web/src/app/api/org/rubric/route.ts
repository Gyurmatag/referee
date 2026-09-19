import { coreFetch } from "@/lib/core";
import { requireOrganizer } from "@/lib/org";

export async function PUT(request: Request) {
  const gate = await requireOrganizer();
  if (gate instanceof Response) return gate;
  const event = new URL(request.url).searchParams.get("event") ?? "default";
  const res = await coreFetch(`/org/rubric?event=${encodeURIComponent(event)}`, {
    method: "PUT",
    headers: { "x-user-id": gate.login },
    body: await request.text(),
  });
  const json = await res.json().catch(() => ({ error: "core unavailable" }));
  return Response.json(json, { status: res.status });
}
