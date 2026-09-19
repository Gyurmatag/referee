import { DurableObject } from "cloudflare:workers";
import type { CoreEnv } from "../db/queries.js";

type QueueItem = { submissionId: string; judge: string; requestedAt: string };

export class JudgeScheduler extends DurableObject<CoreEnv> {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const body = request.method === "POST" ? await request.json<{
      submissionId: string;
      judge: string;
    }>() : { submissionId: "", judge: "" };
    if (url.pathname.endsWith("/request")) {
      return Response.json(await this.requestSlot(body.submissionId, body.judge));
    }
    if (url.pathname.endsWith("/release")) {
      return Response.json(await this.releaseSlot(body.submissionId, body.judge));
    }
    if (url.pathname.endsWith("/status")) {
      const active = (await this.ctx.storage.get<string[]>("active")) ?? [];
      const queue = (await this.ctx.storage.get<QueueItem[]>("queue")) ?? [];
      return Response.json({ inUse: active.length, queued: queue.length, active, queue });
    }
    if (url.pathname.endsWith("/bump") && request.method === "POST") {
      return Response.json(await this.bump(body.submissionId));
    }
    return new Response("not found", { status: 404 });
  }

  async requestSlot(submissionId: string, judge: string) {
    await this.reclaim();
    const max = Number(this.env.MAX_CONCURRENT_JUDGES || "6");
    const active = (await this.ctx.storage.get<string[]>("active")) ?? [];
    const grantedAt = (await this.ctx.storage.get<Record<string, string>>("grantedAt")) ?? {};
    const queue = (await this.ctx.storage.get<QueueItem[]>("queue")) ?? [];
    const key = `${submissionId}:${judge}`;
    if (active.includes(key)) {
      return { granted: true as const, position: 0 };
    }
    if (active.length < max) {
      active.push(key);
      grantedAt[key] = new Date().toISOString();
      await this.ctx.storage.put("active", active);
      await this.ctx.storage.put("grantedAt", grantedAt);
      return { granted: true as const, position: 0 };
    }
    if (!queue.some((item) => item.submissionId === submissionId && item.judge === judge)) {
      queue.push({
        submissionId,
        judge,
        requestedAt: new Date().toISOString(),
      });
      await this.ctx.storage.put("queue", queue);
    }
    const position = queue.findIndex(
      (item) => item.submissionId === submissionId && item.judge === judge,
    );
    return { granted: false as const, position: position + 1 };
  }

  async releaseSlot(submissionId: string, judge: string) {
    const key = `${submissionId}:${judge}`;
    let active = ((await this.ctx.storage.get<string[]>("active")) ?? []).filter(
      (item) => item !== key,
    );
    const grantedAt = (await this.ctx.storage.get<Record<string, string>>("grantedAt")) ?? {};
    delete grantedAt[key];
    let queue = (await this.ctx.storage.get<QueueItem[]>("queue")) ?? [];
    queue = queue.filter((item) => !(item.submissionId === submissionId && item.judge === judge));
    const max = Number(this.env.MAX_CONCURRENT_JUDGES || "6");
    while (active.length < max && queue.length > 0) {
      const next = queue.shift();
      if (!next) break;
      const nextKey = `${next.submissionId}:${next.judge}`;
      active.push(nextKey);
      grantedAt[nextKey] = new Date().toISOString();
    }
    await this.ctx.storage.put("active", active);
    await this.ctx.storage.put("queue", queue);
    await this.ctx.storage.put("grantedAt", grantedAt);
    return { released: true, inUse: active.length };
  }

  async bump(submissionId: string) {
    let queue = (await this.ctx.storage.get<QueueItem[]>("queue")) ?? [];
    const hit = queue.filter((item) => item.submissionId === submissionId);
    const rest = queue.filter((item) => item.submissionId !== submissionId);
    queue = [...hit, ...rest];
    await this.ctx.storage.put("queue", queue);
    return { bumped: hit.length, queued: queue.length };
  }

  private async reclaim(): Promise<void> {
    const limitMin = Number(this.env.JUDGE_TIME_LIMIT_MIN || "20") + 5;
    const grantedAt = (await this.ctx.storage.get<Record<string, string>>("grantedAt")) ?? {};
    const now = Date.now();
    const leaked = Object.entries(grantedAt)
      .filter(([, at]) => now - Date.parse(at) > limitMin * 60_000)
      .map(([key]) => key);
    if (leaked.length === 0) return;
    let active = (await this.ctx.storage.get<string[]>("active")) ?? [];
    active = active.filter((item) => !leaked.includes(item));
    for (const key of leaked) delete grantedAt[key];
    await this.ctx.storage.put("active", active);
    await this.ctx.storage.put("grantedAt", grantedAt);
  }
}
