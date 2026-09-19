"use client";

import type { ClaimVerdict } from "@referee/shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EvidenceDialog } from "@/components/evidence-dialog";

function resultVariant(result: string) {
  if (result === "pass") return "pass" as const;
  if (result === "partial") return "partial" as const;
  if (result === "fail") return "fail" as const;
  return "default" as const;
}

export function ClaimsTable({ claims }: { claims: ClaimVerdict[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Claims</CardTitle>
      </CardHeader>
      <CardContent>
        {claims.length === 0 ? (
          <p className="text-sm text-muted-foreground">No claim results yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 font-medium">Claim</th>
                <th className="py-2 font-medium">Result</th>
                <th className="py-2 font-medium">Evidence</th>
              </tr>
            </thead>
            <tbody>
              {claims.map((claim, i) => (
                <tr key={`${claim.claim}-${i}`} className="border-b border-border last:border-0">
                  <td className="py-2 pr-3">{claim.claim}</td>
                  <td className="py-2 pr-3">
                    <Badge variant={resultVariant(claim.result)}>{claim.result}</Badge>
                  </td>
                  <td className="py-2">
                    {claim.evidence.length === 0 ? (
                      <span className="text-muted-foreground">None</span>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {claim.evidence.map((path) => (
                          <EvidenceDialog key={path} path={path} />
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
