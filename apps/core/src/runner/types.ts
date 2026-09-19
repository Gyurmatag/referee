import type { JudgeReport, Phase } from "@referee/shared";

export type JudgeInput = {
  submissionId: string;
  judge: "build_e2e" | "tracks";
  repo: string;
  sha: string;
  claims: { claim: string }[];
  runHints: string;
  tracks: unknown;
  window: { start: string; end: string };
  hints: string;
  liveUrl?: string | null;
};

export type RunnerMeta = {
  sandboxId: string;
  processId: string;
  submissionId: string;
  judge: "build_e2e" | "tracks";
};

export interface JudgeRunner {
  start(input: JudgeInput): Promise<{ runId: string; meta?: RunnerMeta }>;
  attach?(runId: string, meta: RunnerMeta): void;
  poll(runId: string): Promise<{
    phase: Phase;
    logTail: string;
    sessionUrl?: string;
    report?: JudgeReport | null;
    exited?: boolean;
  }>;
  cancel(runId: string): Promise<void>;
  collect?(runId: string): Promise<{
    transcriptKey: string | null;
    evidenceKeys: string[];
    report: JudgeReport | null;
  }>;
}

export class NotConfigured extends Error {
  constructor(message = "Runner is not configured") {
    super(message);
    this.name = "NotConfigured";
  }
}

export function lastLines(text: string, n = 40): string {
  return text.split(/\r?\n/).filter(Boolean).slice(-n).join("\n");
}

export function isTerminalPhase(phase: string): boolean {
  return phase === "done" || phase === "failed";
}

export function timedOut(startedAt: string, nowMs: number, limitMin: number): boolean {
  const start = Date.parse(startedAt);
  if (Number.isNaN(start)) return false;
  return nowMs - start > limitMin * 60_000;
}

export const DEVIN_CONFIG = JSON.stringify({
  agent: { model: "swe-2-medium" },
  theme_mode: "nocolor",
  show_hints: false,
  attribution: true,
  subagents_enabled: false,
  auto_update: false,
  notify: "never",
});
