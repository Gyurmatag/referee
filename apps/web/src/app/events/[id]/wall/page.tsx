"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useWall } from "@/hooks/use-wall";
import { eventPlace } from "@/lib/event-ui";

function toneFor(status: string): "running" | "pass" | "fail" {
  if (status === "done") return "pass";
  if (status === "failed") return "fail";
  return "running";
}

function TeamCard({
  href,
  label,
  title,
  meta,
  tone = "running",
}: {
  href: string;
  label: string;
  title: string;
  meta?: string;
  tone?: "running" | "pass" | "fail";
}) {
  const dot = tone === "pass" ? "bg-pass" : tone === "fail" ? "bg-fail" : "bg-running";
  return (
    <Link href={href} className="block rounded-[10px] border border-black/10 bg-elevated px-3 py-2.5">
      <div className="flex items-center justify-between gap-2 text-[12px]">
        <span className="truncate text-muted-foreground">
          <span className={`mr-1.5 inline-block size-2 rounded-[2px] ${dot} align-middle`} />
          {label}
        </span>
        <span className="text-black/25">↗</span>
      </div>
      <p className="mt-1 text-[13px] leading-5">{title}</p>
      {meta ? <p className="mt-1 font-mono text-[11px] text-muted-foreground">{meta}</p> : null}
    </Link>
  );
}

export default function EventWallPage() {
  const { id } = useParams<{ id: string }>();
  const { data, error } = useWall({ eventId: id, live: id === "default" });

  if (error && !data) {
    return (
      <main className="min-h-[calc(100vh-72px)] bg-background p-6 text-foreground">
        <p className="text-sm text-fail">Wall unavailable</p>
      </main>
    );
  }
  if (!data) {
    return (
      <main className="shell min-h-[calc(100vh-72px)] pb-16 pt-8">
        <div>
          <div className="h-10 w-56 animate-pulse rounded-[2px] bg-[#efefef]" />
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="box h-32 animate-pulse bg-[#f3f3f3]" />
            <div className="box h-56 animate-pulse bg-[#f3f3f3]" />
          </div>
        </div>
      </main>
    );
  }

  const teams = data.teams ?? [];
  const items = data.submissions ?? [];
  const judging = data.judging ?? items.filter((s) => s.status === "judging" || s.status === "deploying");
  const shown = teams.length > 0 ? teams : items;
  const place = eventPlace(data.event?.city, data.event?.venue);

  return (
    <main className="shell min-h-[calc(100vh-72px)] pb-16 pt-8 text-foreground">
      <div className="mb-10">
        <h1 className="text-4xl font-medium">{data.event?.title ?? "Wall"}</h1>
        {place ? <p className="mt-2 text-sm text-muted-foreground">{place}</p> : null}
      </div>
      {data.quota_alert ? (
        <p className="box mb-4 px-3 py-2 text-sm text-fail">
          Quota alert - judge runs are failing at start
        </p>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-medium">Now judging</h2>
          {judging.length === 0 ? (
            <p className="text-sm text-muted-foreground">None running</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {judging.map((s) => (
                <li key={s.id}>
                  <TeamCard
                    href={`/wall/${s.id}`}
                    label={s.team_name}
                    title={s.status === "done" || s.status === "failed" ? s.status : (s.judge_runs?.[0]?.phase ?? s.status)}
                    meta={s.repo_url}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <h2 className="mb-3 text-lg font-medium">Teams</h2>
          {shown.length === 0 ? (
            <p className="text-sm text-muted-foreground">No consented submissions</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {shown.map((s) => {
                const deploy = "deploy_url" in s ? s.deploy_url : null;
                return (
                  <li key={s.id}>
                    <TeamCard
                      href={`/wall/${s.id}`}
                      label={s.team_name}
                      title={
                        s.status === "done" || s.status === "failed"
                          ? s.status
                          : "phase" in s && s.phase
                            ? s.phase
                            : s.status
                      }
                      meta={deploy || s.repo_url}
                      tone={toneFor(s.status)}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
