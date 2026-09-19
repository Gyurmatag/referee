"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const loggedIn = Boolean(session?.user?.login);

  useEffect(() => {
    if (status === "authenticated" && loggedIn) {
      router.replace("/events");
    }
  }, [loggedIn, router, status]);

  if (status === "authenticated" && loggedIn) {
    return (
      <main className="mx-auto max-w-5xl px-6 pb-20 pt-16">
        <div className="mx-auto h-16 w-80 animate-pulse rounded-[2px] bg-[#efefef]" />
        <div className="mx-auto mt-8 h-9 w-40 animate-pulse rounded-[2px] bg-[#191919]" />
      </main>
    );
  }

  return (
    <main>
      <section className="mx-auto flex max-w-5xl flex-col items-center px-6 pb-16 pt-16 text-center md:pt-24">
        <h1 className="max-w-4xl text-[56px] font-medium leading-none tracking-[-0.04em] text-foreground md:text-[80px]">
          Referee, the
          <br />
          hackathon judge
        </h1>
        <p className="mt-6 max-w-xl text-muted-foreground">
          Sign in, pick an event, then submit a team or run the room.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {status === "loading" ? (
            <div className="h-9 w-44 animate-pulse rounded-[2px] bg-[#191919]" />
          ) : (
            <Button type="button" size="lg" onClick={() => void signIn("github", { callbackUrl: "/events" })}>
              Continue with GitHub
            </Button>
          )}
        </div>
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
              <li>Sponsor claims come from the event</li>
              <li>Empty live URL means Devin deploys it</li>
            </ul>
          </article>
          <article className="tile p-8">
            <h3 className="text-xl font-medium">Judge in parallel</h3>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              <li>Build, tracks, and review on each repo</li>
              <li>Sandbox clones the repo and runs Playwright e2e</li>
              <li>Screenshots land on the event wall</li>
            </ul>
          </article>
          <article className="tile p-8">
            <h3 className="text-xl font-medium">Score and reveal</h3>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              <li>Admins set the rubric per event</li>
              <li>Reveal scores when the room is ready</li>
              <li>Same GitHub login can also submit</li>
            </ul>
          </article>
        </div>
      </section>
    </main>
  );
}
