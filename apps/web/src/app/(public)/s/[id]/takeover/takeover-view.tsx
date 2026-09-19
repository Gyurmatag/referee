"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { mapClickToViewport, type TakeoverStatus } from "@referee/shared";
import { Button } from "@/components/ui/button";

type Payload = {
  team_name?: string;
  status?: string;
  takeover?: TakeoverStatus;
};

async function sendCommand(id: string, body: Record<string, unknown>) {
  await fetch(`/api/submissions/${id}/takeover`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function TakeoverView({ id }: { id: string }) {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState("");
  const [stamp, setStamp] = useState(0);
  const [pending, setPending] = useState(false);
  const frameRef = useRef<HTMLImageElement>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/submissions/${id}/takeover`);
      const json = (await res.json()) as Payload;
      if (!res.ok) throw new Error("Takeover unavailable");
      setData(json);
      setError("");
      if (json.takeover?.state === "waiting") setStamp(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Takeover unavailable");
    }
  }, [id]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 900);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const takeover = data?.takeover;
  const waiting = takeover?.state === "waiting" || data?.status === "takeover";
  const done = takeover?.state === "done" || data?.status === "done";

  async function onFrameClick(event: React.MouseEvent<HTMLImageElement>) {
    if (!waiting) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const point = mapClickToViewport(
      event.clientX - rect.left,
      event.clientY - rect.top,
      rect.width,
      rect.height,
    );
    await sendCommand(id, { type: "click", ...point });
    frameRef.current?.focus();
    setStamp(Date.now());
  }

  async function onFrameKey(event: React.KeyboardEvent<HTMLImageElement>) {
    if (!waiting) return;
    if (event.key === "Tab") event.preventDefault();
    if (event.key.length === 1 && !event.metaKey && !event.ctrlKey) {
      event.preventDefault();
      await sendCommand(id, { type: "type", text: event.key });
      return;
    }
    const keys = ["Enter", "Backspace", "Escape", "Tab", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
    if (keys.includes(event.key)) {
      event.preventDefault();
      await sendCommand(id, { type: "key", key: event.key });
    }
  }

  async function continueJudging() {
    setPending(true);
    await sendCommand(id, { type: "done" });
    setPending(false);
    void refresh();
  }

  if (error && !data) {
    return <p className="text-sm text-fail">{error}</p>;
  }

  if (!data) {
    return (
      <>
        <div className="h-4 w-28 animate-pulse rounded-[2px] bg-[#efefef]" />
        <div className="mt-6 h-12 w-80 animate-pulse rounded-[2px] bg-[#efefef]" />
        <div className="box mt-8 h-72 animate-pulse bg-[#f3f3f3]" />
      </>
    );
  }

  return (
    <div>
      <Link href={`/s/${id}`} className="text-sm text-muted-foreground hover:text-foreground">
        Submission
      </Link>
      <h1 className="mt-6 text-4xl font-medium">{data.team_name ?? "Team"}</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        This is the isolated judge browser. Sign in here - including Google or GitHub - then continue
        judging in the same session.
      </p>
      <p className="mt-2 text-[13px] text-muted-foreground">
        {takeover?.reason || (waiting ? "Waiting for a team login" : done ? "Judging continued" : "Browser not waiting")}
      </p>
      <div className="box mt-8 overflow-hidden p-2">
        {waiting || stamp ? (
          <img
            ref={frameRef}
            src={`/api/submissions/${id}/takeover/frame?t=${stamp}`}
            alt="Isolated browser"
            tabIndex={0}
            className="block w-full cursor-crosshair bg-[#efefef] outline-none"
            onClick={(event) => void onFrameClick(event)}
            onKeyDown={(event) => void onFrameKey(event)}
          />
        ) : (
          <div className="flex aspect-[16/10] items-center justify-center bg-[#f3f3f3] text-sm text-muted-foreground">
            Isolated browser is not waiting for a login
          </div>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" disabled={!waiting || pending} onClick={() => void continueJudging()}>
          {pending ? "Continuing" : "Continue judging"}
        </Button>
        <Button asChild variant="outline">
          <Link href={`/wall/${id}`}>Team log</Link>
        </Button>
      </div>
    </div>
  );
}
