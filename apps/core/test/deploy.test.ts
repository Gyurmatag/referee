import { describe, expect, it } from "vitest";
import {
  inferStaticStart,
  recipeHasStart,
  deployNotes,
  waitForOk,
  probeUrl,
} from "../src/sandbox/deploy-helpers.js";

describe("deploy helpers", () => {
  it("detects a start command", () => {
    expect(recipeHasStart({ start: "npm start", install: "", build: "", port: 3000, env: {}, needs_db: false, notes: "" })).toBe(true);
    expect(recipeHasStart({ start: "  ", install: "", build: "", port: 3000, env: {}, needs_db: false, notes: "" })).toBe(false);
  });

  it("infers a static server when index.html exists", () => {
    expect(inferStaticStart(true)?.start).toContain("http.server");
    expect(inferStaticStart(false)).toBeNull();
  });

  it("probes URLs and waits", async () => {
    const ok = await probeUrl("https://example.com", async () => new Response("ok", { status: 200 }));
    expect(ok).toBe(true);
    const failed = await probeUrl("https://example.com", async () => {
      throw new Error("down");
    });
    expect(failed).toBe(false);
    let n = 0;
    expect(await waitForOk(async () => (++n) >= 2, 20_000, 1)).toBe(true);
  });

  it("formats deploy notes", () => {
    expect(
      deployNotes({
        method: "sandbox",
        url: "https://x.trycloudflare.com",
        sandbox_url: "https://x.trycloudflare.com",
        sandbox_id: "sub-1",
        port: 3000,
        healthy: true,
        last_seen_at: "",
      }),
    ).toContain("sandbox");
  });
});
