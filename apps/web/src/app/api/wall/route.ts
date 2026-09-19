import { coreFetch } from "@/lib/core";

export async function GET(request: Request) {
  const event = new URL(request.url).searchParams.get("event") ?? "default";
  const res = await coreFetch(`/wall?event=${encodeURIComponent(event)}`);
  const json = await res.json().catch(() => ({ error: "core unavailable" }));
  return Response.json(json, { status: res.status });
}
