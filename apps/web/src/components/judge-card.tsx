"use client";

import type { JudgeRun } from "@referee/shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { judgeLabel, visibleLog } from "@/lib/visible-log";

const PHASES = [
  "starting",
  "installing",
  "building",
  "running",
  "testing",
  "done",
] as const;

function phaseProgress(phase: string): number {
  if (phase === "failed") return 100;
  const idx = PHASES.indexOf(phase as (typeof PHASES)[number]);
  if (idx < 0) return 0;
  return Math.round(((idx + 1) / PHASES.length) * 100);
}

export function JudgeCard({ run }: { run: JudgeRun }) {
  const running = !["done", "failed"].includes(run.phase);
  const lines = visibleLog(run.log_tail).split("\n").filter(Boolean).slice(-8);
  const badgeVariant =
    run.phase === "failed"
      ? "fail"
      : run.phase === "done"
        ? "pass"
        : "running";

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <span
              className={cn(
                "inline-block size-2 rounded-full",
                running ? "bg-running animate-pulse" : "bg-muted-foreground/40",
              )}
            />
            {judgeLabel(run.judge)}
          </CardTitle>
          <Badge variant={badgeVariant}>{run.phase}</Badge>
        </div>
        <Progress value={phaseProgress(run.phase)} />
      </CardHeader>
      <CardContent>
        <pre className="max-h-48 w-full min-w-0 overflow-y-auto whitespace-pre-wrap break-all font-mono text-[12px] leading-5 text-muted-foreground">
          {lines.join("\n") || "No log yet"}
        </pre>
        {run.session_url ? (
          <p className="mt-2 text-sm">
            <a className="underline" href={run.session_url} target="_blank" rel="noreferrer">
              Devin session
            </a>
          </p>
        ) : null}
        {run.error ? (
          <p className="mt-2 text-sm text-fail">{run.error}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
