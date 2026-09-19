import { EventPublicSchema } from "@referee/shared";
import { auth } from "@/auth";
import { coreFetch, DEFAULT_EVENT } from "@/lib/core";
import { isOrganizerLogin } from "@/lib/org";
import { ScorecardView } from "./scorecard-view";

export default async function ScorecardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let event = DEFAULT_EVENT;
  try {
    const res = await coreFetch("/event");
    const parsed = EventPublicSchema.safeParse(await res.json());
    if (parsed.success) event = parsed.data;
  } catch {
    // defaults
  }
  const session = await auth();
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 px-6 pb-20 pt-10">
      <ScorecardView
        id={id}
        event={event}
        organizer={isOrganizerLogin(session?.user?.login ?? "")}
      />
    </main>
  );
}
