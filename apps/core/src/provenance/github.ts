import type { CommitStory, Provenance } from "@referee/shared";
import { computeProvenance, storyFromCommit } from "./story.js";
import { isDevinPr } from "./devin-role.js";

export function parseGithubRepo(url: string): { owner: string; repo: string } {
  const cleaned = url.replace(/\.git$/, "").replace(/\/$/, "");
  const match = cleaned.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)$/);
  if (!match?.[1] || !match[2]) {
    throw new Error("Public GitHub repo URL required");
  }
  return { owner: match[1], repo: match[2] };
}

type GithubRepo = {
  created_at: string;
  fork: boolean;
  parent?: { full_name: string };
  default_branch: string;
};

type GithubCommit = {
  sha: string;
  commit: {
    message: string;
    author?: { name?: string; date?: string };
    committer?: { date?: string };
  };
  author?: { login?: string };
  stats?: { additions?: number; deletions?: number };
};

type GithubPr = {
  title: string;
  body?: string | null;
  user?: { login?: string };
};

export async function fetchProvenance(input: {
  repoUrl: string;
  windowStart: string;
  windowEnd: string;
  token?: string;
  fetchImpl?: typeof fetch;
}): Promise<{ provenance: Provenance; headSha: string }> {
  const { owner, repo } = parseGithubRepo(input.repoUrl);
  const get = input.fetchImpl ?? fetch;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "referee",
  };
  if (input.token) headers.Authorization = `Bearer ${input.token}`;

  async function json<T>(path: string): Promise<T> {
    const res = await get(`https://api.github.com${path}`, { headers });
    if (!res.ok) {
      throw new Error(`GitHub ${res.status} ${path}`);
    }
    return (await res.json()) as T;
  }

  const meta = await json<GithubRepo>(`/repos/${owner}/${repo}`);
  const commits: CommitStory[] = [];
  for (let page = 1; page <= 5 && commits.length < 500; page++) {
    const batch = await json<GithubCommit[]>(
      `/repos/${owner}/${repo}/commits?sha=${encodeURIComponent(meta.default_branch)}&per_page=100&page=${page}`,
    );
    if (!Array.isArray(batch) || batch.length === 0) break;
    for (const item of batch) {
      commits.push(
        storyFromCommit({
          sha: item.sha,
          at: item.commit.committer?.date ?? item.commit.author?.date ?? "",
          author: item.author?.login ?? item.commit.author?.name ?? "unknown",
          message: item.commit.message,
          additions: item.stats?.additions,
          deletions: item.stats?.deletions,
        }),
      );
    }
    if (batch.length < 100) break;
  }

  let devinPrs = 0;
  try {
    const prs = await json<GithubPr[]>(
      `/repos/${owner}/${repo}/pulls?state=all&per_page=50`,
    );
    devinPrs = prs.filter((pr) =>
      isDevinPr({ user: pr.user?.login, title: pr.title, body: pr.body ?? "" }),
    ).length;
  } catch {
    devinPrs = 0;
  }

  const notes: string[] = [];
  if (meta.fork) notes.push("Repo is a fork");
  if (commits.some((c) => !inWindowSafe(c.at, input.windowStart, input.windowEnd))) {
    notes.push("Repo has commits outside the event window");
  }

  const provenance = computeProvenance({
    repoCreatedAt: meta.created_at,
    isFork: Boolean(meta.fork),
    parentRepo: meta.parent?.full_name ?? null,
    commits,
    windowStart: input.windowStart,
    windowEnd: input.windowEnd,
    devinPrs,
    notes: notes.join(". "),
  });

  return { provenance, headSha: commits[0]?.sha ?? "" };
}

function inWindowSafe(at: string, start: string, end: string): boolean {
  const t = Date.parse(at);
  return t >= Date.parse(start) && t <= Date.parse(end);
}
