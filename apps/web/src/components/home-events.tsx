"use client";

import Link from "next/link";
import { useWall } from "@/hooks/use-wall";
import { eventTone, milestoneEvents, prettyKind, prettyTime } from "@/lib/wall-client";

export function HomeEvents() {
  const { data } = useWall({ live: false });
  const events = data ? milestoneEvents(data) : [];
  const teamName = (id?: string) => data?.teams?.find((team) => team.id === id)?.team_name ?? "Team";

  return (
    <section className="shell pb-28">
      <h2 className="text-[48px] font-medium leading-none tracking-[-0.04em] md:text-[64px]">Events</h2>
      <p className="mt-4 max-w-2xl text-muted-foreground">
        Teams submit and judging finishes here - open a team for the full log.
      </p>
      {!data ? (
        <div className="mt-10 flex flex-col gap-2">
          <div className="h-[72px] animate-pulse rounded-[10px] bg-[#efefef]" />
          <div className="h-[72px] animate-pulse rounded-[10px] bg-[#efefef]" />
          <div className="h-[72px] w-5/6 animate-pulse rounded-[10px] bg-[#efefef]" />
        </div>
      ) : events.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">No events yet</p>
      ) : (
        <ul className="mt-10 flex flex-col gap-2">
          {events.map((event, index) => {
            const tone = eventTone(event.kind, event.message);
            const dot = tone === "pass" ? "bg-pass" : tone === "fail" ? "bg-fail" : "bg-running";
            const href = event.submission_id ? `/wall/${event.submission_id}` : "/wall";
            return (
              <li key={`${event.id ?? index}-${event.at}-${event.kind}`}>
                <Link
                  href={href}
                  className="block rounded-[10px] border border-black/10 bg-elevated px-3 py-2.5"
                >
                  <div className="flex items-center justify-between gap-2 text-[12px]">
                    <span className="truncate text-muted-foreground">
                      <span className={`mr-1.5 inline-block size-2 rounded-[2px] ${dot} align-middle`} />
                      {teamName(event.submission_id)}
                    </span>
                    <span className="text-black/25">↗</span>
                  </div>
                  <p className="mt-1 text-[13px] leading-5">
                    {prettyKind(event.kind)} - {event.message}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">{prettyTime(event.at)}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
