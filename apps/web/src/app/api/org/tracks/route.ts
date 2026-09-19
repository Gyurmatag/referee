import { TracksConfigSchema } from "@referee/shared";
import { coreFetch } from "@/lib/core";
import { requireOrganizer } from "@/lib/org";

export async function PUT(request: Request) {
  const gate = await requireOrganizer();
  if (gate instanceof Response) return gate;
  const parsed = TracksConfigSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid tracks" }, { status: 400 });
  const res = await coreFetch("/org/tracks", {
    method: "PUT",
    headers: { "x-user-id": gate.login },
    body: JSON.stringify(parsed.data),
  });
  const json = await res.json().catch(() => ({ error: "core unavailable" }));
  return Response.json(json, { status: res.status });
}
