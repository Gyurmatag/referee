"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EventPublicSchema, type EventPublic } from "@referee/shared";
import { Button } from "@/components/ui/button";
import { eventPlace, eventWhen } from "@/lib/event-ui";

export function HomeEvents() {
  const [events, setEvents] = useState<EventPublic[] | null>(null);

  useEffect(() => {
    void fetch("/api/events")
      .then((res) => res.json())
      .then((json) => {
        const rows = (Array.isArray(json) ? json : [])
          .map((row: unknown) => EventPublicSchema.safeParse(row))
          .filter((row) => row.success)
          .map((row) => row.data);
        setEvents(rows);
      })
      .catch(() => setEvents([]));
  }, []);

  return (
    <section id="events" className="shell pb-28">
      <h2 className="text-[48px] font-medium leading-none tracking-[-0.04em] md:text-[64px]">Events</h2>
      <p className="mt-4 max-w-2xl text-muted-foreground">
        Open a hackathon to submit a team, change settings, or watch the wall.
      </p>
      {!events ? (
        <div className="mt-10 flex flex-col gap-3">
          <div className="box h-36 animate-pulse bg-[#f3f3f3]" />
          <div className="box h-36 w-5/6 animate-pulse bg-[#f3f3f3]" />
        </div>
      ) : events.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">No events yet</p>
      ) : (
        <ul className="mt-10 flex flex-col gap-3">
          {events.map((event) => {
            const place = eventPlace(event.city, event.venue);
            return (
              <li key={event.id} className="box p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-medium">{event.title}</h3>
                    {place ? <p className="mt-1 text-sm text-muted-foreground">{place}</p> : null}
                    <p className="mt-1 text-sm text-muted-foreground">{eventWhen(event.starts_at, event.ends_at)}</p>
                    <p className="mt-2 font-mono text-[12px] text-muted-foreground">
                      {event.submissions} submissions
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild>
                      <Link href={`/events/${event.id}`}>Open event</Link>
                    </Button>
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
    </section>
  );
}
