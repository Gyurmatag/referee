import { EventPublicSchema } from "@referee/shared";
import { coreFetch, DEFAULT_EVENT } from "@/lib/core";

export async function GET() {
  try {
    const res = await coreFetch("/event");
    if (!res.ok) return Response.json(DEFAULT_EVENT);
    const parsed = EventPublicSchema.safeParse(await res.json());
    return Response.json(parsed.success ? parsed.data : DEFAULT_EVENT);
  } catch {
    return Response.json(DEFAULT_EVENT);
  }
}
