import {
  TAKEOVER_DONE_PATH,
  TAKEOVER_FRAME_PATH,
  TAKEOVER_INBOX,
  TAKEOVER_STATUS_PATH,
  parseTakeoverCommand,
  parseTakeoverStatus,
  type TakeoverCommand,
  type TakeoverStatus,
} from "@referee/shared";
import { openSandbox } from "../sandbox/client.js";
import type { CoreEnv } from "../db/queries.js";
import { TAKEOVER_SESSION_JS } from "./takeover-session.js";

export { TAKEOVER_SESSION_JS };

type SandboxIO = ReturnType<typeof openSandbox>;

type ProcSandbox = SandboxIO & {
  startProcess: (command: string) => Promise<{ id: string }>;
  listProcesses: () => Promise<{ id: string; command?: string; status?: string }[]>;
  killProcess: (id: string) => Promise<void>;
};

function asProcSandbox(sandbox: SandboxIO): ProcSandbox {
  return sandbox as ProcSandbox;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function readTakeoverStatus(sandbox: SandboxIO): Promise<TakeoverStatus | null> {
  const exists = await sandbox.exists(TAKEOVER_STATUS_PATH).catch(() => ({ exists: false }));
  if (!exists.exists) return null;
  try {
    const file = await sandbox.readFile(TAKEOVER_STATUS_PATH);
    return parseTakeoverStatus(JSON.parse(file.content));
  } catch {
    return null;
  }
}

export async function e2eFinished(sandbox: SandboxIO): Promise<boolean> {
  const exists = await sandbox.exists("/out/e2e.json").catch(() => ({ exists: false }));
  return Boolean(exists.exists);
}

export async function readTakeoverFrame(sandbox: SandboxIO): Promise<Uint8Array | null> {
  const exists = await sandbox.exists(TAKEOVER_FRAME_PATH).catch(() => ({ exists: false }));
  if (!exists.exists) return null;
  const encoded = await sandbox.exec(`base64 -w0 ${TAKEOVER_FRAME_PATH}`);
  const text = (encoded.stdout || "").replace(/\s/g, "");
  if (!text) return null;
  const bin = atob(text);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export async function readTakeoverLog(sandbox: SandboxIO): Promise<string> {
  const exists = await sandbox.exists("/tmp/e2e.out").catch(() => ({ exists: false }));
  if (!exists.exists) return "";
  try {
    const file = await sandbox.readFile("/tmp/e2e.out");
    return String(file.content || "").trim().split("\n").slice(-20).join("\n");
  } catch {
    return "";
  }
}

export async function enqueueTakeoverCommand(sandbox: SandboxIO, raw: unknown): Promise<TakeoverCommand> {
  const command = parseTakeoverCommand(raw);
  if (!command) throw new Error("invalid takeover command");
  await sandbox.mkdir(TAKEOVER_INBOX, { recursive: true });
  const name = `${Date.now()}-${Math.random().toString(16).slice(2)}.json`;
  await sandbox.writeFile(`${TAKEOVER_INBOX}/${name}`, JSON.stringify(command));
  if (command.type === "done") {
    await sandbox.writeFile(TAKEOVER_DONE_PATH, "1");
  }
  return command;
}

export async function signalTakeoverDone(sandbox: SandboxIO): Promise<void> {
  await enqueueTakeoverCommand(sandbox, { type: "done" });
}

export async function stopE2eProcess(sandbox: SandboxIO): Promise<void> {
  const box = asProcSandbox(sandbox);
  try {
    const processes = (await box.listProcesses()) ?? [];
    for (const proc of processes) {
      const command = String(proc.command || "");
      if (
        command.includes("referee-browser") ||
        command.includes("takeover-app") ||
        command.includes("referee-e2e")
      ) {
        await box.killProcess(proc.id);
      }
    }
  } catch {
    // process list is best-effort
  }
}

async function waitForFrame(sandbox: SandboxIO, tries = 30): Promise<boolean> {
  for (let i = 0; i < tries; i += 1) {
    const exists = await sandbox.exists(TAKEOVER_FRAME_PATH).catch(() => ({ exists: false }));
    if (exists.exists) return true;
    await sleep(1000);
  }
  return false;
}

async function captureFallbackFrame(sandbox: SandboxIO, target: string): Promise<void> {
  if (!target) return;
  await sandbox.exec(
    `npx --yes playwright@1.55.0 screenshot --viewport-size=1280,800 ${JSON.stringify(target)} /tmp/takeover/frame.png`,
    { timeout: 90_000 },
  );
}

async function browserRunning(sandbox: SandboxIO): Promise<boolean> {
  try {
    const processes = await asProcSandbox(sandbox).listProcesses();
    return processes.some(
      (proc) =>
        String(proc.command || "").includes("referee-browser") && proc.status !== "exited",
    );
  } catch {
    return false;
  }
}

export async function startE2eProcess(sandbox: SandboxIO, target: string): Promise<void> {
  await sandbox.mkdir("/tmp/takeover/inbox", { recursive: true });
  await sandbox.mkdir("/out/evidence", { recursive: true });
  await sandbox.mkdir("/tmp/takeover-app", { recursive: true });
  await sandbox.writeFile("/tmp/referee-target.txt", target);
  await sandbox.writeFile("/tmp/takeover-app/referee-browser.mjs", TAKEOVER_SESSION_JS);
  await sandbox.writeFile(
    TAKEOVER_STATUS_PATH,
    JSON.stringify({
      state: "starting",
      reason: "Starting the isolated browser",
      url: target,
      signed_in: false,
      oauth: 1,
      password: 0,
      takeover: true,
    }),
  );
  if (!(await browserRunning(sandbox))) {
    await sandbox.exec("mkdir -p /tmp/takeover/inbox /out/evidence; rm -f /tmp/takeover/done");
    await stopE2eProcess(sandbox);
    const command = `bash -lc ${JSON.stringify(
      [
        'echo "launch $(date -Iseconds)" > /tmp/e2e.out',
        "mkdir -p /tmp/takeover-app /tmp/takeover/inbox /out/evidence",
        "cd /tmp/takeover-app",
        "if [ -d /opt/referee-pw/node_modules/playwright-core ]; then ln -sfn /opt/referee-pw/node_modules /tmp/takeover-app/node_modules",
        "elif [ ! -d /tmp/takeover-app/node_modules/playwright-core ]; then PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm i --omit=dev --no-audit --no-fund playwright-core@1.55.0 >> /tmp/e2e.out 2>&1",
        "fi",
        "node referee-browser.mjs >> /tmp/e2e.out 2>&1",
      ].join("; "),
    )}`;
    await asProcSandbox(sandbox).startProcess(command);
  }
  const ready = await waitForFrame(sandbox, 45);
  if (ready) return;
  if (await browserRunning(sandbox)) return;
  await captureFallbackFrame(sandbox, target);
}

export async function ensureTakeoverFrame(sandbox: SandboxIO, target: string): Promise<Uint8Array | null> {
  const existing = await readTakeoverFrame(sandbox);
  if (existing) return existing;
  try {
    await startE2eProcess(sandbox, target);
  } catch {
    try {
      await captureFallbackFrame(sandbox, target);
    } catch {
      return null;
    }
  }
  return readTakeoverFrame(sandbox);
}

export function openReviewSandbox(env: CoreEnv, submissionId: string) {
  return openSandbox(env, submissionId);
}
