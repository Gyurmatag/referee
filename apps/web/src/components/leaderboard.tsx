"use client";

import type { Scorecard, Submission } from "@referee/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function Leaderboard({
  rows,
}: {
  rows: { submission: Submission; scorecard: Scorecard }[];
}) {
  const ranked = [...rows].sort((a, b) => b.scorecard.total - a.scorecard.total);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Leaderboard</CardTitle>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 font-medium">Team</th>
              <th className="py-2 font-medium">Status</th>
              <th className="py-2 text-right font-medium">Score</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((row) => (
              <tr key={row.submission.id} className="border-b border-border last:border-0">
                <td className="py-2">{row.submission.team_name}</td>
                <td className="py-2">{row.submission.status}</td>
                <td className="py-2 text-right font-mono tabular-nums">
                  {row.scorecard.total.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
