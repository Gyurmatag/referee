"use client";

import { useEffect, useState, type ReactNode } from "react";
import useSWR from "swr";
import { SWR_REFRESH_MS } from "@/lib/swr";
import { coreWsUrl } from "@/lib/wall-url";

type WallRow = {
  id: string;
  team_name: string;
  status: string;
  repo_url?: string;
  live_url?: string | null;
  judge_runs?: { phase?: string }[];
};

type WallTeam = {
  id: string;
  team_name: string;
  status: string;
  repo_url?: string;
  live_url?: string | null;
  deploy_url?: string | null;
  phase?: string;
  screenshots?: string[];
};

type WallPayload = {
  event?: { title?: string; city?: string; venue?: string };
  quota_alert?: boolean;
  in_use?: number;
  queued?: number;
  judging?: WallRow[];
  submissions?: WallRow[];
  teams?: WallTeam[];
  events?: { id?: number; submission_id?: string; kind: string; message: string; at: string }[];
};

const fetcher = async (url: string): Promise<WallPayload> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("wall unavailable");
  return (await res.json()) as WallPayload;
};

function LogCard({
  label,
  title,
  meta,
  tone = "running",
  extra,
}: {
  label: string;
  title: string;
  meta?: string;
  tone?: "running" | "pass" | "fail";
  extra?: ReactNode;
}) {
  const dot =
    tone === "pass" ? "bg-pass" : tone === "fail" ? "bg-fail" : "bg-running";
  return (
    <li className="rounded-[10px] border border-black/10 bg-elevated px-3 py-2.5">
      <div className="flex items-center justify-between gap-2 text-[12px]">
        <span className="truncate text-muted-foreground">
          <span className={`mr-1.5 inline-block size-2 rounded-[2px] ${dot} align-middle`} />
          {label}
        </span>
        <span className="text-black/25">↗</span>
      </div>
      <p className="mt-1 text-[13px] leading-5">{title}</p>
      {meta ? <p className="mt-1 font-mono text-[11px] text-muted-foreground">{meta}</p> : null}
      {extra}
    </li>
  );
}

function prettyKind(kind: string) {
  const labels: Record<string, string> = {
    build_e2e: "Build",
    provenance: "Provenance",
    tracks: "Tracks",
    review: "Review",
    deploy: "Deploy",
    done: "Done",
    failed: "Failed",
  };
  return labels[kind] ?? kind.replace(/_/g, " ");
}

function prettyTime(at: string) {
  return at.replace("T", " ").replace(/\.\d+Z$/, " UTC").replace("Z", " UTC");
}

export default function WallPage() {
  const { data: polled, error, mutate } = useSWR("/api/wall", fetcher, {
    refreshInterval: SWR_REFRESH_MS,
  });
  const [live, setLive] = useState<WallPayload | null>(null);

  useEffect(() => {
    let socket: WebSocket | null = null;
    try {
      socket = new WebSocket(coreWsUrl());
    } catch {
      return;
    }
    socket.onmessage = (ev) => {
      try {
        const msg = JSON.parse(String(ev.data)) as WallPayload & { type?: string };
        if (msg.type === "pong") return;
        setLive(msg);
        void mutate(msg, { revalidate: false });
      } catch {
        /* ignore */
      }
    };
    const ping = window.setInterval(() => {
      if (socket?.readyState === WebSocket.OPEN) socket.send("ping");
    }, 20000);
    return () => {
      window.clearInterval(ping);
      socket?.close();
    };
  }, [mutate]);

  const data = live ?? polled;

  if (error && !data) {
    return (
      <main className="min-h-[calc(100vh-72px)] bg-background p-6 text-foreground">
        <p className="text-sm text-fail">Wall unavailable</p>
      </main>
    );
  }
  if (!data) {
    return (
      <main className="min-h-[calc(100vh-72px)] bg-background px-6 pb-16 pt-8">
        <div className="mx-auto max-w-6xl">
          <div className="h-10 w-56 animate-pulse rounded-[2px] bg-[#efefef]" />
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            <div className="box h-32 animate-pulse bg-[#f3f3f3]" />
            <div className="box h-56 animate-pulse bg-[#f3f3f3]" />
            <div className="box h-40 animate-pulse bg-[#f3f3f3]" />
          </div>
        </div>
      </main>
    );
  }

  const teams = data.teams ?? [];
  const items = data.submissions ?? [];
  const judging = data.judging ?? items.filter((s) => s.status === "judging" || s.status === "deploying");
  const shown = teams.length > 0 ? teams : items;
  const teamById = new Map(shown.map((s) => [s.id, s.team_name]));

  return (
    <main className="min-h-[calc(100vh-72px)] bg-background px-6 pb-16 pt-8 text-foreground">
      <div className="mx-auto mb-10 max-w-6xl">
        <h1 className="text-4xl font-medium">{data.event?.title ?? "Wall"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {data.event?.city} - {data.event?.venue}
        </p>
      </div>
      {data.quota_alert ? (
        <p className="box mx-auto mb-4 max-w-6xl px-3 py-2 text-sm text-fail">
          Quota alert - judge runs are failing at start
        </p>
      ) : null}
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-3">
        <section>
          <h2 className="mb-3 text-lg font-medium">Now judging</h2>
          {judging.length === 0 ? (
            <p className="text-sm text-muted-foreground">None running</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {judging.map((s) => (
                <LogCard
                  key={s.id}
                  label={s.team_name}
                  title={s.status === "done" || s.status === "failed" ? s.status : (s.judge_runs?.[0]?.phase ?? s.status)}
                  meta={s.repo_url}
                />
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
                const shots = "screenshots" in s ? s.screenshots ?? [] : [];
                return (
                  <LogCard
                    key={s.id}
                    label={s.team_name}
                    title={
                      s.status === "done" || s.status === "failed"
                        ? s.status
                        : "phase" in s && s.phase
                          ? s.phase
                          : s.status
                    }
                    meta={
                      shots.length
                        ? `${deploy || s.repo_url} - ${shots.length} e2e shots`
                        : deploy || s.repo_url
                    }
                    tone={
                      s.status === "done" ? "pass" : s.status === "failed" ? "fail" : "running"
                    }
                    extra={
                      shots.length ? (
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {shots.map((key) => (
                            <img
                              key={key}
                              src={`/api/evidence?key=${encodeURIComponent(key)}`}
                              alt=""
                              className="h-20 w-full rounded-[2px] border border-black/10 object-cover object-top"
                            />
                          ))}
                        </div>
                      ) : null
                    }
                  />
                );
              })}
            </ul>
          )}
        </section>
        <section>
          <h2 className="mb-3 text-lg font-medium">Log</h2>
          {(data.events ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Waiting for the first run</p>
          ) : (
            <ul className="flex max-h-[28rem] flex-col gap-2 overflow-auto pr-1">
              {(data.events ?? []).map((e) => (
                <LogCard
                  key={`${e.id}-${e.at}`}
                  label={teamById.get(e.submission_id ?? "") ?? prettyKind(e.kind)}
                  title={`${prettyKind(e.kind)} - ${e.message}`}
                  meta={prettyTime(e.at)}
                  tone={
                    e.kind === "failed" || e.message.toLowerCase().includes("fail")
                      ? "fail"
                      : e.kind === "done"
                        ? "pass"
                        : "running"
                  }
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
