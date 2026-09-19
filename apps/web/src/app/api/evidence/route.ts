import { coreFetch } from "@/lib/core";

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("key") ?? "";
  const res = await coreFetch(`/evidence?key=${encodeURIComponent(key)}`);
  if (!res.ok) {
    return Response.json({ error: "not found" }, { status: res.status });
  }
  return new Response(res.body, {
    headers: {
      "content-type": res.headers.get("content-type") || "application/octet-stream",
    },
  });
}
