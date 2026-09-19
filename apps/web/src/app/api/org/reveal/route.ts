import { coreFetch } from "@/lib/core";
import { requireOrganizer } from "@/lib/org";

export async function PUT(request: Request) {
  const gate = await requireOrganizer();
  if (gate instanceof Response) return gate;
  const res = await coreFetch("/org/reveal", {
    method: "PUT",
    headers: { "x-user-id": gate.login },
    body: await request.text(),
  });
  const json = await res.json().catch(() => ({ error: "core unavailable" }));
  return Response.json(json, { status: res.status });
}
