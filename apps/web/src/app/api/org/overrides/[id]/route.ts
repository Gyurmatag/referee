import { coreFetch } from "@/lib/core";
import { requireOrganizer } from "@/lib/org";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const gate = await requireOrganizer();
  if (gate instanceof Response) return gate;
  const { id } = await context.params;
  const res = await coreFetch(`/org/overrides/${id}`, {
    method: "PUT",
    headers: { "x-user-id": gate.login },
    body: await request.text(),
  });
  const json = await res.json().catch(() => ({ error: "core unavailable" }));
  return Response.json(json, { status: res.status });
}
