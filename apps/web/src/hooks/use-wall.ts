"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { SWR_REFRESH_MS } from "@/lib/swr";
import { coreWsUrl } from "@/lib/wall-url";
import type { WallPayload } from "@/lib/wall-client";

const fetcher = async (url: string): Promise<WallPayload> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("wall unavailable");
  return (await res.json()) as WallPayload;
};

export function useWall(options?: { live?: boolean; eventId?: string }) {
  const enableLive = options?.live ?? true;
  const eventId = options?.eventId ?? "default";
  const { data: polled, error, mutate } = useSWR(`/api/wall?event=${encodeURIComponent(eventId)}`, fetcher, {
    refreshInterval: SWR_REFRESH_MS,
  });
  const [live, setLive] = useState<WallPayload | null>(null);

  useEffect(() => {
    if (!enableLive) return;
    let socket: WebSocket | null = null;
    try {
      socket = new WebSocket(coreWsUrl());
    } catch {
      return;
    }
    socket.onmessage = (ev) => {
      try {
        const msg = JSON.parse(String(ev.data)) as WallPayload & { type?: string };
        if (msg.type === "pong") return;
        setLive(msg);
        void mutate(msg, { revalidate: false });
      } catch {
        /* ignore */
      }
    };
    const ping = window.setInterval(() => {
      if (socket?.readyState === WebSocket.OPEN) socket.send("ping");
    }, 20000);
    return () => {
      window.clearInterval(ping);
      socket?.close();
    };
  }, [enableLive, mutate]);

  return { data: live ?? polled, error };
}
