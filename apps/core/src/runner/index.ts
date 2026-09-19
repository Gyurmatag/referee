import type { CoreEnv } from "../db/queries.js";
import { CliSandboxRunner } from "./cli-sandbox.js";
import { CloudSessionRunner } from "./cloud-session.js";
import { FixtureRunner } from "./fixture.js";
import { WebhookSessionRunner } from "./webhook-session.js";
import type { JudgeRunner } from "./types.js";

export function createRunner(env: CoreEnv, judge: "build_e2e" | "tracks"): JudgeRunner {
  const key = judge === "tracks" ? env.JUDGE_RUNNER_TRACKS : env.JUDGE_RUNNER_BUILD_E2E;
  if (key === "fixture") return new FixtureRunner();
  if (key === "webhook-session") return new WebhookSessionRunner(env);
  if (key === "cloud-session") return new CloudSessionRunner(env);
  return new CliSandboxRunner(env);
}

export { CliSandboxRunner } from "./cli-sandbox.js";
export { CloudSessionRunner } from "./cloud-session.js";
export { FixtureRunner } from "./fixture.js";
export { WebhookSessionRunner } from "./webhook-session.js";
export type { JudgeInput, JudgeRunner } from "./types.js";
export { isTerminalPhase, lastLines, timedOut } from "./types.js";
