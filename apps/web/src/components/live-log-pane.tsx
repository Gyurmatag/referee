"use client";

import { useEffect, useRef } from "react";
import { judgeLabel, visibleLog } from "@/lib/visible-log";

export function LiveLogPane({
  judge,
  phase,
  text,
  sessionUrl,
  error,
  tall,
}: {
  judge: string;
  phase: string;
  text: string;
  sessionUrl?: string | null;
  error?: string | null;
  tall?: boolean;
}) {
  const ref = useRef<HTMLPreElement>(null);
  const stick = useRef(true);
  const clean = visibleLog(text);
  const running = !["done", "failed"].includes(phase);
  const tone = phase === "failed" ? "text-fail" : phase === "done" ? "text-pass" : "text-[#c9f07d]";

  useEffect(() => {
    const el = ref.current;
    if (!el || !stick.current) return;
    el.scrollTop = el.scrollHeight;
  }, [clean]);

  return (
    <section className="min-w-0 overflow-hidden rounded-[10px] border border-black/10 bg-[#111111] text-[#ececec]">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-2.5">
        <div className="flex items-center gap-2 text-[13px]">
          <span
            className={`inline-block size-2 rounded-full ${running ? "animate-pulse bg-[#c9f07d]" : "bg-white/25"}`}
          />
          <span>{judgeLabel(judge)}</span>
        </div>
        <p className={`font-mono text-[11px] uppercase tracking-[0.04em] ${tone}`}>
          {running ? "live" : phase} · {phase}
        </p>
      </header>
      <pre
        ref={ref}
        onScroll={(event) => {
          const el = event.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
        }}
        className={`w-full min-w-0 overflow-y-auto whitespace-pre-wrap break-all px-4 py-3 font-mono text-[12px] leading-5 text-[#d8d8d8] ${
          tall ? "max-h-[min(72vh,640px)]" : "max-h-[min(42vh,360px)]"
        }`}
      >
        {clean || (running ? "Judging started. Waiting for the first log line…" : "No log yet")}
      </pre>
      {sessionUrl || error ? (
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 px-4 py-2 text-[12px]">
          {sessionUrl ? (
            <a className="underline" href={sessionUrl} target="_blank" rel="noreferrer">
              Open Devin session
            </a>
          ) : (
            <span />
          )}
          {error ? <span className="text-fail">{error}</span> : null}
        </footer>
      ) : null}
    </section>
  );
}
