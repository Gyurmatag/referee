import { parseDemoLogin, takeoverReason, type Review, type Submission } from "@referee/shared";
import type { CoreEnv } from "../db/queries.js";
import { openSandbox } from "../sandbox/client.js";
import { evidenceKey, guessContentType, putBytes, putText } from "../sandbox/evidence.js";
import { destroySubmissionSandbox } from "../sandbox/lifecycle.js";
import { E2E_CAPTURE_JS, reviewFromE2e } from "./sandbox-review-helpers.js";
import {
  e2eFinished,
  enqueueTakeoverCommand,
  openReviewSandbox,
  readTakeoverFrame,
  readTakeoverStatus,
  startE2eProcess,
} from "./takeover.js";

export { E2E_CAPTURE_JS, reviewFromE2e } from "./sandbox-review-helpers.js";
export { enqueueTakeoverCommand, readTakeoverFrame, readTakeoverStatus } from "./takeover.js";

export type ReviewOutcome =
  | { kind: "done"; review: Review }
  | { kind: "takeover"; reason: string }
  | { kind: "running" };

function fromBase64(content: string): Uint8Array {
  const bin = atob(content.replace(/\s/g, ""));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

async function readySandbox(env: CoreEnv, sub: Submission) {
  if (!env.Sandbox) return null;
  let sandbox = openSandbox(env, sub.id);
  try {
    await sandbox.exec("true");
  } catch {
    await destroySubmissionSandbox(env, sub.id).catch(() => undefined);
    sandbox = openSandbox(env, sub.id);
  }
  const repo = await sandbox.exists("/work/repo").catch(() => ({ exists: false }));
  if (!repo.exists) {
    await sandbox.mkdir("/work", { recursive: true });
    await sandbox.gitCheckout(sub.repo_url, { targetDir: "/work/repo" });
    if (sub.head_sha && /^[a-f0-9]{7,40}$/i.test(sub.head_sha)) {
      await sandbox.exec(`git -C /work/repo checkout ${sub.head_sha}`);
    }
  }
  return sandbox;
}

async function collectScreenshots(
  env: CoreEnv,
  sub: Submission,
  sandbox: ReturnType<typeof openSandbox>,
): Promise<string[]> {
  const screenshots: string[] = [];
  const names = ["e2e-home.png", "e2e-health.png", "e2e-app.png", "e2e-takeover.png"];
  try {
    const listed = await sandbox.listFiles("/out/evidence");
    const filesListed = Array.isArray(listed) ? listed : listed.files ?? [];
    for (const file of filesListed) {
      if (file.isDirectory) continue;
      if (/^e2e-.*\.(png|jpg|jpeg|webp)$/i.test(file.name) && !names.includes(file.name)) {
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
  return screenshots;
}

async function collectReview(env: CoreEnv, sub: Submission): Promise<Review> {
  const sandbox = openReviewSandbox(env, sub.id);
  const files = await sandbox.exec(
    "find /work/repo -type f ! -path '*/.git/*' ! -path '*/node_modules/*' | wc -l",
  );
  const fileCount = Number.parseInt((files.stdout || "").trim(), 10) || 0;
  const target = (sub.deployment?.url || sub.live_url || "").trim();
  const homeShot = await sandbox.exists("/out/evidence/e2e-home.png").catch(() => ({ exists: false }));
  if (!homeShot.exists && target) {
    await sandbox
      .exec(
        `npx --yes playwright@1.55.0 screenshot --viewport-size=1280,800 "$(cat /tmp/referee-target.txt)" /out/evidence/e2e-home.png`,
        { timeout: 90_000 },
      )
      .catch(() => undefined);
  }

  let pass = 0;
  let fail = 0;
  let signedIn = false;
  let takeover = false;
  try {
    const raw = await sandbox.readFile("/out/e2e.json");
    const parsed = JSON.parse(raw.content) as {
      pass?: number;
      fail?: number;
      signed_in?: boolean;
      takeover?: boolean;
    };
    pass = Number(parsed.pass || 0);
    fail = Number(parsed.fail || 0);
    signedIn = Boolean(parsed.signed_in);
    takeover = Boolean(parsed.takeover);
    await putText(env.EVIDENCE, evidenceKey(sub.id, "review", "e2e.json"), raw.content);
  } catch {
    fail = 1;
  }

  const screenshots = await collectScreenshots(env, sub, sandbox);
  return reviewFromE2e({
    teamName: sub.team_name,
    repoUrl: sub.repo_url,
    target,
    fileCount,
    pass,
    fail,
    screenshots,
    provenance: sub.provenance,
    signedIn,
    takeover,
  });
}

const LOGIN_WALL_RE =
  /continue with google|sign in with github|sign in with apple|members only/i;

async function pageLooksLikeLoginWall(
  target: string,
  sandbox?: ReturnType<typeof openSandbox>,
): Promise<boolean> {
  if (!target) return false;
  try {
    const res = await fetch(target, { redirect: "follow" });
    const html = await res.text();
    if (LOGIN_WALL_RE.test(html)) return true;
  } catch {
    // try from the sandbox next
  }
  if (!sandbox) return false;
  try {
    const probed = await sandbox.exec(`curl -fsSL --max-time 15 ${JSON.stringify(target)}`, {
      timeout: 20_000,
    });
    return LOGIN_WALL_RE.test(probed.stdout || "");
  } catch {
    return false;
  }
}

async function markWaitingForLogin(sandbox: ReturnType<typeof openSandbox>, target: string, reason: string) {
  await sandbox.writeFile(
    "/tmp/takeover/status.json",
    JSON.stringify({
      state: "waiting",
      reason,
      url: target,
      signed_in: false,
      oauth: 1,
      password: 0,
      takeover: true,
    }),
  );
}

async function outcomeFromSandbox(
  env: CoreEnv,
  sub: Submission,
  sandbox: ReturnType<typeof openSandbox>,
): Promise<ReviewOutcome> {
  const status = await readTakeoverStatus(sandbox);
  if (status?.state === "waiting") {
    return {
      kind: "takeover",
      reason: status.reason || takeoverReason(status.password, status.oauth),
    };
  }
  const target = (sub.deployment?.url || sub.live_url || "").trim();
  if (await pageLooksLikeLoginWall(target)) {
    const reason = status?.reason || takeoverReason(0, 1);
    await markWaitingForLogin(sandbox, target, reason);
    return { kind: "takeover", reason };
  }
  if (await e2eFinished(sandbox) || status?.state === "done" || status?.state === "failed") {
    return { kind: "done", review: await collectReview(env, sub) };
  }
  return { kind: "running" };
}

export async function startSandboxReview(env: CoreEnv, sub: Submission): Promise<ReviewOutcome> {
  if (!env.Sandbox) return { kind: "done", review: skippedReview(sub) };
  const sandbox = await readySandbox(env, sub);
  if (!sandbox) return { kind: "done", review: skippedReview(sub) };
  const target = (sub.deployment?.url || sub.live_url || "").trim();
  const demo = parseDemoLogin(sub.run_hints);
  await sandbox.writeFile("/tmp/referee-target.txt", target);
  await sandbox.writeFile("/tmp/referee-demo.json", JSON.stringify(demo ?? { user: "", password: "" }));
  await sandbox.writeFile("/tmp/referee-e2e.mjs", E2E_CAPTURE_JS);
  if (await pageLooksLikeLoginWall(target, sandbox)) {
    const reason = takeoverReason(0, 1);
    try {
      await startE2eProcess(sandbox, target);
    } catch {
      // the isolated browser is best-effort; the wall is enough to pause
    }
    await markWaitingForLogin(sandbox, target, reason);
    return { kind: "takeover", reason };
  }
  try {
    await startE2eProcess(sandbox, target);
  } catch {
    if (await pageLooksLikeLoginWall(target)) {
      const reason = takeoverReason(0, 1);
      await markWaitingForLogin(sandbox, target, reason);
      return { kind: "takeover", reason };
    }
    return {
      kind: "done",
      review: skippedReview(sub, 1),
    };
  }
  if (await pageLooksLikeLoginWall(target)) {
    const reason = takeoverReason(0, 1);
    await markWaitingForLogin(sandbox, target, reason);
    return { kind: "takeover", reason };
  }
  for (let i = 0; i < 40; i += 1) {
    await sleep(1_200);
    if (await e2eFinished(sandbox)) {
      if (await pageLooksLikeLoginWall(target)) {
        const reason = takeoverReason(0, 1);
        await markWaitingForLogin(sandbox, target, reason);
        return { kind: "takeover", reason };
      }
      return { kind: "done", review: await collectReview(env, sub) };
    }
    const status = await readTakeoverStatus(sandbox);
    if (status?.state === "waiting") {
      return {
        kind: "takeover",
        reason: status.reason || takeoverReason(status.password, status.oauth),
      };
    }
    if (status?.state === "done" || status?.state === "failed") {
      return { kind: "done", review: await collectReview(env, sub) };
    }
  }
  return outcomeFromSandbox(env, sub, sandbox);
}

export async function pollSandboxReview(env: CoreEnv, sub: Submission): Promise<ReviewOutcome> {
  if (!env.Sandbox) return { kind: "done", review: skippedReview(sub) };
  const sandbox = openReviewSandbox(env, sub.id);
  return outcomeFromSandbox(env, sub, sandbox);
}

export async function finishSandboxReview(env: CoreEnv, sub: Submission): Promise<Review> {
  if (!env.Sandbox) return skippedReview(sub);
  const sandbox = openReviewSandbox(env, sub.id);
  try {
    await enqueueTakeoverCommand(sandbox, { type: "done" });
  } catch {
    // continue and collect whatever exists
  }
  for (let i = 0; i < 8; i += 1) {
    await sleep(1_000);
    if (await e2eFinished(sandbox)) break;
  }
  return collectReview(env, sub);
}

export async function runSandboxReview(env: CoreEnv, sub: Submission): Promise<Review> {
  const started = await startSandboxReview(env, sub);
  if (started.kind === "done") return started.review;
  return finishSandboxReview(env, sub);
}
