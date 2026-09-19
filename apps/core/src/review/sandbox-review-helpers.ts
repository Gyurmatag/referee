import type { Provenance, Review } from "@referee/shared";
import { E2E_CAPTURE_JS } from "./e2e-capture.js";
import { heuristicReviewScore } from "./fork-pr.js";

export { E2E_CAPTURE_JS };

export function reviewFromE2e(input: {
  teamName: string;
  repoUrl: string;
  target: string;
  fileCount: number;
  pass: number;
  fail: number;
  screenshots: string[];
  provenance: Provenance | null;
  signedIn?: boolean;
  takeover?: boolean;
}): Review {
  const shots = input.screenshots.length;
  const httpOk = input.pass > 0;
  let score = heuristicReviewScore(input.provenance);
  if (httpOk) score = Math.min(1, score + 0.15);
  if (shots > 0) score = Math.min(1, score + 0.15);
  if (input.fileCount > 0) score = Math.min(1, score + 0.05);
  if (input.signedIn) score = Math.min(1, score + 0.05);
  const summary = [
    `Sandbox review of ${input.teamName}`,
    `cloned ${input.repoUrl}`,
    `${input.fileCount} files`,
    `e2e ${input.pass} pass / ${input.fail} fail`,
    `${shots} screenshots`,
    input.target ? `against ${input.target}` : "no deploy url",
    input.signedIn ? "signed-in path exercised" : "",
    input.takeover ? "team takeover" : "",
  ]
    .filter(Boolean)
    .join(" - ");
  return {
    fork_repo: input.repoUrl,
    pr_url: "",
    review_url: input.target,
    summary,
    summary_score: Math.round(score * 100) / 100,
    screenshots: input.screenshots,
  };
}
