import { EventSchema } from "@referee/shared";
import { coreFetch } from "@/lib/core";
import { requireOrganizer } from "@/lib/org";

export async function PUT(request: Request) {
  const gate = await requireOrganizer();
  if (gate instanceof Response) return gate;
  const event = new URL(request.url).searchParams.get("event") ?? "default";
  const parsed = EventSchema.partial()
    .omit({ id: true })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid event" }, { status: 400 });
  const res = await coreFetch(`/org/event?event=${encodeURIComponent(event)}`, {
    method: "PUT",
    headers: { "x-user-id": gate.login },
    body: JSON.stringify(parsed.data),
  });
  const json = await res.json().catch(() => ({ error: "core unavailable" }));
  return Response.json(json, { status: res.status });
}
