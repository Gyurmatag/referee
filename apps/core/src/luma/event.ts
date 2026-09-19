import { z } from "zod";

const JsonLdEvent = z.object({
  "@type": z.union([z.string(), z.array(z.string())]).optional(),
  name: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type LumaEvent = {
  title: string;
  starts_at: string;
  ends_at: string;
};

function isEventType(value: unknown): boolean {
  if (typeof value === "string") return value === "Event";
  if (Array.isArray(value)) return value.includes("Event");
  return false;
}

function readMeta(html: string, key: string): string {
  const property = new RegExp(
    `<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`,
    "i",
  );
  const contentFirst = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["']`,
    "i",
  );
  return property.exec(html)?.[1] ?? contentFirst.exec(html)?.[1] ?? "";
}

export function parseLumaHtml(html: string): LumaEvent {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
  for (const block of blocks) {
    try {
      const parsed = JSON.parse(block[1] ?? "");
      const nodes = Array.isArray(parsed) ? parsed : [parsed];
      for (const node of nodes) {
        const event = JsonLdEvent.safeParse(node);
        if (event.success && isEventType(event.data["@type"]) && event.data.name) {
          return {
            title: event.data.name,
            starts_at: event.data.startDate ?? "",
            ends_at: event.data.endDate ?? "",
          };
        }
      }
    } catch {
      // keep looking
    }
  }
  const title =
    readMeta(html, "og:title") ||
    /<title>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.trim() ||
    "Referee event";
  return {
    title,
    starts_at: readMeta(html, "event:start_time"),
    ends_at: readMeta(html, "event:end_time"),
  };
}

export async function fetchLumaEvent(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<LumaEvent> {
  const res = await fetchImpl(url, {
    headers: { "user-agent": "referee-luma/1.0" },
  });
  if (!res.ok) throw new Error(`Luma ${res.status}`);
  return parseLumaHtml(await res.text());
}

export function parseGuestCsv(text: string): { email: string; name: string }[] {
  const rows: { email: string; name: string }[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const [emailRaw, ...rest] = trimmed.split(",");
    const email = (emailRaw ?? "").trim().toLowerCase();
    if (!email || email === "email") continue;
    if (!email.includes("@")) continue;
    rows.push({ email, name: rest.join(",").trim() });
  }
  return rows;
}
