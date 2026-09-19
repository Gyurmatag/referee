"use client";

import Link from "next/link";
import useSWR from "swr";
import { SubmissionSchema, type Submission } from "@referee/shared";
import { JudgeCard } from "@/components/judge-card";
import { RepoStory } from "@/components/repo-story";
import { TakeoverBanner } from "@/components/takeover-banner";
import { SWR_REFRESH_MS } from "@/lib/swr";

const fetcher = async (url: string): Promise<Submission> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("submission not found");
  return SubmissionSchema.parse(await res.json());
};

export function LiveView({
  id,
  windowStart,
  windowEnd,
}: {
  id: string;
  windowStart: string;
  windowEnd: string;
}) {
  const { data: sub, error } = useSWR(`/api/submissions/${id}`, fetcher, {
    refreshInterval: SWR_REFRESH_MS,
  });

  if (error) {
    return <p className="text-sm text-fail">Submission not found</p>;
  }
  if (!sub) {
    return (
      <>
        <div className="h-10 w-48 animate-pulse rounded-[2px] bg-[#efefef]" />
        <div className="h-4 w-72 animate-pulse rounded-[2px] bg-[#efefef]" />
        <div className="box mt-2 h-32 animate-pulse bg-[#f3f3f3]" />
        <div className="box h-32 animate-pulse bg-[#f3f3f3]" />
      </>
    );
  }

  const reviewRun = {
    id: "review",
    submission_id: sub.id,
    judge: "review",
    runner: "github",
    phase: sub.review?.review_url || sub.review?.summary ? ("done" as const) : ("starting" as const),
    log_tail: sub.review?.review_url || sub.review?.summary || "Waiting for fork and PR",
    report: null,
    transcript_key: null,
    session_url: "",
    started_at: sub.updated_at,
    finished_at: null,
    error: null,
  };

  return (
    <>
      <div className="flex items-baseline justify-between">
        <h1 className="text-4xl font-medium">{sub.team_name}</h1>
        <p className="font-mono text-sm tabular-nums">
          {sub.queue_position ? `Queued, position ${sub.queue_position}` : sub.status}
        </p>
      </div>
      <p className="font-mono text-sm text-muted-foreground">{sub.repo_url}</p>
      {sub.live_url ? (
        <p className="text-sm">
          Submitted live URL:{" "}
          <a className="underline" href={sub.live_url}>
            {sub.live_url}
          </a>
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">No live URL - Devin will deploy it</p>
      )}
      {sub.claims.length > 0 ? (
        <div className="box p-5">
          <p className="text-sm text-muted-foreground">Sponsor claims</p>
          <ul className="mt-2 space-y-1 text-sm">
            {sub.claims.map((row) => (
              <li key={row.claim}>{row.claim}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <TakeoverBanner id={sub.id} visible={sub.status === "takeover"} />
      {sub.deployment?.url ? (
        <p className="text-sm">
          Deploy:{" "}
          <a className="underline" href={sub.deployment.url}>
            {sub.deployment.url}
          </a>
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">Judge deploy URL not ready</p>
      )}
      <div className="grid gap-4">
        {sub.judge_runs.map((run) => (
          <JudgeCard key={run.id} run={run} />
        ))}
        <JudgeCard run={reviewRun} />
      </div>
      <RepoStory
        provenance={sub.provenance}
        windowStart={windowStart}
        windowEnd={windowEnd}
      />
      <Link className="text-sm underline" href={`/s/${sub.id}/scorecard`}>
        Scorecard
      </Link>
    </>
  );
}
