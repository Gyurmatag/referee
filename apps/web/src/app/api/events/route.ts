import { EventPublicSchema } from "@referee/shared";
import { coreFetch } from "@/lib/core";

export async function GET() {
  const res = await coreFetch("/events");
  const json = await res.json().catch(() => []);
  if (!res.ok || !Array.isArray(json)) {
    return Response.json({ error: "Events unavailable" }, { status: res.status || 502 });
  }
  return Response.json(
    json.flatMap((row: unknown) => {
      const parsed = EventPublicSchema.safeParse(row);
      return parsed.success ? [parsed.data] : [];
    }),
  );
}
