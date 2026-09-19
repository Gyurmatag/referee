"use client";

import { useMemo, useState } from "react";
import {
  DEFAULT_RUBRIC,
  SubmissionSchema,
  aggregate,
  fixtures,
  type Submission,
} from "@referee/shared";
import { JudgeCard } from "@/components/judge-card";
import { RepoStory } from "@/components/repo-story";
import { ClaimsTable } from "@/components/claims-table";
import { TrackList } from "@/components/track-list";
import { Leaderboard } from "@/components/leaderboard";
import { VerdictComparison } from "@/components/verdict-comparison";
import { IntegrityPanel } from "@/components/integrity-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const NAMES = ["running", "done", "failed"] as const;

export default function DevPage() {
  const [index, setIndex] = useState(0);
  const name = NAMES[index % NAMES.length] ?? "done";
  const sub: Submission = useMemo(
    () => SubmissionSchema.parse(fixtures[name]),
    [name],
  );
  const reports = sub.judge_runs
    .map((r) => r.report)
    .filter((r): r is NonNullable<typeof r> => r !== null);
  const score = aggregate({
    reports,
    provenance: sub.provenance,
    review: sub.review,
    rubric: DEFAULT_RUBRIC,
  });
  const rows = NAMES.map((n) => {
    const s = SubmissionSchema.parse(fixtures[n]);
    const reps = s.judge_runs
      .map((r) => r.report)
      .filter((r): r is NonNullable<typeof r> => r !== null);
    return {
      submission: s,
      scorecard: aggregate({
        reports: reps,
        provenance: s.provenance,
        review: s.review,
        rubric: DEFAULT_RUBRIC,
      }),
    };
  });

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium">Component fixtures</h1>
        <Button
          variant="outline"
          onClick={() => setIndex((i) => (i + 1) % NAMES.length)}
        >
          Next fixture ({name})
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>
            {sub.team_name} - {sub.status}
          </CardTitle>
        </CardHeader>
        <CardContent className="font-mono text-sm tabular-nums">
          score {score.total.toFixed(1)} confidence {score.confidence.toFixed(2)}
        </CardContent>
      </Card>
      {sub.judge_runs.map((run) => (
        <JudgeCard key={run.id} run={run} />
      ))}
      <RepoStory
        provenance={sub.provenance}
        windowStart="2026-09-19T00:00:00.000Z"
        windowEnd="2026-09-20T12:00:00.000Z"
      />
      <VerdictComparison verdict={sub.external_verdict} reports={reports} />
      <ClaimsTable claims={reports.flatMap((r) => r.claims)} />
      {reports[0] ? <IntegrityPanel integrity={reports[0].integrity} /> : null}
      <TrackList tracks={reports.flatMap((r) => r.tracks)} />
      <Leaderboard rows={rows} />
    </main>
  );
}
