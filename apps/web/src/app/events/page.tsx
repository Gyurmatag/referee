"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { EventPublicSchema, type EventPublic } from "@referee/shared";
import { Button } from "@/components/ui/button";
import { eventPlace, eventWhen } from "@/lib/event-ui";

export default function EventsPage() {
  const { data, status } = useSession();
  const login = data?.user?.login ?? "";
  const organizer = (data?.user?.roles ?? []).includes("organizer");
  const [events, setEvents] = useState<EventPublic[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!login) return;
    void fetch("/api/events")
      .then(async (res) => {
        if (res.status === 401) throw new Error("Sign in with GitHub first");
        if (!res.ok) throw new Error("Events unavailable");
        const json = await res.json();
        return (Array.isArray(json) ? json : []).map((row: unknown) => EventPublicSchema.parse(row));
      })
      .then(setEvents)
      .catch((e: Error) => setError(e.message));
  }, [login]);

  if (status === "loading") {
    return (
      <main className="shell pb-20 pt-10">
        <div className="h-10 w-36 animate-pulse rounded-[2px] bg-[#efefef]" />
        <div className="mt-8 box h-36 animate-pulse bg-[#f3f3f3]" />
        <div className="mt-4 box h-36 animate-pulse bg-[#f3f3f3]" />
      </main>
    );
  }

  if (!login) {
    return (
      <main className="shell pb-20 pt-16">
        <h1 className="text-4xl font-medium">Events</h1>
        <p className="mt-3 text-sm text-muted-foreground">Log in with GitHub to see events you can join or run.</p>
        <Button className="mt-6" type="button" onClick={() => void signIn("github", { callbackUrl: "/events" })}>
          Continue with GitHub
        </Button>
      </main>
    );
  }

  if (error) {
    return (
      <main className="shell p-6">
        <p className="text-sm text-fail">{error}</p>
      </main>
    );
  }

  if (!events) {
    return (
      <main className="shell pb-20 pt-10">
        <div className="h-10 w-36 animate-pulse rounded-[2px] bg-[#efefef]" />
        <div className="mt-8 box h-36 animate-pulse bg-[#f3f3f3]" />
      </main>
    );
  }

  return (
    <main className="shell pb-20 pt-10">
      <h1 className="text-4xl font-medium">Events</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {organizer ? "Open an event to change settings or submit a team." : "Open an event to submit your team."}
      </p>
      {events.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">No events yet</p>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {events.map((event) => {
            const place = eventPlace(event.city, event.venue);
            return (
              <li key={event.id} className="box p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-medium">{event.title}</h2>
                    {place ? <p className="mt-1 text-sm text-muted-foreground">{place}</p> : null}
                    <p className="mt-1 text-sm text-muted-foreground">{eventWhen(event.starts_at, event.ends_at)}</p>
                    <p className="mt-2 font-mono text-[12px] text-muted-foreground">
                      {event.submissions} submissions
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild>
                      <Link href={`/events/${event.id}/submit`}>Submit work</Link>
                    </Button>
                    {organizer ? (
                      <Button asChild variant="outline">
                        <Link href={`/events/${event.id}/admin`}>Settings</Link>
                      </Button>
                    ) : null}
                    <Button asChild variant="outline">
                      <Link href={`/events/${event.id}/wall`}>Wall</Link>
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
