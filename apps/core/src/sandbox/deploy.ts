import type { Deployment, Recipe } from "@referee/shared";
import type { CoreEnv } from "../db/queries.js";
import { openSandbox } from "./client.js";
import {
  deployNotes,
  inferStaticStart,
  probeUrl,
  recipeHasStart,
  shellQuote,
  waitForOk,
} from "./deploy-helpers.js";
import { sandboxName } from "./lifecycle.js";

export { deployNotes, inferStaticStart, probeUrl, recipeHasStart, waitForOk };

export type DeployInput = {
  submissionId: string;
  repoUrl: string;
  sha: string;
  recipe: Recipe;
  liveUrl?: string | null;
  runHints?: string;
};

function envPrefix(env: Record<string, string>): string {
  return Object.entries(env)
    .filter(([k, v]) => /^[A-Z_][A-Z0-9_]*$/.test(k) && !/[\n\r]/.test(v))
    .map(([k, v]) => `${k}=${shellQuote(v)}`)
    .join(" ");
}

export async function deploySubmission(
  env: CoreEnv,
  input: DeployInput,
): Promise<Deployment> {
  const now = new Date().toISOString();
  const live = input.liveUrl?.trim() || "";
  const liveOk = live ? await probeUrl(live) : false;
  const base: Deployment = {
    method: live && liveOk ? "live_url" : "none",
    url: liveOk ? live : "",
    sandbox_url: "",
    sandbox_id: sandboxName(input.submissionId),
    port: input.recipe.port || null,
    healthy: liveOk,
    last_seen_at: now,
  };

  if (!env.Sandbox) {
    if (live) {
      return { ...base, method: "live_url", url: live, healthy: liveOk };
    }
    return { ...base, method: "none" };
  }

  try {
    const sandbox = openSandbox(env, input.submissionId);
    const exists = await sandbox.exists("/work/repo").catch(() => ({ exists: false }));
    if (!exists.exists) {
      await sandbox.mkdir("/work", { recursive: true });
      await sandbox.gitCheckout(input.repoUrl, { targetDir: "/work/repo" });
      if (input.sha && /^[a-f0-9]{7,40}$/i.test(input.sha)) {
        await sandbox.exec(`git -C /work/repo checkout ${input.sha}`);
      }
    }

    let recipe = input.recipe;
    if (!recipeHasStart(recipe)) {
      const index = await sandbox.exists("/work/repo/index.html").catch(() => ({ exists: false }));
      const inferred = inferStaticStart(Boolean(index.exists));
      if (inferred) recipe = inferred;
    }

    if (recipe.needs_db) {
      await sandbox.startProcess("postgres", { processId: "referee-postgres" }).catch(() => undefined);
      await sandbox.startProcess("redis-server", { processId: "referee-redis" }).catch(() => undefined);
    }

    if (recipe.install.trim()) {
      const nodeModules = await sandbox.exists("/work/repo/node_modules").catch(() => ({ exists: false }));
      if (!nodeModules.exists) {
        await sandbox.exec(`cd /work/repo && ${recipe.install}`, { timeout: 180_000 });
      }
    }
    if (recipe.build.trim()) {
      await sandbox.exec(`cd /work/repo && ${recipe.build}`, { timeout: 180_000 });
    }

    if (!recipeHasStart(recipe) && !live) {
      return { ...base, method: "none", last_seen_at: new Date().toISOString() };
    }

    const port = recipe.port || 3000;
    let localOk = false;
    if (recipeHasStart(recipe)) {
      const prefix = envPrefix(recipe.env);
      const command = prefix
        ? `cd /work/repo && ${prefix} ${recipe.start}`
        : `cd /work/repo && ${recipe.start}`;
      await sandbox.startProcess(command, {
        processId: "referee-app",
        env: recipe.env,
      });
      localOk = await waitForOk(async () => {
        const curl = await sandbox.exec(`curl -sf -o /dev/null -w "%{http_code}" http://127.0.0.1:${port}/`);
        const code = Number.parseInt((curl.stdout || "").trim(), 10);
        return Number.isFinite(code) && code >= 200 && code < 400;
      }, 90_000);
      if (!localOk && !liveOk) {
        return {
          ...base,
          method: live ? "live_url" : "none",
          url: live,
          healthy: liveOk,
          port,
          last_seen_at: new Date().toISOString(),
        };
      }
    }

    let sandboxUrl = "";
    try {
      const named = env.TUNNEL_HOSTNAME?.trim();
      const tunnel = named
        ? await sandbox.tunnels.get(port, { name: named.split(".")[0] })
        : await sandbox.tunnels.get(port);
      sandboxUrl = "url" in tunnel && tunnel.url ? tunnel.url : "";
      if (!sandboxUrl && "hostname" in tunnel && tunnel.hostname) {
        sandboxUrl = `https://${tunnel.hostname}`;
      }
    } catch {
      sandboxUrl = "";
    }

    const publicOk = sandboxUrl
      ? await waitForOk(() => probeUrl(sandboxUrl), 60_000, 3_000)
      : false;
    const method = liveOk ? "live_url" : sandboxUrl ? "sandbox" : live ? "live_url" : "none";
    return {
      method,
      url: liveOk ? live : sandboxUrl || live,
      sandbox_url: sandboxUrl,
      sandbox_id: sandboxName(input.submissionId),
      port,
      healthy: liveOk || publicOk || localOk,
      last_seen_at: new Date().toISOString(),
    };
  } catch {
    return {
      ...base,
      method: live ? "live_url" : "none",
      url: live,
      healthy: liveOk,
      last_seen_at: new Date().toISOString(),
      sandbox_url: base.sandbox_url,
    };
  }
}
