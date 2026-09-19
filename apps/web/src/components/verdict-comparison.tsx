"use client";

import type { ExternalVerdict, JudgeReport } from "@referee/shared";
import { compareExternalVerdict } from "@referee/shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const AGREEMENT_COPY: Record<string, { label: string; variant: "pass" | "partial" | "fail" | "default"; line: string }> = {
  supported: {
    label: "Supported by evidence",
    variant: "pass",
    line: "The executed tests agree with this verdict.",
  },
  optimistic: {
    label: "Not supported by evidence",
    variant: "fail",
    line: "The verdict scores higher than what the tests produced.",
  },
  pessimistic: {
    label: "Below the evidence",
    variant: "partial",
    line: "The verdict scores lower than what the tests produced.",
  },
  unknown: {
    label: "Nothing to compare",
    variant: "default",
    line: "No score was recorded, or no claim could be tested.",
  },
};

function percent(value: number | null): string {
  return value === null ? "-" : `${(value * 100).toFixed(0)}%`;
}

export function VerdictComparison({
  verdict,
  reports,
}: {
  verdict: ExternalVerdict | null;
  reports: JudgeReport[];
}) {
  const cmp = compareExternalVerdict(verdict, reports);
  const copy = AGREEMENT_COPY[cmp.agreement] ?? AGREEMENT_COPY.unknown!;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{cmp.source || "External verdict"}</CardTitle>
          <Badge variant={copy.variant}>{copy.label}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{copy.line}</p>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Verdict</dt>
            <dd className="font-mono tabular-nums">{percent(cmp.external)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Tests passed</dt>
            <dd className="font-mono tabular-nums">{percent(cmp.evidence)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Difference</dt>
            <dd className="font-mono tabular-nums">
              {cmp.delta === null
                ? "-"
                : `${cmp.delta > 0 ? "+" : ""}${(cmp.delta * 100).toFixed(0)}%`}
            </dd>
          </div>
        </dl>
        <p className="text-sm text-muted-foreground tabular-nums">
          {cmp.testedClaims} claims tested, {cmp.untestedClaims} untestable
        </p>
        {verdict?.summary ? (
          <p className="text-sm">{verdict.summary}</p>
        ) : null}
        {verdict?.url ? (
          <a className="text-sm underline" href={verdict.url}>
            Verdict source
          </a>
        ) : null}
      </CardContent>
    </Card>
  );
}
