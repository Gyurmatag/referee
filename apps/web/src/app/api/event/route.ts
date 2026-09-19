import { EventPublicSchema } from "@referee/shared";
import { coreFetch } from "@/lib/core";
import { isPlaceholderEvent } from "@/lib/event-ui";

export async function GET(request: Request) {
  const event = new URL(request.url).searchParams.get("event") ?? "default";
  try {
    const res = await coreFetch(`/event?event=${encodeURIComponent(event)}`);
    if (!res.ok) return Response.json({ error: "not found" }, { status: 404 });
    const parsed = EventPublicSchema.safeParse(await res.json());
    if (!parsed.success || isPlaceholderEvent(parsed.data)) {
      return Response.json({ error: "not found" }, { status: 404 });
    }
    return Response.json(parsed.data);
  } catch {
    return Response.json({ error: "unavailable" }, { status: 503 });
  }
}
