export function ProductPreview() {
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
        <span className="shrink-0 font-mono text-[11px] text-muted-foreground">#357 +1</span>
      </div>

      <div className="grid border-t border-black/10 md:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
        <div className="flex min-h-[520px] flex-col px-4 pb-3 pt-4 md:px-5">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1 rounded-[2px] bg-[#f3f3f3] px-4 py-2 text-[13px] leading-5">
              Check OpenAI, Groq, and Cloudflare claims on both repos, then test.
            </div>
            <span className="mt-0.5 size-7 shrink-0 rounded-[2px] bg-[#d9d9d9]" />
          </div>

          <p className="mt-4 text-[12px] text-muted-foreground">Used playbook: tracks</p>
          <p className="mt-2 max-w-[52ch] text-[13px] leading-5 text-muted-foreground">
            I will clone both repos, rebuild only if there is no live URL, then write the report.
          </p>
          <p className="mt-3 text-[12px] text-muted-foreground">Worked for 4m 13s</p>

          <JobCard
            repo="Gyurmatag/budapest-worker-radar"
            title="Live URL already deployed - skip rebuild"
            meta="e38191a · main · 6 files"
          />
          <JobCard
            repo="Gyurmatag/budapest-voice-desk"
            title="No live URL - sandbox deploy"
            meta="undeployed control · +25 −131"
          />

          <p className="mt-4 text-[13px] leading-5">
            Done. Chain Bridge is on workers.dev. Danube is the undeployed control. Full report attached.
          </p>
          <p className="mt-3 text-[12px] text-muted-foreground">score_report.md</p>
          <p className="mt-2 text-[12px] text-muted-foreground">Referee is ready for the next repo</p>

          <div className="mt-auto flex items-center gap-2 rounded-[10px] border border-black/10 bg-elevated px-3 py-2.5 text-[13px] text-muted-foreground">
            <span className="text-lg leading-none">+</span>
            <span>Ask Referee to check a repo</span>
          </div>
        </div>

        <aside className="hidden border-l border-black/10 px-5 py-4 md:block">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[13px] font-medium">test_score_report.md</p>
            <span className="text-[12px] text-muted-foreground">↓</span>
          </div>
          <p className="mt-3 text-[15px] font-medium tracking-[-0.03em]">
            Test report: check sponsor claims
          </p>
          <p className="mt-2 text-[12px] leading-5 text-muted-foreground">
            PRs: worker-radar / voice-desk. Live URL vs sandbox. Compared Cloudflare, OpenAI, and Groq
            claims.
          </p>

          <p className="mt-6 text-[13px] font-medium">worker-radar</p>
          <p className="mt-1 text-[12px] text-muted-foreground">Homepage</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <CompareTile label="Before on GitHub" tone="plain">
              Undeployed
            </CompareTile>
            <CompareTile label="After on workers.dev" tone="brand">
              Deployed
            </CompareTile>
          </div>

          <p className="mt-6 text-[13px] font-medium">voice-desk</p>
          <p className="mt-1 text-[12px] text-muted-foreground">Homepage</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <CompareTile label="Before on GitHub" tone="plain">
              Undeployed
            </CompareTile>
            <CompareTile label="After on localhost" tone="brand">
              Sandbox
            </CompareTile>
          </div>
        </aside>
      </div>
    </div>
  );
}

function JobCard({ repo, title, meta }: { repo: string; title: string; meta: string }) {
  return (
    <div className="mt-3 rounded-[10px] border border-black/10 bg-elevated px-3 py-2.5">
      <div className="flex items-center justify-between gap-2 text-[12px]">
        <span className="truncate text-muted-foreground">
          <span className="mr-1.5 inline-block size-2 rounded-[2px] bg-running align-middle" />
          {repo}
        </span>
        <span className="text-black/25">↗</span>
      </div>
      <p className="mt-1 text-[13px] leading-5">{title}</p>
      <p className="mt-1 font-mono text-[11px] text-muted-foreground">{meta}</p>
    </div>
  );
}

function CompareTile({
  label,
  tone,
  children,
}: {
  label: string;
  tone: "plain" | "brand";
  children: string;
}) {
  return (
    <div className="rounded-[10px] bg-[#f3f3f3] px-3 py-5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p
        className={`mt-3 text-[34px] font-medium leading-[0.95] tracking-[-0.04em] ${
          tone === "brand" ? "text-brand" : "text-foreground"
        }`}
      >
        {children}
      </p>
    </div>
  );
}
