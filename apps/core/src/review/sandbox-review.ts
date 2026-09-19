import type { Review, Submission } from "@referee/shared";
import type { CoreEnv } from "../db/queries.js";
import { openSandbox } from "../sandbox/client.js";
import { evidenceKey, guessContentType, putBytes, putText } from "../sandbox/evidence.js";
import { E2E_CAPTURE_JS, reviewFromE2e } from "./sandbox-review-helpers.js";

export { E2E_CAPTURE_JS, reviewFromE2e } from "./sandbox-review-helpers.js";

function fromBase64(content: string): Uint8Array {
  const bin = atob(content.replace(/\s/g, ""));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function skippedReview(sub: Submission, fail = 1): Review {
  return reviewFromE2e({
    teamName: sub.team_name,
    repoUrl: sub.repo_url,
    target: sub.deployment?.url || sub.live_url || "",
    fileCount: 0,
    pass: 0,
    fail,
    screenshots: [],
    provenance: sub.provenance,
  });
}

export async function runSandboxReview(env: CoreEnv, sub: Submission): Promise<Review> {
  if (!env.Sandbox) return skippedReview(sub);
  const sandbox = openSandbox(env, sub.id);
  const repo = await sandbox.exists("/work/repo").catch(() => ({ exists: false }));
  if (!repo.exists) {
    await sandbox.mkdir("/work", { recursive: true });
    await sandbox.gitCheckout(sub.repo_url, { targetDir: "/work/repo" });
    if (sub.head_sha && /^[a-f0-9]{7,40}$/i.test(sub.head_sha)) {
      await sandbox.exec(`git -C /work/repo checkout ${sub.head_sha}`);
    }
  }
  await sandbox.mkdir("/out/evidence", { recursive: true });
  const files = await sandbox.exec(
    "find /work/repo -type f ! -path '*/.git/*' ! -path '*/node_modules/*' | wc -l",
  );
  const fileCount = Number.parseInt((files.stdout || "").trim(), 10) || 0;
  const target = (sub.deployment?.url || sub.live_url || "").trim();
  await sandbox.writeFile("/tmp/referee-e2e.mjs", E2E_CAPTURE_JS);
  await sandbox.exec("npx --yes -p playwright@1.55.0 node /tmp/referee-e2e.mjs", {
    timeout: 180_000,
    env: { TARGET_URL: target, CI: "true", npm_config_update_notifier: "false" },
  });

  let pass = 0;
  let fail = 0;
  try {
    const raw = await sandbox.readFile("/out/e2e.json");
    const parsed = JSON.parse(raw.content) as { pass?: number; fail?: number };
    pass = Number(parsed.pass || 0);
    fail = Number(parsed.fail || 0);
    await putText(env.EVIDENCE, evidenceKey(sub.id, "review", "e2e.json"), raw.content);
  } catch {
    fail = 1;
  }

  const screenshots: string[] = [];
  const names = ["e2e-home.png", "e2e-health.png"];
  try {
    const listed = await sandbox.listFiles("/out/evidence");
    const filesListed = Array.isArray(listed) ? listed : listed.files ?? [];
    for (const file of filesListed) {
      if (file.isDirectory) continue;
      if (/\.(png|jpg|jpeg|webp)$/i.test(file.name) && !names.includes(file.name)) {
        names.push(file.name);
      }
    }
  } catch {
    // expected names are enough
  }
  for (const name of names) {
    const path = `/out/evidence/${name}`;
    const exists = await sandbox.exists(path).catch(() => ({ exists: false }));
    if (!exists.exists) continue;
    const encoded = await sandbox.exec(`base64 -w0 ${path}`);
    const body = fromBase64(encoded.stdout || "");
    if (body.byteLength < 32) continue;
    const key = evidenceKey(sub.id, "review", `evidence/${name}`);
    await putBytes(env.EVIDENCE, key, body, guessContentType(name));
    screenshots.push(key);
  }

  return reviewFromE2e({
    teamName: sub.team_name,
    repoUrl: sub.repo_url,
    target,
    fileCount,
    pass,
    fail,
    screenshots,
    provenance: sub.provenance,
  });
}
