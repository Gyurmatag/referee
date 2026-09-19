"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ShotGallery } from "@/components/shot-gallery";
import { useWall } from "@/hooks/use-wall";
import { eventTone, eventsForTeam, findTeam, prettyKind, prettyTime } from "@/lib/wall-client";

export default function TeamLogPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data, error } = useWall();

  if (error && !data) {
    return (
      <main className="shell min-h-[calc(100vh-72px)] pb-16 pt-10">
        <p className="text-sm text-fail">Wall unavailable</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="shell min-h-[calc(100vh-72px)] pb-16 pt-10">
        <div>
          <div className="h-4 w-24 animate-pulse rounded-[2px] bg-[#efefef]" />
          <div className="mt-6 h-12 w-72 animate-pulse rounded-[2px] bg-[#efefef]" />
          <div className="mt-8 space-y-3">
            <div className="box h-20 animate-pulse bg-[#f3f3f3]" />
            <div className="box h-20 animate-pulse bg-[#f3f3f3]" />
            <div className="box h-20 animate-pulse bg-[#f3f3f3]" />
          </div>
        </div>
      </main>
    );
  }

  const team = findTeam(data, id);
  const logs = eventsForTeam(data, id);
  const shots = team && "screenshots" in team ? team.screenshots ?? [] : [];
  const deploy = team && "deploy_url" in team ? team.deploy_url : null;
  const status = team?.status ?? "unknown";
  const tone = status === "done" ? "pass" : status === "failed" ? "fail" : "running";
  const dot = tone === "pass" ? "bg-pass" : tone === "fail" ? "bg-fail" : "bg-running";

  if (!team && logs.length === 0) {
    return (
      <main className="shell min-h-[calc(100vh-72px)] pb-16 pt-10">
        <div>
          <Link href="/events" className="text-sm text-muted-foreground hover:text-foreground">
            Events
          </Link>
          <h1 className="mt-6 text-4xl font-medium">Team not found</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="shell min-h-[calc(100vh-72px)] pb-20 pt-10 text-foreground">
      <div>
        <Link href="/events" className="text-sm text-muted-foreground hover:text-foreground">
          Events
        </Link>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[44px] font-medium leading-none tracking-[-0.04em] md:text-[56px]">
              {team?.team_name ?? "Team"}
            </h1>
            <p className="mt-3 font-mono text-[13px] text-muted-foreground">{team?.repo_url}</p>
          </div>
          <p className="text-[13px] text-muted-foreground">
            <span className={`mr-1.5 inline-block size-2 rounded-[2px] ${dot} align-middle`} />
            {status}
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <div className="box px-4 py-3">
            <p className="text-[12px] text-muted-foreground">Deploy</p>
            {deploy ? (
              <a href={deploy} className="mt-1 block truncate text-[13px] underline" target="_blank" rel="noreferrer">
                {deploy}
              </a>
            ) : (
              <p className="mt-1 text-[13px] text-muted-foreground">Devin is deploying</p>
            )}
          </div>
          <div className="box px-4 py-3">
            <p className="text-[12px] text-muted-foreground">Phase</p>
            <p className="mt-1 text-[13px]">
              {status === "done" || status === "failed"
                ? status
                : team && "phase" in team && team.phase
                  ? team.phase
                  : status}
            </p>
          </div>
        </div>

        <h2 className="mt-12 text-lg font-medium">Log</h2>
        {logs.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Waiting for the first step</p>
        ) : (
          <ol className="relative mt-5 border-l border-black/10 pl-6">
            {logs.map((event, index) => {
              const stepTone = eventTone(event.kind, event.message);
              const stepDot =
                stepTone === "pass" ? "bg-pass" : stepTone === "fail" ? "bg-fail" : "bg-running";
              return (
                <li key={`${event.id ?? index}-${event.at}`} className="relative pb-4 last:pb-0">
                  <span
                    className={`absolute -left-[29px] top-3 size-2 rounded-[2px] ${stepDot}`}
                  />
                  <div className="rounded-[10px] border border-black/10 bg-elevated px-4 py-3">
                    <div className="flex items-center justify-between gap-3 text-[12px] text-muted-foreground">
                      <span>{prettyKind(event.kind)}</span>
                      <span className="font-mono">{prettyTime(event.at)}</span>
                    </div>
                    <p className="mt-1 text-[13px] leading-5">{event.message}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {shots.length ? (
          <div className="mt-12">
            <h2 className="mb-3 text-lg font-medium">E2E screenshots</h2>
            <ShotGallery shots={shots} />
          </div>
        ) : null}

        {team ? (
          <p className="mt-10 text-sm">
            <Link href={`/s/${id}/scorecard`} className="underline">
              Scorecard
            </Link>
          </p>
        ) : null}
      </div>
    </main>
  );
}
