"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { EventPublicSchema, type EventPublic } from "@referee/shared";
import { ProductPreview } from "@/components/product-preview";
import { Button } from "@/components/ui/button";
import { DEFAULT_EVENT } from "@/lib/core";

export default function RegisterPage() {
  const { data: session, status } = useSession();
  const [event, setEvent] = useState<EventPublic>(DEFAULT_EVENT);

  useEffect(() => {
    void fetch("/api/event")
      .then((r) => r.json())
      .then((json) => {
        const parsed = EventPublicSchema.safeParse(json);
        if (parsed.success) setEvent(parsed.data);
      })
      .catch(() => undefined);
  }, []);

  const sponsors = [...new Set(event.claims.map((claim) => claim.sponsor))];
  const featured = sponsors[0] ?? "OpenAI";

  return (
    <main>
      <section className="mx-auto flex max-w-5xl flex-col items-center px-6 pb-10 pt-16 text-center md:pt-24">
        <h1 className="max-w-4xl text-[56px] font-medium leading-none tracking-[-0.04em] text-foreground md:text-[80px]">
          Referee, the
          <br />
          hackathon judge
        </h1>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {status === "loading" ? (
            <div className="flex items-center gap-3">
              <div className="h-9 w-28 animate-pulse rounded-[2px] bg-[#191919]" />
              <div className="h-9 w-24 animate-pulse rounded-[2px] bg-[#efefef]" />
            </div>
          ) : session?.user?.login ? (
            <>
              <Button asChild size="lg">
                <Link href="/submit">Submit</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/wall">Open wall</Link>
              </Button>
            </>
          ) : (
            <>
              <Button type="button" size="lg" onClick={() => void signIn("github", { callbackUrl: "/submit" })}>
                Continue with GitHub
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/wall">Open wall</Link>
              </Button>
            </>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-[1120px] px-4 pb-20 md:px-6">
        <ProductPreview />
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-24 text-center">
        <p className="text-sm text-muted-foreground">Sponsors for this event choose to</p>
        <h2 className="mt-3 text-[48px] font-medium leading-none tracking-[-0.04em] md:text-[64px]">
          Build with <span className="text-brand">{featured}</span>
        </h2>
        <div className="mt-8">
          <Button asChild>
            <Link href="/wall">Hear from the wall</Link>
          </Button>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {sponsors.map((sponsor) => (
            <div
              key={sponsor}
              className="tile flex min-h-24 items-center justify-center px-3 text-center text-sm font-medium text-muted-foreground"
            >
              {sponsor}
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm tabular-nums text-muted-foreground">
          {event.submissions} submissions, {event.judges_running} judges running
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-28">
        <h2 className="text-[48px] font-medium leading-none tracking-[-0.04em] md:text-[64px]">
          Use cases
        </h2>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Use Referee to take a GitHub repo from submit to a public wall - claims, deploy, and score
          in one place.
        </p>
        <div className="mt-10 grid gap-3 md:grid-cols-3">
          <article className="tile p-8">
            <h3 className="text-xl font-medium">Submit and claim</h3>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              <li>GitHub repo and optional live URL</li>
              <li>Sponsor claims prefilled from the event</li>
              <li>Empty live URL means the sandbox deploys</li>
            </ul>
          </article>
          <article className="tile p-8">
            <h3 className="text-xl font-medium">Judge in parallel</h3>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              <li>Build, tracks, and review on each repo</li>
              <li>Cloudflare sandbox - up to six at once</li>
              <li>Every step is posted to the wall</li>
            </ul>
          </article>
          <article className="tile p-8">
            <h3 className="text-xl font-medium">Score and reveal</h3>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              <li>Organizer rubric and overrides</li>
              <li>Reveal scores when the room is ready</li>
              <li>Same GitHub login can also submit</li>
            </ul>
          </article>
        </div>
      </section>
    </main>
  );
}
