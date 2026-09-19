import { getSandbox } from "@cloudflare/sandbox";
import type { CoreEnv } from "../db/queries.js";

export function sandboxName(submissionId: string): string {
  return `sub-${submissionId}`;
}

export async function destroySubmissionSandbox(env: CoreEnv, submissionId: string) {
  if (!env.Sandbox) return;
  const sandbox = getSandbox(
    env.Sandbox as unknown as DurableObjectNamespace<
      import("@cloudflare/sandbox").Sandbox
    >,
    sandboxName(submissionId),
  );
  await sandbox.destroy();
}
