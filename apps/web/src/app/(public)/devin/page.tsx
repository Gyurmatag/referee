import Link from "next/link";
import { DEVIN_PLAYBOOKS, DEVIN_SESSIONS } from "@/lib/devin-evidence";

export const metadata = {
  title: "Devin | Referee",
  description: "Playbooks, parallel sessions, review loop, and CI that Devin can fix.",
};

export default function DevinPage() {
  return (
    <main className="shell pb-20 pt-16">
      <h1 className="text-4xl font-medium md:text-6xl">Devin drives Referee</h1>
      <p className="mt-4 max-w-2xl text-muted-foreground">
        Three playbooks. Three parallel sessions. A review loop that writes report.json after
        every phase. CI that starts Devin when a PR check fails.
      </p>

      <section className="mt-12">
        <h2 className="text-2xl font-medium">Parallel sessions</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {DEVIN_SESSIONS.map((session) => (
            <article key={session.href} className="box p-6">
              <h3 className="text-lg font-medium">{session.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{session.note}</p>
              <p className="mt-4 text-sm">
                <a className="underline" href={session.href} target="_blank" rel="noreferrer">
                  Open session
                </a>
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-medium">Playbooks</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {DEVIN_PLAYBOOKS.map((playbook) => (
            <article key={playbook.macro} className="box p-6">
              <p className="font-mono text-sm text-muted-foreground">{playbook.macro}</p>
              <h3 className="mt-1 text-lg font-medium">{playbook.title}</h3>
              <p className="mt-4 flex flex-col gap-1 text-sm">
                <a className="underline" href={playbook.href} target="_blank" rel="noreferrer">
                  Open playbook
                </a>
                <Link className="underline" href={`https://github.com/Gyurmatag/referee/blob/main/${playbook.file}`}>
                  Source
                </Link>
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-12 grid gap-3 md:grid-cols-2">
        <article className="box p-6">
          <h2 className="text-2xl font-medium">Review loop</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            judge/run.sh starts a Devin CLI session. After every phase Devin writes
            /out/report.json. The Durable Object polls that file, stores it, and the wall
            updates. A later session can read the first two and improve the playbook.
          </p>
        </article>
        <article className="box p-6">
          <h2 className="text-2xl font-medium">Devin-fixed CI</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            .github/workflows/ci.yml runs pnpm test and pnpm typecheck. If a pull request
            fails, .github/workflows/devin-ci-fix.yml starts a !referee-ci session.
          </p>
          <p className="mt-4 text-sm">
            <a
              className="underline"
              href="https://github.com/Gyurmatag/referee/blob/main/.github/workflows/ci.yml"
            >
              CI workflow
            </a>
          </p>
        </article>
      </section>
    </main>
  );
}
