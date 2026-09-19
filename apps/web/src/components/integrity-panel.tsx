"use client";

import type { Integrity } from "@referee/shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function IntegrityPanel({ integrity }: { integrity: Integrity }) {
  const clean = integrity.injection_found === 0;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Integrity</CardTitle>
          <Badge variant={clean ? "pass" : "fail"}>
            {clean ? "No judge-directed text" : `${integrity.injection_found} found`}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Text in the repo that addresses a judge instead of a reader. Reported, never acted on.
        </p>
      </CardHeader>
      <CardContent>
        {clean ? (
          <p className="text-sm text-muted-foreground">
            {integrity.notes || "Nothing found"}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {integrity.findings.map((finding, i) => (
              <li key={`${finding.file}-${finding.line}-${i}`} className="flex flex-col gap-1">
                <span className="font-mono text-xs tabular-nums">
                  {finding.file}:{finding.line}
                </span>
                <p className="border-l-2 border-fail pl-3 font-mono text-xs">
                  {finding.excerpt}
                </p>
                <p className="text-sm text-muted-foreground">{finding.why}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
