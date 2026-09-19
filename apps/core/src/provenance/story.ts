import type { CommitStory, Provenance } from "@referee/shared";

const DEVIN_AUTHOR = /devin/i;
const DEVIN_TRAILER = /co-authored-by:\s*devin/i;
const BOT_LOGIN = /\[bot\]$|bot$/i;

export function isBotAuthor(author: string): boolean {
  return BOT_LOGIN.test(author) || DEVIN_AUTHOR.test(author);
}

export function hasDevinTrailer(message: string): boolean {
  return DEVIN_TRAILER.test(message);
}

export function inWindow(at: string, start: string, end: string): boolean {
  const t = Date.parse(at);
  const a = Date.parse(start);
  const b = Date.parse(end);
  if (Number.isNaN(t) || Number.isNaN(a) || Number.isNaN(b)) return false;
  return t >= a && t <= b;
}

export function computeProvenance(input: {
  repoCreatedAt: string;
  isFork: boolean;
  parentRepo: string | null;
  commits: CommitStory[];
  windowStart: string;
  windowEnd: string;
  devinPrs: number;
  notes?: string;
}): Provenance {
  const total = input.commits.length;
  const inWin = input.commits.filter((c) =>
    inWindow(c.at, input.windowStart, input.windowEnd),
  ).length;
  const bots = input.commits.filter((c) => c.is_bot).length;
  const coauthor = input.commits.filter((c) => c.coauthored_by_devin).length;
  return {
    repo_created_at: input.repoCreatedAt,
    is_fork: input.isFork,
    parent_repo: input.parentRepo,
    commits: [...input.commits].sort((a, b) => Date.parse(a.at) - Date.parse(b.at)),
    in_window_ratio: total === 0 ? 0 : inWin / total,
    bot_commit_ratio: total === 0 ? 0 : bots / total,
    coauthor_devin_ratio: total === 0 ? 0 : coauthor / total,
    devin_prs: input.devinPrs,
    notes: input.notes ?? "",
  };
}

export function storyFromCommit(input: {
  sha: string;
  at: string;
  author: string;
  message: string;
  additions?: number;
  deletions?: number;
}): CommitStory {
  return {
    sha: input.sha,
    at: input.at,
    author: input.author,
    is_bot: isBotAuthor(input.author),
    coauthored_by_devin: hasDevinTrailer(input.message) || DEVIN_AUTHOR.test(input.author),
    additions: input.additions ?? 0,
    deletions: input.deletions ?? 0,
  };
}
