export type DemoLogin = {
  user: string;
  password: string;
};

const USER_RE = /(?:^|\n)\s*(?:DEMO_USER|demo_user)\s*[:=]\s*(.+)\s*(?=\n|$)/i;
const PASS_RE = /(?:^|\n)\s*(?:DEMO_PASS|demo_password)\s*[:=]\s*(.+)\s*(?=\n|$)/i;

export function parseDemoLogin(hints: string): DemoLogin | null {
  const user = hints.match(USER_RE)?.[1]?.trim() ?? "";
  const password = hints.match(PASS_RE)?.[1]?.trim() ?? "";
  if (!user || !password) return null;
  return { user, password };
}

export function mergeDemoLogin(hints: string, user: string, password: string): string {
  const rest = hints.replace(USER_RE, "").replace(PASS_RE, "").replace(/\n{3,}/g, "\n\n").trim();
  if (!user.trim() || !password) return rest;
  return [`DEMO_USER=${user.trim()}`, `DEMO_PASS=${password}`, rest].filter(Boolean).join("\n");
}

export function redactDemoLogin(hints: string): string {
  return hints.replace(PASS_RE, "\nDEMO_PASS=***").replace(/^\n/, "");
}
