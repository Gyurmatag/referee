import { DurableObject } from "cloudflare:workers";
import type { CoreEnv } from "../db/queries.js";

export class WallHub extends DurableObject<CoreEnv> {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.headers.get("Upgrade") === "websocket") {
      const pair = new WebSocketPair();
      this.ctx.acceptWebSocket(pair[1]);
      return new Response(null, { status: 101, webSocket: pair[0] });
    }
    if (request.method === "POST" && url.pathname.endsWith("/broadcast")) {
      const body = await request.text();
      for (const socket of this.ctx.getWebSockets()) {
        try {
          socket.send(body);
        } catch {
          /* dropped client */
        }
      }
      return Response.json({ ok: true, clients: this.ctx.getWebSockets().length });
    }
    return new Response("not found", { status: 404 });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message === "string" && message === "ping") {
      ws.send(JSON.stringify({ type: "pong" }));
    }
  }

  async webSocketClose(): Promise<void> {
    /* hibernate */
  }
}

export async function broadcastWall(env: CoreEnv, payload: unknown): Promise<void> {
  if (!env.WALL) return;
  const stub = env.WALL.get(env.WALL.idFromName("global"));
  await stub.fetch("https://wall/broadcast", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "snapshot", at: new Date().toISOString(), ...(payload as object) }),
  });
}
