"use client";

import Link from "next/link";
import type { JudgeRun } from "@referee/shared";
import { LiveLogPane } from "@/components/live-log-pane";
import { useSubmission } from "@/hooks/use-submission";

function reviewRun(sub: {
  id: string;
  review?: { review_url?: string; summary?: string } | null;
  updated_at: string;
}): JudgeRun {
  return {
    id: "review",
    submission_id: sub.id,
    judge: "review",
    runner: "github",
    phase: sub.review?.review_url || sub.review?.summary ? "done" : "starting",
    log_tail: sub.review?.review_url || sub.review?.summary || "Waiting for fork and PR",
    report: null,
    transcript_key: null,
    session_url: "",
    started_at: sub.updated_at,
    finished_at: null,
    error: null,
  };
}

export function TeamLiveLogs({
  id,
  teamName,
  tall,
  hideHeader,
  hideLinks,
}: {
  id: string;
  teamName?: string;
  tall?: boolean;
  hideHeader?: boolean;
  hideLinks?: boolean;
}) {
  const { data: sub, error } = useSubmission(id, 1000);

  if (error && !sub) {
    return <p className="text-sm text-fail">Could not load judging logs</p>;
  }
  if (!sub) {
    return <div className="h-48 animate-pulse rounded-[10px] bg-[#111111]" />;
  }

  const runs = [...sub.judge_runs, reviewRun(sub)];
  const live = runs.some((run) => !["done", "failed"].includes(run.phase));

  return (
    <section className="min-w-0 space-y-3">
      {hideHeader ? null : (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-medium">{teamName ?? sub.team_name}</h2>
            <p className="mt-1 font-mono text-[12px] text-muted-foreground">{sub.repo_url}</p>
          </div>
          <p className="font-mono text-[12px] text-muted-foreground">
            <span
              className={`mr-1.5 inline-block size-2 rounded-full align-middle ${
                live ? "animate-pulse bg-running" : "bg-black/20"
              }`}
            />
            {live ? "judging now" : sub.status}
          </p>
        </div>
      )}
      {runs.length === 0 ? (
        <p className="text-sm text-muted-foreground">Judging has not started for this team</p>
      ) : (
        <div className="grid min-w-0 gap-3">
          {runs.map((run) => (
            <LiveLogPane
              key={run.id}
              judge={run.judge}
              phase={run.phase}
              text={run.log_tail}
              sessionUrl={run.session_url}
              error={run.error}
              tall={tall}
            />
          ))}
        </div>
      )}
      {hideLinks ? null : (
        <p className="text-sm">
          <Link className="underline" href={`/s/${sub.id}`}>
            Team live page
          </Link>
          {" · "}
          <Link className="underline" href={`/wall/${sub.id}`}>
            Pipeline log
          </Link>
          {" · "}
          <Link className="underline" href={`/s/${sub.id}/scorecard`}>
            Scorecard
          </Link>
        </p>
      )}
    </section>
  );
}
