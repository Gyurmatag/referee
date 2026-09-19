import { coreFetch } from "@/lib/core";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  try {
    const res = await coreFetch(`/submissions/${id}/takeover/frame`);
    if (!res.ok) return Response.json({ error: "no frame" }, { status: res.status });
    return new Response(res.body, {
      headers: {
        "content-type": res.headers.get("content-type") || "image/png",
        "cache-control": "no-store",
      },
    });
  } catch {
    return Response.json({ error: "no frame" }, { status: 502 });
  }
}
