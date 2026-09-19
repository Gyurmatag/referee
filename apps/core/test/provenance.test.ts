import { describe, expect, it } from "vitest";
import { isDevinPr } from "../src/provenance/devin-role.js";
import { fetchProvenance, parseGithubRepo } from "../src/provenance/github.js";
import { computeProvenance, storyFromCommit } from "../src/provenance/story.js";

const WINDOW = {
  windowStart: "2026-09-19T00:00:00.000Z",
  windowEnd: "2026-09-20T12:00:00.000Z",
};

describe("provenance", () => {
  it("parses a public GitHub URL", () => {
    expect(parseGithubRepo("https://github.com/example/north-star.git")).toEqual({
      owner: "example",
      repo: "north-star",
    });
  });

  it("flags a pre-window fork (E5)", () => {
    const commits = [
      storyFromCommit({
        sha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        at: "2026-01-01T00:00:00.000Z",
        author: "alice",
        message: "old work",
      }),
      storyFromCommit({
        sha: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        at: "2026-09-19T08:00:00.000Z",
        author: "alice",
        message: "hackathon commit",
      }),
    ];
    const p = computeProvenance({
      repoCreatedAt: "2025-12-01T00:00:00.000Z",
      isFork: true,
      parentRepo: "example/base",
      commits,
      ...WINDOW,
      devinPrs: 0,
    });
    expect(p.is_fork).toBe(true);
    expect(p.parent_repo).toBe("example/base");
    expect(p.in_window_ratio).toBeCloseTo(0.5);
    expect(p.repo_created_at < WINDOW.windowStart).toBe(true);
  });

  it("counts Devin trailers and bot authors", () => {
    const commits = [
      storyFromCommit({
        sha: "1".repeat(40),
        at: "2026-09-19T01:00:00.000Z",
        author: "devin-ai-integration[bot]",
        message: "feat",
      }),
      storyFromCommit({
        sha: "2".repeat(40),
        at: "2026-09-19T02:00:00.000Z",
        author: "alice",
        message: "feat\n\nCo-Authored-By: Devin <devin@example.com>",
      }),
      storyFromCommit({
        sha: "3".repeat(40),
        at: "2026-09-19T03:00:00.000Z",
        author: "alice",
        message: "docs",
      }),
    ];
    const p = computeProvenance({
      repoCreatedAt: "2026-09-19T00:00:00.000Z",
      isFork: false,
      parentRepo: null,
      commits,
      ...WINDOW,
      devinPrs: 1,
    });
    expect(p.bot_commit_ratio).toBeCloseTo(1 / 3);
    expect(p.coauthor_devin_ratio).toBeCloseTo(2 / 3);
    expect(p.devin_prs).toBe(1);
  });

  it("detects Devin PRs", () => {
    expect(isDevinPr({ user: "devin-ai-integration[bot]", title: "Implement login" })).toBe(true);
    expect(isDevinPr({ user: "alice", title: "docs" })).toBe(false);
  });

  it("maps GitHub payloads through fetchProvenance", async () => {
    const responses = new Map<string, unknown>([
      [
        "/repos/old/fork",
        {
          created_at: "2024-01-01T00:00:00.000Z",
          fork: true,
          parent: { full_name: "upstream/app" },
          default_branch: "main",
        },
      ],
      [
        "/repos/old/fork/commits?sha=main&per_page=100&page=1",
        [
          {
            sha: "d".repeat(40),
            commit: {
              message: "in window\n\nCo-Authored-By: Devin",
              author: { name: "alice", date: "2026-09-19T10:00:00.000Z" },
              committer: { date: "2026-09-19T10:00:00.000Z" },
            },
            author: { login: "alice" },
          },
          {
            sha: "c".repeat(40),
            commit: {
              message: "pre-event",
              author: { name: "alice", date: "2024-02-01T00:00:00.000Z" },
              committer: { date: "2024-02-01T00:00:00.000Z" },
            },
            author: { login: "alice" },
          },
        ],
      ],
      ["/repos/old/fork/pulls?state=all&per_page=50", []],
    ]);

    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      const path = url.replace("https://api.github.com", "");
      const body = responses.get(path);
      if (!body) return new Response("missing", { status: 404 });
      return new Response(JSON.stringify(body), { status: 200 });
    };

    const { provenance, headSha } = await fetchProvenance({
      repoUrl: "https://github.com/old/fork",
      ...WINDOW,
      fetchImpl,
    });
    expect(provenance.is_fork).toBe(true);
    expect(provenance.parent_repo).toBe("upstream/app");
    expect(provenance.in_window_ratio).toBeCloseTo(0.5);
    expect(headSha).toBe("d".repeat(40));
  });
});
