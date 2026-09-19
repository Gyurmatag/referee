"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_RUBRIC,
  SubmissionSchema,
  aggregate,
  type Rubric,
  type Submission,
} from "@referee/shared";
import { Leaderboard } from "@/components/leaderboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const LUMA_DEMO_CSV = [
  "email,name",
  "gyurmatag@budapest.build,Gyurmatag",
  "ada@budapest.build,Ada",
  "danube@budapest.build,Team Danube",
  "bridge@budapest.build,Team Chain Bridge",
].join("\n");

function OutpostStatus() {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    void fetch("/api/org/outpost")
      .then((r) => r.json())
      .then((json) => {
        if (!json?.ok) {
          setText(json?.error ? `Outpost: ${json.error}` : "Outpost unavailable");
          return;
        }
        setText(
          `Outpost ${json.name} (${json.platform}) - queue ${json.queue_depth}, claims ${json.active_claims}`,
        );
      })
      .catch(() => setText("Outpost unavailable"));
  }, []);
  if (!text) {
    return <div className="h-4 w-64 animate-pulse rounded-[2px] bg-[#efefef]" />;
  }
  return <p className="text-sm text-muted-foreground">{text}</p>;
}

type Board = {
  reveal_scores: boolean;
  rubric: Rubric;
  rows: { submission: Submission; scorecard: ReturnType<typeof aggregate> | null }[];
};

export default function OrgPage() {
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [weights, setWeights] = useState(
    Object.fromEntries(DEFAULT_RUBRIC.dimensions.map((d) => [d.id, d.weight])),
  );
  const [reveal, setReveal] = useState(false);
  const [lumaStatus, setLumaStatus] = useState("Not listed on Luma - demo list only");
  const [lumaPending, setLumaPending] = useState(false);

  useEffect(() => {
    void fetch("/api/org/leaderboard")
      .then(async (r) => {
        if (r.status === 401 || r.status === 403) {
          throw new Error("Organizer only");
        }
        if (!r.ok) throw new Error("Leaderboard unavailable");
        return r.json();
      })
      .then((json) => {
        const rows = (json.rows ?? []).map((row: { submission: unknown; scorecard: unknown }) => ({
          submission: SubmissionSchema.parse(row.submission),
          scorecard: row.scorecard,
        }));
        setBoard({
          reveal_scores: Boolean(json.reveal_scores),
          rubric: json.rubric ?? DEFAULT_RUBRIC,
          rows,
        });
        setReveal(Boolean(json.reveal_scores));
        if (json.rubric?.dimensions) {
          setWeights(
            Object.fromEntries(
              json.rubric.dimensions.map((d: { id: string; weight: number }) => [d.id, d.weight]),
            ),
          );
        }
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const rubric: Rubric = useMemo(
    () => ({
      dimensions: DEFAULT_RUBRIC.dimensions.map((d) => ({
        ...d,
        weight: weights[d.id] ?? d.weight,
      })),
    }),
    [weights],
  );

  const rows = (board?.rows ?? []).map((row) => {
    const reports = row.submission.judge_runs
      .map((r) => r.report)
      .filter((r): r is NonNullable<typeof r> => r !== null);
    return {
      submission: row.submission,
      scorecard: aggregate({
        reports,
        provenance: row.submission.provenance,
        review: row.submission.review,
        rubric,
      }),
    };
  });

  async function saveRubric() {
    await fetch("/api/org/rubric", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(rubric),
    });
  }

  async function saveReveal(next: boolean) {
    setReveal(next);
    await fetch("/api/org/reveal", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reveal_scores: next }),
    });
  }

  async function importLumaGuests() {
    setLumaPending(true);
    const res = await fetch("/api/org/guests", {
      method: "POST",
      headers: { "content-type": "text/csv" },
      body: LUMA_DEMO_CSV,
    });
    const json = (await res.json().catch(() => null)) as { imported?: number; error?: string } | null;
    setLumaPending(false);
    if (!res.ok) {
      setLumaStatus(json?.error ?? "Luma import failed");
      return;
    }
    setLumaStatus(`Imported ${json?.imported ?? 0} guests from the Luma demo list`);
  }

  async function override(id: string, dimension: string, value: number) {
    await fetch(`/api/org/overrides/${id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dimension, value, note: "organizer override" }),
    });
  }

  function exportCsv() {
    const lines = [
      "team,status,score,confidence",
      ...rows.map(
        (r) =>
          `${r.submission.team_name},${r.submission.status},${r.scorecard.total.toFixed(2)},${r.scorecard.confidence.toFixed(2)}`,
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leaderboard.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (error) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <p className="text-sm text-fail">{error}</p>
      </main>
    );
  }
  if (!board) {
    return (
      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-6 pb-20 pt-10">
        <div className="h-10 w-40 animate-pulse rounded-[2px] bg-[#efefef]" />
        <div className="h-4 w-80 animate-pulse rounded-[2px] bg-[#efefef]" />
        <div className="box h-52 animate-pulse bg-[#f3f3f3]" />
        <div className="box h-36 animate-pulse bg-[#f3f3f3]" />
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-6 pb-20 pt-10">
      <h1 className="text-4xl font-medium">Organizer</h1>
      <p className="text-sm text-muted-foreground">
        Budapest Build at Impact Hub Budapest. You are signed in as participant and organizer.
      </p>
      <OutpostStatus />
      <Card>
        <CardHeader>
          <CardTitle>Rubric weights</CardTitle>
        </CardHeader>
        <CardContent>
          {DEFAULT_RUBRIC.dimensions.map((d) => (
            <label key={d.id} className="mb-3 flex items-center gap-3 text-sm">
              <span className="w-40">{d.label}</span>
              <input
                type="range"
                min={0}
                max={50}
                value={weights[d.id]}
                onChange={(e) =>
                  setWeights((w) => ({ ...w, [d.id]: Number(e.target.value) }))
                }
              />
              <span className="w-8 font-mono tabular-nums">{weights[d.id]}</span>
            </label>
          ))}
          <Button className="mt-2" variant="outline" onClick={() => void saveRubric()}>
            Save weights
          </Button>
        </CardContent>
      </Card>
      <Leaderboard rows={rows} />
      {rows[0] ? (
        <Card>
          <CardHeader>
            <CardTitle>Override</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {rows.map((row) => (
              <div key={row.submission.id} className="flex items-center gap-2">
                <span className="w-40 truncate">{row.submission.team_name}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void override(row.submission.id, "works", 1)}
                >
                  Set works = 1
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">No submissions yet</p>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Reveal and export</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={reveal}
              onChange={(e) => void saveReveal(e.target.checked)}
            />
            Reveal scores on public pages
          </label>
          <Button variant="outline" onClick={exportCsv}>
            Export CSV
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Import from Luma</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="box p-4">
            <p className="text-sm font-medium">Budapest Build</p>
            <p className="mt-1 text-sm text-muted-foreground">Impact Hub Budapest</p>
            <p className="mt-3 font-mono text-xs text-muted-foreground">lu.ma/budapest-build</p>
            <p className="mt-1 text-sm tabular-nums text-muted-foreground">48 approved - 12 checked in</p>
          </div>
          <p className="text-sm text-muted-foreground">{lumaStatus}</p>
          <Button variant="outline" disabled={lumaPending} onClick={() => void importLumaGuests()}>
            {lumaPending ? "Importing" : "Import demo guests"}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
