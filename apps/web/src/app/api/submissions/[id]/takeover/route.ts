import { coreFetch } from "@/lib/core";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  try {
    const res = await coreFetch(`/submissions/${id}/takeover`);
    const json = await res.json().catch(() => ({ error: "core unavailable" }));
    return Response.json(json, { status: res.status });
  } catch {
    return Response.json({ error: "core unavailable" }, { status: 502 });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const done = body && typeof body === "object" && (body as { type?: string }).type === "done";
  try {
    const res = await coreFetch(
      done ? `/submissions/${id}/takeover/done` : `/submissions/${id}/takeover/input`,
      {
        method: "POST",
        body: JSON.stringify(body ?? {}),
      },
    );
    const json = await res.json().catch(() => ({ error: "core unavailable" }));
    return Response.json(json, { status: res.status });
  } catch {
    return Response.json({ error: "core unavailable" }, { status: 502 });
  }
}
