"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { DEFAULT_RUBRIC, EventPublicSchema, type EventPublic, type Rubric } from "@referee/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { MissingEvent } from "@/components/missing-event";
import { isPlaceholderEvent } from "@/lib/event-ui";

const LUMA_DEMO_CSV = [
  "email,name",
  "gyurmatag@budapest.build,Gyurmatag",
  "ada@budapest.build,Ada",
  "danube@budapest.build,Team Danube",
  "bridge@budapest.build,Team Chain Bridge",
  "margaret@budapest.build,Team Margaret",
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

export default function EventAdminPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<EventPublic | null>(null);
  const [title, setTitle] = useState("");
  const [city, setCity] = useState("");
  const [venue, setVenue] = useState("");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState("");
  const [weights, setWeights] = useState(
    Object.fromEntries(DEFAULT_RUBRIC.dimensions.map((d) => [d.id, d.weight])),
  );
  const [lumaStatus, setLumaStatus] = useState("Not listed on Luma - demo list only");
  const [lumaPending, setLumaPending] = useState(false);

  useEffect(() => {
    if (!id) return;
    void Promise.all([
      fetch(`/api/event?event=${encodeURIComponent(id)}`).then((r) => r.json()),
      fetch(`/api/org/leaderboard?event=${encodeURIComponent(id)}`).then(async (r) => {
        if (r.status === 401 || r.status === 403) throw new Error("Admin only");
        if (!r.ok) throw new Error("Admin data unavailable");
        return r.json();
      }),
    ])
      .then(([eventJson, board]) => {
        const parsed = EventPublicSchema.safeParse(eventJson);
        if (!parsed.success || isPlaceholderEvent(parsed.data)) {
          setError("Event not found");
          return;
        }
        const next = parsed.data;
        setEvent(next);
        setTitle(next.title);
        setCity(next.city);
        setVenue(next.venue);
        if (board.rubric?.dimensions) {
          setWeights(
            Object.fromEntries(
              board.rubric.dimensions.map((d: { id: string; weight: number }) => [d.id, d.weight]),
            ),
          );
        }
        setReady(true);
      })
      .catch((e: Error) => setError(e.message));
  }, [id]);

  const rubric: Rubric = useMemo(
    () => ({
      dimensions: DEFAULT_RUBRIC.dimensions.map((d) => ({
        ...d,
        weight: weights[d.id] ?? d.weight,
      })),
    }),
    [weights],
  );

  async function saveEvent() {
    setSaved("");
    const res = await fetch(`/api/org/event?event=${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, city, venue }),
    });
    if (!res.ok) {
      setError("Save failed");
      return;
    }
    setEvent((current) => (current ? { ...current, title, city, venue } : current));
    setSaved("Saved");
  }

  async function saveRubric() {
    setSaved("");
    await fetch(`/api/org/rubric?event=${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(rubric),
    });
    setSaved("Saved");
  }

  async function setReveal(next: boolean) {
    setSaved("");
    const res = await fetch(`/api/org/reveal?event=${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reveal_scores: next }),
    });
    if (!res.ok) {
      setError("Reveal failed");
      return;
    }
    setEvent((current) => (current ? { ...current, reveal_scores: next } : current));
    setSaved(next ? "Scores are public" : "Scores are hidden");
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

  if (error === "Event not found") return <MissingEvent />;
  if (error) {
    return (
      <main className="shell p-6">
        <p className="text-sm text-fail">{error}</p>
      </main>
    );
  }
  if (!ready) {
    return (
      <main className="shell flex flex-col gap-6 pb-20 pt-10">
        <div className="h-10 w-28 animate-pulse rounded-[2px] bg-[#efefef]" />
        <div className="h-4 w-80 animate-pulse rounded-[2px] bg-[#efefef]" />
        <div className="box h-52 animate-pulse bg-[#f3f3f3]" />
        <div className="box h-56 animate-pulse bg-[#f3f3f3]" />
      </main>
    );
  }
  if (!event) return <MissingEvent />;

  return (
    <main className="shell flex flex-col gap-6 pb-20 pt-10">
      <h1 className="text-4xl font-medium">Admin</h1>
      <p className="text-sm text-muted-foreground">Settings for {event.title}.</p>
      <OutpostStatus />
      {saved ? <p className="text-sm text-muted-foreground">{saved}</p> : null}
      <Card>
        <CardHeader>
          <CardTitle>Event</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <label className="text-sm">
            Name
            <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
          </label>
          <label className="text-sm">
            City
            <input className="field" value={city} onChange={(e) => setCity(e.target.value)} maxLength={80} />
          </label>
          <label className="text-sm">
            Venue
            <input className="field" value={venue} onChange={(e) => setVenue(e.target.value)} maxLength={80} />
          </label>
          <Button variant="outline" type="button" onClick={() => void saveEvent()}>
            Save event
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Score reveal</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            {event.reveal_scores
              ? "Scores are public on each team's scorecard."
              : "Scores stay hidden on scorecards until you reveal them."}
          </p>
          <Button
            variant="outline"
            type="button"
            onClick={() => void setReveal(!event.reveal_scores)}
          >
            {event.reveal_scores ? "Hide scores" : "Reveal scores"}
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Rubric weights</CardTitle>
        </CardHeader>
        <CardContent>
          {DEFAULT_RUBRIC.dimensions.map((d) => (
            <div key={d.id} className="mb-5 grid grid-cols-[10rem_minmax(0,1fr)_2rem] items-center gap-3 text-sm">
              <span>{d.label}</span>
              <Slider
                min={0}
                max={50}
                step={1}
                value={[weights[d.id] ?? 0]}
                onValueChange={(next) =>
                  setWeights((w) => ({ ...w, [d.id]: next[0] ?? 0 }))
                }
                aria-label={d.label}
              />
              <span className="font-mono tabular-nums">{weights[d.id]}</span>
            </div>
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
            <p className="text-sm font-medium">{event.title}</p>
            {event.city || event.venue ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {[event.city, event.venue].filter(Boolean).join(" · ")}
              </p>
            ) : null}
            <p className="mt-3 font-mono text-xs text-muted-foreground">Luma import is a demo list</p>
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
