"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { EventPublicSchema, type EventPublic } from "@referee/shared";
import { Button } from "@/components/ui/button";
import { DEFAULT_EVENT } from "@/lib/core";
import { eventPlace, eventWhen } from "@/lib/event-ui";

export default function EventHubPage() {
  const { id } = useParams<{ id: string }>();
  const organizer = (useSession().data?.user?.roles ?? []).includes("organizer");
  const [event, setEvent] = useState<EventPublic | null>(null);

  useEffect(() => {
    if (!id) return;
    void fetch(`/api/event?event=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((json) => {
        const parsed = EventPublicSchema.safeParse(json);
        setEvent(parsed.success ? parsed.data : DEFAULT_EVENT);
      })
      .catch(() => setEvent(DEFAULT_EVENT));
  }, [id]);

  if (!event) {
    return (
      <main className="shell pb-20 pt-10">
        <div className="h-10 w-56 animate-pulse rounded-[2px] bg-[#efefef]" />
        <div className="mt-4 h-4 w-72 animate-pulse rounded-[2px] bg-[#efefef]" />
        <div className="mt-8 flex gap-2">
          <div className="h-9 w-28 animate-pulse rounded-[2px] bg-[#191919]" />
          <div className="h-9 w-24 animate-pulse rounded-[2px] bg-[#efefef]" />
        </div>
      </main>
    );
  }

  const place = eventPlace(event.city, event.venue);

  return (
    <main className="shell pb-20 pt-10">
      <h1 className="text-4xl font-medium">{event.title}</h1>
      {place ? <p className="mt-2 text-sm text-muted-foreground">{place}</p> : null}
      <p className="mt-1 text-sm text-muted-foreground">{eventWhen(event.starts_at, event.ends_at)}</p>
      <p className="mt-3 font-mono text-[12px] text-muted-foreground">{event.submissions} submissions</p>
      <div className="mt-8 flex flex-wrap gap-2">
        <Button asChild>
          <Link href={`/events/${id}/submit`}>Submit work</Link>
        </Button>
        {organizer ? (
          <Button asChild variant="outline">
            <Link href={`/events/${id}/admin`}>Settings</Link>
          </Button>
        ) : null}
        <Button asChild variant="outline">
          <Link href={`/events/${id}/wall`}>Open wall</Link>
        </Button>
      </div>
    </main>
  );
}
