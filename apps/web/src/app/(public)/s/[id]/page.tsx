import { EventPublicSchema } from "@referee/shared";
import { coreFetch, DEFAULT_EVENT } from "@/lib/core";
import { LiveView } from "./live-view";

export default async function SubmissionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let windowStart = DEFAULT_EVENT.window_start;
  let windowEnd = DEFAULT_EVENT.window_end;
  try {
    const res = await coreFetch("/event");
    const parsed = EventPublicSchema.safeParse(await res.json());
    if (parsed.success) {
      windowStart = parsed.data.window_start;
      windowEnd = parsed.data.window_end;
    }
  } catch {
    // defaults
  }
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 px-6 pb-20 pt-10">
      <LiveView id={id} windowStart={windowStart} windowEnd={windowEnd} />
    </main>
  );
}
