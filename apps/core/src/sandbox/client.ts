import { getSandbox, type Sandbox } from "@cloudflare/sandbox";
import type { CoreEnv } from "../db/queries.js";
import { sandboxName } from "./lifecycle.js";

export function openSandbox(
  env: CoreEnv,
  submissionId: string,
  options?: { keepAlive?: boolean; sleepAfter?: string },
) {
  if (!env.Sandbox) {
    throw new Error("Sandbox binding is missing");
  }
  return getSandbox(
    env.Sandbox as unknown as DurableObjectNamespace<Sandbox>,
    sandboxName(submissionId),
    {
      keepAlive: options?.keepAlive ?? true,
      sleepAfter: options?.sleepAfter ?? "30m",
      transport: "rpc",
    },
  );
}
