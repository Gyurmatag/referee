"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CreateSubmissionSchema, EventPublicSchema, type EventPublic } from "@referee/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DEFAULT_EVENT } from "@/lib/core";

export default function SubmitPage() {
  const router = useRouter();
  const [event, setEvent] = useState<EventPublic>(DEFAULT_EVENT);
  const [selected, setSelected] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void fetch("/api/event")
      .then((r) => r.json())
      .then((json) => {
        const parsed = EventPublicSchema.safeParse(json);
        if (parsed.success) {
          setEvent(parsed.data);
          setSelected(parsed.data.claims.map((c) => c.claim));
        }
      })
      .catch(() => undefined);
  }, []);

  function toggle(claim: string) {
    setSelected((current) =>
      current.includes(claim) ? current.filter((c) => c !== claim) : [...current, claim],
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const nextErrors: Record<string, string> = {};
    const parsed = CreateSubmissionSchema.safeParse({
      team_name: form.get("team_name") || "Team",
      repo_url: form.get("repo_url"),
      live_url: form.get("live_url") || "",
      claims: selected.map((claim) => ({ claim })),
      run_hints: form.get("run_hints") || "",
      devin_links: String(form.get("devin_links") || "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      display_consent: form.get("display_consent") === "on",
    });
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] ? String(issue.path[0]) : "form";
        if (!nextErrors[key]) nextErrors[key] = issue.message;
      }
    }
    if (selected.length < 3) nextErrors.claims = "Select at least three event claims";
    if (event.wall_enabled && form.get("display_consent") !== "on") {
      nextErrors.display_consent = "Display consent is required for the wall";
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    if (!parsed.success) return;
    setPending(true);
    const res = await fetch("/api/submissions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(parsed.data),
    });
    const body = (await res.json().catch(() => null)) as { id?: string; error?: string } | null;
    setPending(false);
    if (!res.ok || !body?.id) {
      setErrors({ form: body?.error ?? "Submit failed" });
      return;
    }
    router.push(`/s/${body.id}`);
  }

  return (
    <main className="mx-auto max-w-lg px-6 pb-20 pt-10">
      <h1 className="text-4xl font-medium">Submit</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Claims come from {event.title} sponsors and are checked automatically.
      </p>
      <Card className="mt-8">
        <CardContent>
          <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-4">
            <label className="text-sm">
              Team name
              <input name="team_name" className="field" />
            </label>
            <label className="text-sm">
              Repo URL
              <input
                name="repo_url"
                placeholder="https://github.com/org/repo"
                className="field"
              />
              {errors.repo_url ? <p className="mt-1 text-fail">{errors.repo_url}</p> : null}
            </label>
            <label className="text-sm">
              Live URL - leave empty if Cloudflare should deploy to cfi-ops.workers.dev
              <input name="live_url" className="field" />
            </label>
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm">Sponsor claims</legend>
              {event.claims.length === 0 ? (
                <div className="flex flex-col gap-2">
                  <div className="h-5 w-full animate-pulse rounded-[2px] bg-[#efefef]" />
                  <div className="h-5 w-11/12 animate-pulse rounded-[2px] bg-[#efefef]" />
                  <div className="h-5 w-4/5 animate-pulse rounded-[2px] bg-[#efefef]" />
                </div>
              ) : (
                event.claims.map((claim) => (
                  <label key={claim.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selected.includes(claim.claim)}
                      onChange={() => toggle(claim.claim)}
                    />
                    {claim.sponsor} - {claim.claim}
                  </label>
                ))
              )}
            </fieldset>
            {errors.claims ? <p className="text-sm text-fail">{errors.claims}</p> : null}
            <label className="text-sm">
              Run hints
              <textarea name="run_hints" className="field-area" />
            </label>
            <label className="text-sm">
              Devin session links
              <textarea name="devin_links" className="field-area" />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="display_consent" defaultChecked />
              Show this submission on the wall
            </label>
            {errors.display_consent ? (
              <p className="text-sm text-fail">{errors.display_consent}</p>
            ) : null}
            {errors.form ? <p className="text-sm text-fail">{errors.form}</p> : null}
            <Button type="submit" disabled={pending}>
              {pending ? "Submitting" : "Submit"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
