/**
 * POST calibration repos and wait for the full pipeline.
 * CORE_URL and INTERNAL_API_KEY required.
 */
type Case = {
  name: string;
  repo: string;
  live_url?: string;
  claims: { claim: string }[];
};

const cases: Case[] = [
  {
    name: process.env.CALIBRATION_NAME ?? "E1-node",
    repo: process.env.CALIBRATION_REPO ?? "https://github.com/sindresorhus/delay",
    live_url: process.env.CALIBRATION_LIVE_URL,
    claims: [
      { claim: "Repository has a README" },
      { claim: "Package manifest is present" },
      { claim: "Default export or function is documented" },
    ],
  },
];

if (process.env.CALIBRATION_SUITE === "full") {
  cases.push(
    {
      name: "E2-python",
      repo: "https://github.com/pallets/click",
      claims: [
        { claim: "Repository has a README" },
        { claim: "Python package metadata is present" },
        { claim: "Tests or examples exist" },
      ],
    },
    {
      name: "E3-static",
      repo: "https://github.com/mdn/beginner-html-site-styled",
      claims: [
        { claim: "index.html exists" },
        { claim: "Stylesheet is linked" },
        { claim: "Page has a heading" },
      ],
    },
  );
}

const core = process.env.CORE_URL;
const key = process.env.INTERNAL_API_KEY;
if (!core || !key) {
  console.log("Set CORE_URL and INTERNAL_API_KEY. Skipping live POST.");
  process.exit(0);
}

const headers = {
  "content-type": "application/json",
  "x-internal-key": key,
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
};

type Submission = {
  id: string;
  status: string;
  score: { total: number; confidence: number } | null;
  deployment: { url: string; healthy: boolean } | null;
  review: { review_url: string } | null;
  provenance: { is_fork: boolean; in_window_ratio: number } | null;
  judge_runs: {
    judge: string;
    phase: string;
    report?: {
      build?: { status: string };
      recipe?: { start?: string };
      claims?: unknown[];
      tracks?: unknown[];
    };
  }[];
};

async function runCase(item: Case): Promise<number> {
  const created = await fetch(`${core}/submissions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      team_name: item.name,
      repo_url: item.repo,
      live_url: item.live_url ?? "",
      claims: item.claims,
      run_hints: "",
      devin_links: [],
      display_consent: true,
    }),
  });
  if (!created.ok) {
    console.error(item.name, await created.text());
    return 1;
  }
  const submission = (await created.json()) as { id: string };
  console.log("created", item.name, submission.id);

  for (let i = 0; i < 180; i++) {
    const res = await fetch(`${core}/submissions/${submission.id}`, { headers });
    const current = (await res.json()) as Submission;
    const phases = current.judge_runs.map((r) => `${r.judge}:${r.phase}`).join(" ");
    console.log(i, item.name, current.status, phases || "-");
    if (current.status === "done" || current.status === "failed") {
      const build = current.judge_runs.find((r) => r.judge === "build_e2e");
      const tracks = current.judge_runs.find((r) => r.judge === "tracks");
      console.log(
        JSON.stringify(
          {
            name: item.name,
            id: submission.id,
            status: current.status,
            build: build?.report?.build?.status,
            recipe: Boolean(build?.report?.recipe),
            deploy: current.deployment,
            tracks: tracks?.report?.tracks?.length ?? 0,
            review: current.review?.review_url,
            score: current.score,
          },
          null,
          2,
        ),
      );
      if (current.status !== "done") return 2;
      if (!current.score) return 2;
      return 0;
    }
    await new Promise((r) => setTimeout(r, 10_000));
  }
  console.error(item.name, "timed out waiting for done");
  return 3;
}

let code = 0;
for (const item of cases) {
  const next = await runCase(item);
  if (next !== 0) code = next;
}
process.exit(code);
