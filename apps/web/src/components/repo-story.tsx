"use client";

import type { Provenance } from "@referee/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function RepoStory({
  provenance,
  windowStart,
  windowEnd,
}: {
  provenance: Provenance | null;
  windowStart: string;
  windowEnd: string;
}) {
  const commits = provenance?.commits ?? [];
  const start = new Date(windowStart).getTime();
  const end = new Date(windowEnd).getTime();
  const times = commits.map((c) => new Date(c.at).getTime());
  const min = Math.min(start, ...times, Date.now());
  const max = Math.max(end, ...times, Date.now());
  const span = Math.max(1, max - min);
  const left = ((start - min) / span) * 100;
  const width = ((end - start) / span) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Repo story</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative h-16">
          <div className="absolute inset-x-0 top-7 h-px bg-border" />
          <div
            className="absolute top-0 h-16 rounded-md bg-running/10"
            style={{ left: `${left}%`, width: `${width}%` }}
          />
          {commits.map((commit) => {
            const x = ((new Date(commit.at).getTime() - min) / span) * 100;
            return (
              <span
                key={commit.sha}
                title={`${commit.author} ${commit.sha.slice(0, 7)}`}
                className={`absolute top-6 size-3 -translate-x-1/2 rounded-full border border-foreground ${
                  commit.is_bot ? "bg-foreground" : "bg-background"
                }`}
                style={{ left: `${x}%` }}
              />
            );
          })}
        </div>
        <p className="font-mono text-xs text-muted-foreground tabular-nums">
          in window {((provenance?.in_window_ratio ?? 0) * 100).toFixed(0)}%
          {provenance?.is_fork ? " - fork" : ""}
        </p>
      </CardContent>
    </Card>
  );
}
