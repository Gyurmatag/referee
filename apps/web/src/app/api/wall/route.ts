import { coreFetch } from "@/lib/core";

export async function GET() {
  const res = await coreFetch("/wall");
  const json = await res.json().catch(() => ({ error: "core unavailable" }));
  return Response.json(json, { status: res.status });
}
