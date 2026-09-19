import type { Deployment, Recipe } from "@referee/shared";

export function recipeHasStart(recipe: Recipe): boolean {
  return recipe.start.trim().length > 0;
}

export function inferStaticStart(hasIndexHtml: boolean): Recipe | null {
  if (!hasIndexHtml) return null;
  return {
    install: "",
    build: "",
    start: "python3 -m http.server 8080",
    port: 8080,
    env: {},
    needs_db: false,
    notes: "static fallback",
  };
}

export async function probeUrl(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  try {
    const res = await fetchImpl(url, {
      method: "GET",
      headers: {
        "user-agent": "referee-health/1.0",
      },
      redirect: "follow",
    });
    return res.status >= 200 && res.status < 400;
  } catch {
    return false;
  }
}

export async function waitForOk(
  check: () => Promise<boolean>,
  timeoutMs = 90_000,
  stepMs = 3_000,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await check()) return true;
    await new Promise((r) => setTimeout(r, stepMs));
  }
  return false;
}

export function deployNotes(deployment: Deployment): string {
  if (deployment.healthy) return `${deployment.method} ${deployment.url}`;
  if (deployment.url) return `unhealthy ${deployment.method} ${deployment.url}`;
  return "no public url";
}

export function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}
