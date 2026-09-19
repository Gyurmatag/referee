"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { mapClickToViewport, type TakeoverStatus } from "@referee/shared";
import { Button } from "@/components/ui/button";

type Payload = {
  team_name?: string;
  status?: string;
  browser_log?: string;
  takeover?: TakeoverStatus;
};

async function sendCommand(id: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/submissions/${id}/takeover`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Could not send input to the isolated browser");
}

export function TakeoverView({ id }: { id: string }) {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState("");
  const [frameUrl, setFrameUrl] = useState<string | null>(null);
  const [frameReady, setFrameReady] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pending, setPending] = useState(false);
  const frameRef = useRef<HTMLImageElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const frameUrlRef = useRef<string | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/submissions/${id}/takeover`);
      const json = (await res.json()) as Payload;
      if (!res.ok) throw new Error("Takeover unavailable");
      setData(json);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Takeover unavailable");
    }
  }, [id]);

  const refreshFrame = useCallback(async () => {
    try {
      const res = await fetch(`/api/submissions/${id}/takeover/frame?t=${Date.now()}`);
      if (!res.ok) return;
      const blob = await res.blob();
      if (!blob.type.includes("png") || blob.size < 32) return;
      const hadFocus =
        document.activeElement === boxRef.current || document.activeElement === frameRef.current;
      const url = URL.createObjectURL(blob);
      if (frameUrlRef.current) URL.revokeObjectURL(frameUrlRef.current);
      frameUrlRef.current = url;
      setFrameUrl(url);
      setFrameReady(true);
      if (hadFocus) requestAnimationFrame(() => boxRef.current?.focus());
    } catch {
      // keep the last good frame
    }
  }, [id]);

  useEffect(() => {
    void refreshStatus();
    void refreshFrame();
    const statusTimer = window.setInterval(() => void refreshStatus(), 1500);
    const frameTimer = window.setInterval(() => void refreshFrame(), 700);
    return () => {
      window.clearInterval(statusTimer);
      window.clearInterval(frameTimer);
      if (frameUrlRef.current) URL.revokeObjectURL(frameUrlRef.current);
    };
  }, [refreshStatus, refreshFrame]);

  const takeover = data?.takeover;
  const waiting =
    takeover?.state === "waiting" ||
    takeover?.state === "starting" ||
    data?.status === "takeover";
  const done = takeover?.state === "done" || data?.status === "done";

  async function sendInput(body: Record<string, unknown>) {
    if (!waiting) return;
    await sendCommand(id, body);
    boxRef.current?.focus();
    window.setTimeout(() => void refreshFrame(), 280);
  }

  async function onFrameClick(event: React.MouseEvent<HTMLImageElement>) {
    event.preventDefault();
    boxRef.current?.focus();
    const rect = event.currentTarget.getBoundingClientRect();
    const point = mapClickToViewport(
      event.clientX - rect.left,
      event.clientY - rect.top,
      rect.width,
      rect.height,
    );
    await sendInput({ type: "click", ...point });
  }

  async function onFrameKey(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.metaKey || event.ctrlKey) return;
    if (event.key === "Tab") event.preventDefault();
    if (event.key.length === 1) {
      event.preventDefault();
      await sendInput({ type: "type", text: event.key });
      return;
    }
    const keys = ["Enter", "Backspace", "Escape", "Tab", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
    if (keys.includes(event.key)) {
      event.preventDefault();
      await sendInput({ type: "key", key: event.key });
    }
  }

  async function onPaste(event: React.ClipboardEvent<HTMLDivElement>) {
    const text = event.clipboardData.getData("text");
    if (!text) return;
    event.preventDefault();
    await sendInput({ type: "type", text });
  }

  async function continueJudging() {
    setPending(true);
    await sendCommand(id, { type: "done" });
    setPending(false);
    void refreshStatus();
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
        This is the isolated judge browser. Click and type here to finish Google or GitHub login,
        then continue judging in the same session.
      </p>
      <p className="mt-2 text-[13px] text-muted-foreground">
        {takeover?.reason ||
          (waiting ? "Waiting for a team login" : done ? "Judging continued" : "Browser not waiting")}
      </p>
      <div
        ref={boxRef}
        tabIndex={0}
        className={`box mt-8 overflow-hidden p-2 outline-none ${focused ? "ring-2 ring-[#111]" : ""}`}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(event) => void onFrameKey(event)}
        onPaste={(event) => void onPaste(event)}
      >
        {frameReady && frameUrl ? (
          <img
            ref={frameRef}
            src={frameUrl}
            alt="Isolated browser"
            draggable={false}
            className="block aspect-[16/10] w-full cursor-crosshair select-none bg-[#111] object-contain"
            onClick={(event) => void onFrameClick(event)}
            onDragStart={(event) => event.preventDefault()}
          />
        ) : waiting ? (
          <div className="flex aspect-[16/10] items-center justify-center bg-[#111] text-sm text-white/70">
            Starting the isolated browser…
          </div>
        ) : (
          <div className="flex aspect-[16/10] items-center justify-center bg-[#f3f3f3] text-sm text-muted-foreground">
            Isolated browser is not waiting for a login
          </div>
        )}
      </div>
      <p className="mt-2 text-[12px] text-muted-foreground">
        {focused
          ? "Mouse and keyboard are live in the isolated browser."
          : "Click the frame, then use the mouse and keyboard exactly as you would in a normal browser."}
      </p>
      {data.browser_log && !frameReady ? (
        <pre className="mt-3 max-h-32 overflow-auto whitespace-pre-wrap break-all text-[11px] text-muted-foreground">
          {data.browser_log}
        </pre>
      ) : null}
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
