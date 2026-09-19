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

type SandboxIO = ReturnType<typeof openSandbox>;

export type ProcSandbox = SandboxIO & {
  startProcess?: (
    command: string,
    options?: { env?: Record<string, string>; processId?: string },
  ) => Promise<{ id: string }>;
  listProcesses?: () => Promise<{ id: string; command?: string }[]>;
  killProcess?: (id: string) => Promise<void>;
};

export function asProcSandbox(sandbox: SandboxIO): ProcSandbox {
  return sandbox as ProcSandbox;
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
    const processes = (await box.listProcesses?.()) ?? [];
    for (const proc of processes) {
      if (String(proc.command || "").includes("referee-e2e")) {
        await box.killProcess?.(proc.id);
      }
    }
  } catch {
    // process list is best-effort
  }
}

export async function startE2eProcess(sandbox: SandboxIO, target: string): Promise<void> {
  await sandbox.mkdir("/tmp/takeover/inbox", { recursive: true });
  await sandbox.mkdir("/out/evidence", { recursive: true });
  await sandbox.exec(
    "rm -f /out/e2e.json /tmp/takeover/done /tmp/takeover/status.json /tmp/takeover/frame.png; rm -rf /tmp/takeover/inbox; mkdir -p /tmp/takeover/inbox /out/evidence",
  );
  await stopE2eProcess(sandbox);
  const box = asProcSandbox(sandbox);
  const command =
    "npx --yes -p playwright@1.55.0 node /tmp/referee-e2e.mjs";
  if (box.startProcess) {
    await box.startProcess(command, {
      env: { TARGET_URL: target },
      processId: "referee-e2e",
    });
    return;
  }
  await sandbox.exec(
    `nohup env TARGET_URL=${JSON.stringify(target)} ${command} >/tmp/e2e.out 2>&1 & echo $!`,
    { timeout: 8_000 },
  );
}

export function openReviewSandbox(env: CoreEnv, submissionId: string) {
  return openSandbox(env, submissionId);
}
