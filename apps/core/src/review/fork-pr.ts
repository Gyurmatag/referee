import type { Provenance, Review } from "@referee/shared";
import { parseGithubRepo } from "../provenance/github.js";

export function reviewUrlFromPr(prUrl: string): string {
  return prUrl.replace("https://github.com/", "https://devinreview.com/");
}

export function firstInWindowSha(provenance: Provenance | null): string | null {
  if (!provenance) return null;
  const inWindow = provenance.commits.filter((c) => c.at);
  return inWindow.at(-1)?.sha ?? provenance.commits.at(-1)?.sha ?? null;
}

export function parentOfFirstInWindow(commits: Provenance["commits"]): string | null {
  if (commits.length === 0) return null;
  const chronological = [...commits].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  return chronological[0]?.sha ?? null;
}

export function heuristicReviewScore(provenance: Provenance | null): number {
  if (!provenance) return 0.4;
  const window = Math.min(1, Math.max(0, provenance.in_window_ratio));
  const human = Math.min(1, Math.max(0, 1 - provenance.bot_commit_ratio * 0.5));
  return Math.round((window * 0.6 + human * 0.4) * 100) / 100;
}

type GithubRepo = {
  default_branch: string;
  full_name: string;
  clone_url?: string;
};

type GithubCommit = {
  parents?: { sha: string }[];
};

export async function createReview(input: {
  repoUrl: string;
  teamName: string;
  provenance: Provenance | null;
  token?: string;
  org?: string;
  fetchImpl?: typeof fetch;
}): Promise<Review> {
  const fallback: Review = {
    fork_repo: "",
    pr_url: "",
    review_url: "",
    summary: "Review skipped",
    summary_score: heuristicReviewScore(input.provenance),
    screenshots: [],
  };
  if (!input.token) {
    return { ...fallback, summary: "Review skipped - missing GITHUB_TOKEN" };
  }
  const { owner, repo } = parseGithubRepo(input.repoUrl);
  const get = input.fetchImpl ?? fetch;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${input.token}`,
    "User-Agent": "referee",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  async function json<T>(path: string, init?: RequestInit): Promise<{ ok: boolean; status: number; body: T | null; text: string }> {
    const res = await get(`https://api.github.com${path}`, { ...init, headers: { ...headers, ...init?.headers } });
    const text = await res.text();
    let body: T | null = null;
    try {
      body = text ? (JSON.parse(text) as T) : null;
    } catch {
      body = null;
    }
    return { ok: res.ok, status: res.status, body, text };
  }

  const source = await json<GithubRepo>(`/repos/${owner}/${repo}`);
  if (!source.ok || !source.body) {
    return { ...fallback, summary: `Review skipped - source repo ${source.status}` };
  }
  const defaultBranch = source.body.default_branch || "main";
  const forkBody = input.org ? { organization: input.org } : {};
  const forked = await json<GithubRepo>(`/repos/${owner}/${repo}/forks`, {
    method: "POST",
    body: JSON.stringify(forkBody),
  });
  if (!forked.ok || !forked.body?.full_name) {
    return { ...fallback, summary: `Review skipped - fork ${forked.status}` };
  }
  const forkFull = forked.body.full_name;
  const [forkOwner, forkRepo] = forkFull.split("/");
  if (!forkOwner || !forkRepo) {
    return { ...fallback, summary: "Review skipped - invalid fork name" };
  }

  for (let i = 0; i < 8; i++) {
    const ready = await json<GithubRepo>(`/repos/${forkOwner}/${forkRepo}`);
    if (ready.ok) break;
    await new Promise((r) => setTimeout(r, 1500));
  }

  const first = parentOfFirstInWindow(input.provenance?.commits ?? []);
  let baseSha = first;
  if (first) {
    const commit = await json<GithubCommit>(`/repos/${owner}/${repo}/commits/${first}`);
    baseSha = commit.body?.parents?.[0]?.sha ?? first;
  }
  if (!baseSha) {
    const root = await json<{ sha: string }[]>(
      `/repos/${owner}/${repo}/commits?sha=${encodeURIComponent(defaultBranch)}&per_page=1`,
    );
    baseSha = root.body?.[0]?.sha ?? "";
  }
  if (baseSha) {
    await json(`/repos/${forkOwner}/${forkRepo}/git/refs`, {
      method: "POST",
      body: JSON.stringify({ ref: "refs/heads/referee-base", sha: baseSha }),
    });
  }

  const inWindow = input.provenance?.commits.filter((c) => {
    // Count is already computed on provenance; use total commits as fallback.
    return true;
  }).length ?? 0;
  const title = `Referee review: ${input.teamName} (${inWindow} commits in window)`;
  const pr = await json<{ html_url?: string }>(`/repos/${forkOwner}/${forkRepo}/pulls`, {
    method: "POST",
    body: JSON.stringify({
      title,
      head: defaultBranch,
      base: "referee-base",
      body: "Opened by Referee for evidence-backed review. Do not merge.",
    }),
  });
  const prUrl = pr.body?.html_url ?? "";
  if (!prUrl) {
    return {
      fork_repo: `https://github.com/${forkFull}`,
      pr_url: "",
      review_url: "",
      summary: `Fork created; PR failed (${pr.status})`,
      summary_score: heuristicReviewScore(input.provenance),
      screenshots: [],
    };
  }
  return {
    fork_repo: `https://github.com/${forkFull}`,
    pr_url: prUrl,
    review_url: reviewUrlFromPr(prUrl),
    summary: title,
    summary_score: heuristicReviewScore(input.provenance),
    screenshots: [],
  };
}
