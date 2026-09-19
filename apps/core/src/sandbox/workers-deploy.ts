export function workerScriptName(teamName: string): string {
  const slug = teamName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `hackathon-${slug || "team"}`.slice(0, 63);
}

export function workersDevUrl(name: string, subdomain = "cfi-ops"): string {
  return `https://${name}.${subdomain}.workers.dev`;
}

export function refereeWranglerConfig(name: string, assetsDirectory: string): string {
  return `${JSON.stringify(
    {
      name,
      compatibility_date: "2026-09-19",
      workers_dev: true,
      assets: {
        directory: assetsDirectory,
        not_found_handling: "single-page-application",
      },
    },
    null,
    2,
  )}\n`;
}

export const STAGE_ASSETS_SH = `set -e
ASSETS=/tmp/referee-assets
rm -rf "$ASSETS"
mkdir -p "$ASSETS"
cd /work/repo
if [ -f dist/index.html ] || [ -d dist ]; then
  cp -R dist/. "$ASSETS/"
elif [ -f build/index.html ] || [ -d build ]; then
  cp -R build/. "$ASSETS/"
elif [ -d out ]; then
  cp -R out/. "$ASSETS/"
elif [ -f public/index.html ]; then
  cp -R public/. "$ASSETS/"
else
  find . -maxdepth 3 -type f \\( \\
    -name '*.html' -o -name '*.css' -o -name '*.js' -o -name '*.mjs' \\
    -o -name '*.svg' -o -name '*.png' -o -name '*.jpg' -o -name '*.jpeg' \\
    -o -name '*.webp' -o -name '*.ico' -o -name '*.json' -o -name '*.txt' \\
    -o -name '*.woff' -o -name '*.woff2' \\
  \\) ! -path './node_modules/*' ! -path './.git/*' ! -path './.wrangler/*' \\
    -exec cp --parents {} "$ASSETS/" \\;
fi
test -n "$(find "$ASSETS" -type f | head -n 1)"
`;

export type SandboxExec = {
  exists: (path: string) => Promise<{ exists: boolean }>;
  writeFile: (path: string, content: string) => Promise<unknown>;
  exec: (
    command: string,
    options?: { timeout?: number; env?: Record<string, string | undefined>; cwd?: string },
  ) => Promise<{ stdout?: string; stderr?: string; exitCode?: number; success?: boolean }>;
};

export type WorkersPublishInput = {
  teamName: string;
  token: string;
  accountId: string;
  subdomain?: string;
};

export type WorkersPublishResult = {
  url: string;
  name: string;
  error: string;
};

async function hasWranglerConfig(sandbox: SandboxExec): Promise<boolean> {
  for (const path of ["/work/repo/wrangler.jsonc", "/work/repo/wrangler.json", "/work/repo/wrangler.toml"]) {
    const found = await sandbox.exists(path).catch(() => ({ exists: false }));
    if (found.exists) return true;
  }
  return false;
}

function wranglerEnv(input: WorkersPublishInput): Record<string, string> {
  return {
    CLOUDFLARE_API_TOKEN: input.token,
    CLOUDFLARE_ACCOUNT_ID: input.accountId,
    CI: "true",
    WRANGLER_SEND_METRICS: "false",
    npm_config_update_notifier: "false",
  };
}

export async function publishToWorkersDev(
  sandbox: SandboxExec,
  input: WorkersPublishInput,
): Promise<WorkersPublishResult> {
  const name = workerScriptName(input.teamName);
  const subdomain = input.subdomain?.trim() || "cfi-ops";
  const url = workersDevUrl(name, subdomain);
  const env = wranglerEnv(input);
  const timeout = 240_000;

  const existing = await hasWranglerConfig(sandbox);
  if (!existing) {
    const staged = await sandbox.exec(STAGE_ASSETS_SH, { timeout: 60_000 });
    if (staged.exitCode && staged.exitCode !== 0) {
      return {
        url: "",
        name,
        error: `no static files to publish: ${(staged.stderr || staged.stdout || "").slice(-300)}`,
      };
    }
    await sandbox.writeFile("/tmp/wrangler.referee.jsonc", refereeWranglerConfig(name, "/tmp/referee-assets"));
  }

  const configFlag = existing ? "" : "--config /tmp/wrangler.referee.jsonc ";
  const deployed = await sandbox.exec(
    `npx --yes wrangler@4.135.0 deploy ${configFlag}--name ${name} --keep-vars`,
    { timeout, env, cwd: "/work/repo" },
  );
  const output = `${deployed.stdout || ""}\n${deployed.stderr || ""}`;
  if (!deployed.success) {
    return { url: "", name, error: output.trim().slice(-400) || "wrangler deploy failed" };
  }
  return { url, name, error: "" };
}
