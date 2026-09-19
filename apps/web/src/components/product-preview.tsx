"use client";

import Link from "next/link";
import { ShotGallery } from "@/components/shot-gallery";
import { useWall } from "@/hooks/use-wall";

export function ProductPreview() {
  const { data } = useWall({ live: false });
  const teams = data?.teams ?? [];

  const shots = teams.flatMap((team) =>
    (team.screenshots ?? []).map((key) => ({ team: team.team_name ?? "Team", key })),
  );

  return (
    <div className="hero-frame">
      <div className="flex items-center justify-between px-4 py-2.5 text-[13px]">
        <div className="flex min-w-0 items-center gap-2 text-muted-foreground">
          <span className="grid size-4 place-items-center rounded-[3px] bg-foreground text-[8px] text-background">
            R
          </span>
          <span>Budapest Build</span>
          <span className="text-black/20">/</span>
          <span className="truncate text-foreground">Check sponsor claims</span>
        </div>
        <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
          {shots.length} e2e shots
        </span>
      </div>

      <div className="grid border-t border-black/10 md:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
        <div className="flex min-h-[520px] flex-col px-4 pb-3 pt-4 md:px-5">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1 rounded-[2px] bg-[#f3f3f3] px-4 py-2 text-[13px] leading-5">
              Clone the repo in the sandbox - review it there - run Playwright against the
              deployed URL.
            </div>
            <span className="mt-0.5 size-7 shrink-0 rounded-[2px] bg-[#d9d9d9]" />
          </div>

          <p className="mt-4 text-[12px] text-muted-foreground">Used playbook: !referee-judge</p>
          <p className="mt-2 max-w-[52ch] text-[13px] leading-5 text-muted-foreground">
            Sandbox clone - Playwright e2e - screenshots on this page after the run.
          </p>

          {teams.length === 0 ? (
            <>
              <JobCard repo="waiting" title="No consented teams yet" meta="submit a repo to start" />
            </>
          ) : (
            teams.map((team) => (
              <JobCard
                key={team.id ?? team.team_name}
                href={team.id ? `/wall/${team.id}` : undefined}
                repo={team.team_name ?? "Team"}
                title={
                  team.screenshots?.length
                    ? `E2E ran - ${team.screenshots.length} screenshots`
                    : "Waiting for sandbox review"
                }
                meta={team.deploy_url ?? "no deploy url"}
              />
            ))
          )}

          <div className="mt-4 md:hidden">
            {shots.length === 0 ? (
              <div className="rounded-[10px] bg-[#f3f3f3] px-3 py-8 text-center text-[12px] text-muted-foreground">
                Screenshots land here after the first sandbox review
              </div>
            ) : (
              <ShotGallery shots={shots.map((s) => s.key)} label="E2E screenshots" />
            )}
          </div>

          <div className="mt-auto flex items-center gap-2 rounded-[10px] border border-black/10 bg-elevated px-3 py-2.5 text-[13px] text-muted-foreground">
            <span className="text-lg leading-none">+</span>
            <span>Ask Referee to check a repo</span>
          </div>
        </div>

        <aside className="hidden border-l border-black/10 px-5 py-4 md:block">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[13px] font-medium">E2E screenshots</p>
            <span className="text-[12px] text-muted-foreground">live</span>
          </div>
          <p className="mt-3 text-[15px] font-medium tracking-[-0.03em]">
            Playwright shots from the sandbox
          </p>
          <p className="mt-2 text-[12px] leading-5 text-muted-foreground">
            Home and health pages after clone, review, and deploy.
          </p>
          <div className="mt-5">
            {shots.length === 0 ? (
              <div className="rounded-[10px] bg-[#f3f3f3] px-3 py-8 text-center text-[12px] text-muted-foreground">
                Screenshots land here after the first sandbox review
              </div>
            ) : (
              <ShotGallery shots={shots.map((s) => s.key)} />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function JobCard({
  repo,
  title,
  meta,
  href,
}: {
  repo: string;
  title: string;
  meta: string;
  href?: string;
}) {
  const inner = (
    <>
      <div className="flex items-center justify-between gap-2 text-[12px]">
        <span className="truncate text-muted-foreground">
          <span className="mr-1.5 inline-block size-2 rounded-[2px] bg-running align-middle" />
          {repo}
        </span>
        <span className="text-black/25">↗</span>
      </div>
      <p className="mt-1 text-[13px] leading-5">{title}</p>
      <p className="mt-1 font-mono text-[11px] text-muted-foreground">{meta}</p>
    </>
  );
  if (href) {
    return (
      <Link href={href} className="mt-3 block rounded-[10px] border border-black/10 bg-elevated px-3 py-2.5">
        {inner}
      </Link>
    );
  }
  return <div className="mt-3 rounded-[10px] border border-black/10 bg-elevated px-3 py-2.5">{inner}</div>;
}
