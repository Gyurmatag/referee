import { formatEnvFile, REPO_SECRET_PATHS, type Deployment, type Recipe } from "@referee/shared";
import type { CoreEnv } from "../db/queries.js";
import { openSandbox } from "./client.js";
import {
  deployNotes,
  inferPackageRecipe,
  inferStaticStart,
  probeUrl,
  recipeNeedsInfer,
  waitForOk,
} from "./deploy-helpers.js";
import { sandboxName } from "./lifecycle.js";
import { publishToWorkersDev } from "./workers-deploy.js";

export { deployNotes, inferStaticStart, probeUrl, recipeHasStart, waitForOk } from "./deploy-helpers.js";

export type DeployInput = {
  submissionId: string;
  repoUrl: string;
  sha: string;
  recipe: Recipe;
  liveUrl?: string | null;
  teamName?: string;
  runHints?: string;
  secrets?: Record<string, string>;
};

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
    notes: "",
  };

  if (liveOk) {
    return { ...base, method: "live_url", url: live, healthy: true };
  }

  const token = env.CLOUDFLARE_API_TOKEN?.trim() || "";
  const accountId = env.CLOUDFLARE_ACCOUNT_ID?.trim() || "";
  if (!token || !accountId) {
    return {
      ...base,
      notes: "Cloudflare token missing - cannot publish to cfi-ops.workers.dev",
    };
  }

  if (!env.Sandbox) {
    return { ...base, notes: "Sandbox missing - cannot publish to cfi-ops.workers.dev" };
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
    if (recipeNeedsInfer(recipe)) {
      const pkg = await sandbox.exists("/work/repo/package.json").catch(() => ({ exists: false }));
      if (pkg.exists) {
        recipe = inferPackageRecipe();
      } else {
        const index = await sandbox.exists("/work/repo/index.html").catch(() => ({ exists: false }));
        const inferred = inferStaticStart(Boolean(index.exists));
        if (inferred) recipe = inferred;
      }
    }

    const secrets = input.secrets ?? {};
    const envFile = formatEnvFile(secrets);
    if (envFile) {
      for (const path of REPO_SECRET_PATHS) {
        await sandbox.writeFile(path, envFile);
      }
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

    const published = await publishToWorkersDev(sandbox, {
      teamName: input.teamName || input.submissionId,
      token,
      accountId,
      subdomain: env.WORKERS_DEV_SUBDOMAIN?.trim() || "cfi-ops",
      secrets,
    });
    if (!published.url) {
      return {
        ...base,
        last_seen_at: new Date().toISOString(),
        notes: published.error || "wrangler deploy failed",
      };
    }

    const healthy = await waitForOk(() => probeUrl(published.url), 60_000, 3_000);
    const secretCount = Object.keys(secrets).length;
    const secretNote = secretCount ? ` · ${secretCount} secrets` : "";
    return {
      method: "workers",
      url: published.url,
      sandbox_url: published.url,
      sandbox_id: sandboxName(input.submissionId),
      port: recipe.port || null,
      healthy,
      last_seen_at: new Date().toISOString(),
      notes: published.error
        ? published.error
        : healthy
          ? `workers ${published.url}${secretNote}`
          : `published ${published.url} but health check failed`,
    };
  } catch (error) {
    return {
      ...base,
      last_seen_at: new Date().toISOString(),
      notes: error instanceof Error ? error.message.slice(0, 240) : "workers publish threw",
    };
  }
}
