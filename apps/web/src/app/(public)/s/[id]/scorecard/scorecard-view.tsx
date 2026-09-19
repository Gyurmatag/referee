"use client";

import useSWR from "swr";
import {
  SubmissionSchema,
  aggregate,
  DEFAULT_RUBRIC,
  type EventPublic,
  type Submission,
} from "@referee/shared";
import { ClaimsTable } from "@/components/claims-table";
import { TrackList } from "@/components/track-list";
import { VerdictComparison } from "@/components/verdict-comparison";
import { IntegrityPanel } from "@/components/integrity-panel";
import { AppealForm } from "@/components/appeal-form";
import { ShotGallery } from "@/components/shot-gallery";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SWR_REFRESH_MS } from "@/lib/swr";

const fetcher = async (url: string): Promise<Submission> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("submission not found");
  return SubmissionSchema.parse(await res.json());
};

export function ScorecardView({
  id,
  event,
  organizer,
}: {
  id: string;
  event: EventPublic;
  organizer: boolean;
}) {
  const { data: sub, error } = useSWR(`/api/submissions/${id}`, fetcher, {
    refreshInterval: SWR_REFRESH_MS,
  });

  if (error) return <p className="text-sm text-fail">Submission not found</p>;
  if (!sub) {
    return (
      <>
        <div className="flex items-end justify-between">
          <div className="h-10 w-44 animate-pulse rounded-[2px] bg-[#efefef]" />
          <div className="h-4 w-28 animate-pulse rounded-[2px] bg-[#efefef]" />
        </div>
        <div className="box h-28 animate-pulse bg-[#f3f3f3]" />
        <div className="box h-44 animate-pulse bg-[#f3f3f3]" />
      </>
    );
  }

  const reports = sub.judge_runs
    .map((r) => r.report)
    .filter((r): r is NonNullable<typeof r> => r !== null);
  const score =
    sub.score ??
    aggregate({
      reports,
      provenance: sub.provenance,
      review: sub.review,
      rubric: DEFAULT_RUBRIC,
    });
  const showScores = event.reveal_scores || organizer;
  const claims = reports.flatMap((r) => r.claims);
  const tracks = reports.flatMap((r) => r.tracks);
  const buildReport = reports.find((r) => r.judge === "build_e2e") ?? reports[0];

  return (
    <>
      <div className="flex items-baseline justify-between">
        <h1 className="text-4xl font-medium">{sub.team_name}</h1>
        <p className="font-mono text-sm tabular-nums">
          {showScores
            ? `${score.total.toFixed(1)} - confidence ${score.confidence.toFixed(2)}`
            : "Scores hidden until reveal"}
        </p>
      </div>
      {sub.status === "failed" ? (
        <p className="text-sm text-fail">Pipeline failed - partial results below</p>
      ) : null}
      {sub.judge_runs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No judge runs yet</p>
      ) : null}
      {sub.external_verdict ? (
        <VerdictComparison verdict={sub.external_verdict} reports={reports} />
      ) : null}
      <ClaimsTable claims={claims} />
      {buildReport ? <IntegrityPanel integrity={buildReport.integrity} /> : null}
      <TrackList tracks={tracks} />
      <Card>
        <CardHeader>
          <CardTitle>Deploy and review</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <p>
            Deploy:{" "}
            {sub.deployment?.url ? (
              <a className="underline" href={sub.deployment.url}>
                {sub.deployment.url}
              </a>
            ) : (
              "None"
            )}
          </p>
          <p>
            Review:{" "}
            {sub.review?.review_url ? (
              <a className="underline" href={sub.review.review_url}>
                {sub.review.review_url}
              </a>
            ) : (
              sub.review?.summary || "None"
            )}
          </p>
          {sub.review?.screenshots?.length ? (
            <div className="mt-4">
              <ShotGallery shots={sub.review.screenshots} label="Sandbox E2E screenshots" />
            </div>
          ) : null}
        </CardContent>
      </Card>
      {showScores ? (
        <Card>
          <CardHeader>
            <CardTitle>Dimensions</CardTitle>
          </CardHeader>
          <CardContent>
            {score.dimensions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No dimensions yet</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {score.dimensions.map((d) => (
                  <li key={d.id} className="flex items-center justify-between">
                    <span>
                      {d.label}{" "}
                      {d.overridden ? <Badge variant="partial">overridden</Badge> : null}
                    </span>
                    <span className="font-mono tabular-nums">
                      {(d.value * d.weight).toFixed(1)} / {d.weight}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}
      <AppealForm id={sub.id} />
    </>
  );
}
