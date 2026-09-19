"use client";

import { useEffect, useMemo, useState } from "react";
import { DEFAULT_RUBRIC, type Rubric } from "@referee/shared";
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

export default function AdminPage() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weights, setWeights] = useState(
    Object.fromEntries(DEFAULT_RUBRIC.dimensions.map((d) => [d.id, d.weight])),
  );
  const [lumaStatus, setLumaStatus] = useState("Not listed on Luma - demo list only");
  const [lumaPending, setLumaPending] = useState(false);

  useEffect(() => {
    void fetch("/api/org/leaderboard")
      .then(async (r) => {
        if (r.status === 401 || r.status === 403) {
          throw new Error("Admin only");
        }
        if (!r.ok) throw new Error("Admin data unavailable");
        return r.json();
      })
      .then((json) => {
        if (json.rubric?.dimensions) {
          setWeights(
            Object.fromEntries(
              json.rubric.dimensions.map((d: { id: string; weight: number }) => [d.id, d.weight]),
            ),
          );
        }
        setReady(true);
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

  async function saveRubric() {
    await fetch("/api/org/rubric", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(rubric),
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

  if (error) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <p className="text-sm text-fail">{error}</p>
      </main>
    );
  }
  if (!ready) {
    return (
      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-6 pb-20 pt-10">
        <div className="h-10 w-28 animate-pulse rounded-[2px] bg-[#efefef]" />
        <div className="h-4 w-80 animate-pulse rounded-[2px] bg-[#efefef]" />
        <div className="box h-52 animate-pulse bg-[#f3f3f3]" />
        <div className="box h-56 animate-pulse bg-[#f3f3f3]" />
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-6 pb-20 pt-10">
      <h1 className="text-4xl font-medium">Admin</h1>
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
