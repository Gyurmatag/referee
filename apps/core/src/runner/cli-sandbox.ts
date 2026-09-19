import { getSandbox, type Sandbox } from "@cloudflare/sandbox";
import { parseDemoLogin, parseJudgeReport, type JudgeReport, type Phase } from "@referee/shared";
import type { CoreEnv } from "../db/queries.js";
import {
  evidenceKey,
  guessContentType,
  putBytes,
  putText,
} from "../sandbox/evidence.js";
import { BUILD_E2E_PROMPT } from "./build-e2e-prompt.js";
import {
  DEVIN_CONFIG,
  lastLines,
  NotConfigured,
  type JudgeInput,
  type JudgeRunner,
  type RunnerMeta,
} from "./types.js";

export class CliSandboxRunner implements JudgeRunner {
  private runs = new Map<string, RunnerMeta>();

  constructor(private env: CoreEnv) {}

  async start(input: JudgeInput): Promise<{ runId: string; meta: RunnerMeta }> {
    if (!this.env.Sandbox) {
      throw new NotConfigured("Sandbox binding is missing");
    }
    if (!this.env.DEVIN_CREDENTIALS_TOML) {
      throw new NotConfigured("DEVIN_CREDENTIALS_TOML is missing");
    }
    const sandboxId = `sub-${input.submissionId}`;
    const sandbox = this.sandbox(this.env.Sandbox, sandboxId);
    await sandbox.mkdir("/root/.local/share/devin", { recursive: true });
    await sandbox.mkdir("/root/.config/devin", { recursive: true });
    await sandbox.mkdir("/out/evidence", { recursive: true });
    await sandbox.mkdir("/work", { recursive: true });
    await sandbox.writeFile(
      "/root/.local/share/devin/credentials.toml",
      this.env.DEVIN_CREDENTIALS_TOML,
    );
    await sandbox.writeFile("/root/.config/devin/config.json", DEVIN_CONFIG);
    await sandbox.writeFile("/judge/prompts/build_e2e.md", BUILD_E2E_PROMPT);
    await sandbox.writeFile(
      "/judge/input.json",
      JSON.stringify({
        repo: input.repo,
        sha: input.sha,
        claims: input.claims,
        run_hints: input.runHints,
        tracks: input.tracks,
        window: input.window,
        hints: input.hints,
        live_url: input.liveUrl ?? "",
        demo_login: parseDemoLogin(input.runHints),
      }),
    );
    const repo = await sandbox.exists("/work/repo").catch(() => ({ exists: false }));
    if (!repo.exists) {
      await sandbox.gitCheckout(input.repo, { targetDir: "/work/repo" });
      if (input.sha) {
        await sandbox.exec(`git -C /work/repo checkout ${shellSingle(input.sha)}`);
      }
    }
    const process = await sandbox.startProcess(`bash /judge/run.sh ${input.judge}`);
    const runId = crypto.randomUUID();
    const meta = {
      sandboxId,
      processId: process.id,
      submissionId: input.submissionId,
      judge: input.judge,
    };
    this.runs.set(runId, meta);
    return { runId, meta };
  }

  attach(runId: string, meta: RunnerMeta): void {
    this.runs.set(runId, meta);
  }

  async poll(runId: string) {
    const meta = this.runs.get(runId);
    if (!meta || !this.env.Sandbox) {
      return { phase: "failed" as Phase, logTail: "unknown run", report: null, exited: true };
    }
    const sandbox = this.sandbox(this.env.Sandbox, meta.sandboxId);
    let logTail = "";
    let exited = false;
    try {
      logTail = lastLines(logsToText(await sandbox.getProcessLogs(meta.processId)));
    } catch {
      logTail = "";
    }
    try {
      const status = await sandbox.listProcesses();
      exited = !status.some((p) => p.id === meta.processId && p.status === "running");
    } catch {
      exited = false;
    }
    let report: JudgeReport | null = null;
    try {
      const file = await sandbox.readFile("/out/report.json");
      const parsed = parseJudgeReport(JSON.parse(file.content));
      report = parsed.report;
    } catch {
      report = null;
    }
    const phase = (report?.phase ?? "starting") as Phase;
    return { phase, logTail, report, exited };
  }

  async cancel(runId: string): Promise<void> {
    const meta = this.runs.get(runId);
    if (!meta || !this.env.Sandbox) return;
    const sandbox = this.sandbox(this.env.Sandbox, meta.sandboxId);
    try {
      await sandbox.killProcess(meta.processId);
    } catch {
      // already gone
    }
  }

  async collect(runId: string) {
    const meta = this.runs.get(runId);
    if (!meta || !this.env.Sandbox) {
      return { transcriptKey: null, evidenceKeys: [] as string[], report: null };
    }
    const sandbox = this.sandbox(this.env.Sandbox, meta.sandboxId);
    let report: JudgeReport | null = null;
    try {
      const file = await sandbox.readFile("/out/report.json");
      report = parseJudgeReport(JSON.parse(file.content)).report;
      await putText(
        this.env.EVIDENCE,
        evidenceKey(meta.submissionId, meta.judge, "report.json"),
        file.content,
      );
    } catch {
      report = null;
    }
    let transcriptKey: string | null = null;
    try {
      const transcript = await sandbox.readFile("/out/transcript.json");
      transcriptKey = await putText(
        this.env.EVIDENCE,
        evidenceKey(meta.submissionId, meta.judge, "transcript.json"),
        transcript.content,
      );
    } catch {
      transcriptKey = null;
    }
    try {
      const stdout = await sandbox.readFile("/out/stdout.log");
      await putText(
        this.env.EVIDENCE,
        evidenceKey(meta.submissionId, meta.judge, "stdout.log"),
        stdout.content,
        "text/plain",
      );
    } catch {
      // optional
    }
    const evidenceKeys: string[] = [];
    try {
      const listed = await sandbox.listFiles("/out/evidence");
      const files = Array.isArray(listed) ? listed : listed.files ?? [];
      for (const file of files) {
        if (file.isDirectory) continue;
        const body = await sandbox.readFile(file.path);
        const key = evidenceKey(meta.submissionId, meta.judge, `evidence/${file.name}`);
        await putBytes(this.env.EVIDENCE, key, body.content, guessContentType(file.name));
        evidenceKeys.push(key);
      }
    } catch {
      // no evidence dir
    }
    return { transcriptKey, evidenceKeys, report };
  }

  private sandbox(binding: DurableObjectNamespace, id: string) {
    return getSandbox(binding as unknown as DurableObjectNamespace<Sandbox>, id);
  }
}

function logsToText(logs: unknown): string {
  if (typeof logs === "string") return logs;
  if (logs && typeof logs === "object") {
    const row = logs as { stdout?: string; stderr?: string; data?: string };
    return [row.stdout, row.stderr, row.data].filter(Boolean).join("\n");
  }
  return "";
}

function shellSingle(value: string): string {
  if (!/^[a-f0-9]{7,40}$/i.test(value)) {
    throw new Error("invalid sha");
  }
  return value;
}
