const KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const MAX_KEYS = 40;
const MAX_VALUE = 8_000;

export function parseTeamSecrets(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const cleaned = line.replace(/^export\s+/, "");
    const eq = cleaned.indexOf("=");
    if (eq <= 0) continue;
    const key = cleaned.slice(0, eq).trim();
    if (!KEY_RE.test(key)) continue;
    let value = cleaned.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (value.length > MAX_VALUE) continue;
    if (!(key in out) && Object.keys(out).length >= MAX_KEYS) continue;
    out[key] = value;
  }
  return out;
}

export function formatEnvFile(secrets: Record<string, string>): string {
  const lines = Object.entries(secrets).map(([key, value]) => `${key}=${quoteEnv(value)}`);
  return lines.length ? `${lines.join("\n")}\n` : "";
}

function quoteEnv(value: string): string {
  if (/^[A-Za-z0-9_./:@+-]*$/.test(value)) return value;
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function secretKeys(secrets: Record<string, string>): string[] {
  return Object.keys(secrets).sort();
}

export function redactSecretLines(text: string): string {
  return text
    .replace(
      /(?:^|\n)\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*.+/g,
      (full, key: string) => {
        if (/^DEMO_USER$/i.test(key)) return full;
        return `\n${key}=***`;
      },
    )
    .replace(/^\n/, "");
}

export const REPO_SECRET_PATHS = [
  "/work/repo/.env",
  "/work/repo/.env.local",
  "/work/repo/.dev.vars",
] as const;

export const JUDGE_SECRET_PATH = "/judge/secrets.env";

export const TEAM_SECRET_PATHS = [...REPO_SECRET_PATHS, JUDGE_SECRET_PATH] as const;
