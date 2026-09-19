"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

const APP_URL = "https://referee-web.cfi-ops.workers.dev/";
const QR_SRC = `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(APP_URL)}`;

const fade = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
};

type Theme = "wash" | "ink";

type Slide = {
  id: string;
  theme: Theme;
  render: () => React.ReactNode;
};

function Kicker({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-current/45">{children}</p>;
}

function Display({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="max-w-5xl text-[52px] font-medium leading-[0.95] tracking-[-0.045em] md:text-[80px]">
      {children}
    </h1>
  );
}

function Line({ children }: { children: React.ReactNode }) {
  return <p className="max-w-3xl text-[22px] leading-snug text-current/55 md:text-[28px]">{children}</p>;
}

function Box({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="rounded-[10px] border border-black/10 bg-white px-5 py-4 drop-shadow-[0_0_8px_#ddd]">
      <p className="text-[17px] font-medium tracking-[-0.03em]">{label}</p>
      {hint ? <p className="mt-1 text-[13px] text-[#191919]/50">{hint}</p> : null}
    </div>
  );
}

function Shot({ src, alt, tall }: { src: string; alt: string; tall?: boolean }) {
  return (
    <div className="overflow-hidden rounded-[10px] border border-black/10 bg-white drop-shadow-[0_0_8px_#ddd]">
      <img
        src={src}
        alt={alt}
        className={`block w-full object-cover object-top ${tall ? "max-h-[58vh]" : "max-h-[48vh]"}`}
      />
    </div>
  );
}

const slides: Slide[] = [
  {
    id: "title",
    theme: "wash",
    render: () => (
      <div className="flex flex-col items-start gap-8">
        <Kicker>Referee</Kicker>
        <Display>
          The judge
          <br />
          that runs the code.
        </Display>
      </div>
    ),
  },
  {
    id: "room",
    theme: "wash",
    render: () => (
      <div className="flex flex-col items-start gap-8">
        <Kicker>The room</Kicker>
        <Display>
          Forty teams.
          <br />
          Three judges.
          <br />
          A spreadsheet.
        </Display>
      </div>
    ),
  },
  {
    id: "lie",
    theme: "wash",
    render: () => (
      <div className="flex flex-col items-start gap-8">
        <Kicker>The problem</Kicker>
        <Display>
          Demos lie.
          <br />
          READMEs lie.
        </Display>
        <Line>Sponsor claims are a checkbox. Nobody clones the repo.</Line>
      </div>
    ),
  },
  {
    id: "stakes",
    theme: "ink",
    render: () => (
      <div className="flex flex-col items-start gap-8">
        <Display>
          The best team
          <br />
          should not lose
          <br />
          to the best pitch.
        </Display>
      </div>
    ),
  },
  {
    id: "insight",
    theme: "wash",
    render: () => (
      <div className="flex flex-col items-start gap-8">
        <Kicker>Insight</Kicker>
        <Display>
          Judging is not taste.
          <br />
          It is operations.
        </Display>
      </div>
    ),
  },
  {
    id: "solution",
    theme: "wash",
    render: () => (
      <div className="flex flex-col items-start gap-8">
        <Kicker>Solution</Kicker>
        <Display>Referee.</Display>
        <Line>Submit a GitHub repo. We clone it, run it, and score it — live.</Line>
      </div>
    ),
  },
  {
    id: "look",
    theme: "wash",
    render: () => (
      <div className="flex w-full max-w-6xl flex-col items-start gap-8">
        <Kicker>Product</Kicker>
        <Display>The event.</Display>
        <Shot src="/presentation/landing.png" alt="Budapest Build on the Referee landing page" tall />
      </div>
    ),
  },
  {
    id: "flow",
    theme: "wash",
    render: () => (
      <div className="flex w-full max-w-5xl flex-col items-start gap-10">
        <Kicker>How it works</Kicker>
        <Display>One pipeline.</Display>
        <div className="grid w-full gap-3 sm:grid-cols-5">
          <Box label="Submit" hint="Repo. Claims. Team." />
          <Box label="Sandbox" hint="Clone. Build. Test." />
          <Box label="Deploy" hint="Devin ships it." />
          <Box label="Review" hint="Playwright. Team login." />
          <Box label="Wall" hint="Live to the room." />
        </div>
      </div>
    ),
  },
  {
    id: "teams",
    theme: "wash",
    render: () => (
      <div className="flex w-full max-w-5xl flex-col items-start gap-10">
        <Kicker>The room tonight</Kicker>
        <Display>Three teams.</Display>
        <div className="grid w-full gap-3 md:grid-cols-3">
          <Box label="Danube" hint="No live URL. Devin deploys it." />
          <Box label="Chain Bridge" hint="Already live on workers.dev." />
          <Box label="Margaret" hint="Live, Google login. The room takes over." />
        </div>
      </div>
    ),
  },
  {
    id: "board",
    theme: "wash",
    render: () => (
      <div className="flex w-full max-w-6xl flex-col items-start gap-8">
        <Kicker>Tonight</Kicker>
        <Display>The wall.</Display>
        <Shot src="/presentation/wall.png" alt="Budapest Build wall with three teams" tall />
      </div>
    ),
  },
  {
    id: "sandbox",
    theme: "wash",
    render: () => (
      <div className="flex w-full max-w-5xl flex-col items-start gap-8">
        <Kicker>Technical</Kicker>
        <Display>
          A real sandbox.
          <br />
          Not a prompt.
        </Display>
        <Line>
          Each team gets an isolated Cloudflare sandbox. It clones the repo, installs, builds, and
          runs Playwright. A demo email and password signs in. Google or GitHub waits for the team.
        </Line>
      </div>
    ),
  },
  {
    id: "takeover",
    theme: "wash",
    render: () => (
      <div className="grid w-full max-w-6xl items-center gap-10 md:grid-cols-2">
        <div className="flex flex-col items-start gap-8">
          <Kicker>Login</Kicker>
          <Display>
            The team
            <br />
            takes over.
          </Display>
          <Line>
            Team Margaret only has Google and GitHub. We freeze the isolated browser. Someone in the
            room signs in. Judging continues in that same session.
          </Line>
        </div>
        <Shot src="/presentation/margaret.png" alt="Margaret Night Pass fake Google account picker" />
      </div>
    ),
  },
  {
    id: "claims",
    theme: "wash",
    render: () => (
      <div className="flex w-full max-w-6xl flex-col items-start gap-8">
        <Kicker>Claims</Kicker>
        <Display>Four sponsors. Every team.</Display>
        <Shot src="/presentation/team.png" alt="Team Chain Bridge with all four sponsor claims" tall />
      </div>
    ),
  },
  {
    id: "demo",
    theme: "ink",
    render: () => (
      <div className="flex w-full max-w-5xl flex-col items-start gap-8">
        <Kicker>Budapest Build</Kicker>
        <Display>
          Live demo.
        </Display>
        <Line>Open the wall. Three teams. Margaret signs in.</Line>
        <p className="font-mono text-[15px] text-white/40">referee-web.cfi-ops.workers.dev</p>
      </div>
    ),
  },
  {
    id: "live",
    theme: "ink",
    render: () => (
      <div className="flex flex-col items-start gap-8">
        <Kicker>Live</Kicker>
        <Display>
          The wall is
          <br />
          a WebSocket.
        </Display>
        <Line>When a team finishes, the room sees it. No refresh. No export.</Line>
      </div>
    ),
  },
  {
    id: "architecture",
    theme: "wash",
    render: () => (
      <div className="flex w-full max-w-5xl flex-col items-start gap-8">
        <Kicker>Architecture</Kicker>
        <Display>The machine.</Display>
        <div className="grid w-full gap-3 md:grid-cols-2">
          <Box label="Web" hint="Next.js on Cloudflare. GitHub login. Events, submit, admin." />
          <Box label="Core worker" hint="Durable Objects drive one pipeline per team." />
          <Box label="D1 + R2" hint="Events, submissions, evidence, screenshots." />
          <Box label="Sandbox + Devin" hint="Isolated runs. Team takeover. Cognition Devin API." />
        </div>
      </div>
    ),
  },
  {
    id: "devin",
    theme: "wash",
    render: () => (
      <div className="flex flex-col items-start gap-8">
        <Kicker>Cognition</Kicker>
        <Display>
          Devin does
          <br />
          the judging.
        </Display>
        <Line>
          Build, tracks, and rubric — real Devin API sessions against the repo. Not a summary of the
          README.
        </Line>
      </div>
    ),
  },
  {
    id: "try",
    theme: "wash",
    render: () => (
        <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-8 text-center">
        <Kicker>Try it</Kicker>
        <Display>Open Referee.</Display>
        <div className="rounded-[10px] border border-black/10 bg-white p-5 drop-shadow-[0_0_8px_#ddd]">
          <img src={QR_SRC} alt="QR code to Referee" width={320} height={320} className="size-[240px] md:size-[320px]" />
        </div>
        <p className="text-[15px] text-[#191919]/50">{APP_URL.replace(/^https:\/\//, "")}</p>
      </div>
    ),
  },
];

function slideFromSearch() {
  if (typeof window === "undefined") return 0;
  const raw = Number(new URLSearchParams(window.location.search).get("s") || "1");
  if (!Number.isFinite(raw)) return 0;
  return Math.max(0, Math.min(slides.length - 1, raw - 1));
}

export function PresentationDeck() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(slideFromSearch);
  const indexRef = useRef(index);

  const go = useCallback((next: number) => {
    const clamped = Math.max(0, Math.min(slides.length - 1, next));
    indexRef.current = clamped;
    setIndex(clamped);
    const url = new URL(window.location.href);
    url.searchParams.set("s", String(clamped + 1));
    window.history.replaceState(null, "", url);
  }, []);

  const enterFullscreen = useCallback(() => {
    const node = rootRef.current;
    if (!node || document.fullscreenElement) return;
    void node.requestFullscreen().catch(() => undefined);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = Number(params.get("s") || "1");
    if (Number.isFinite(raw)) go(raw - 1);
  }, [go]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" || event.key === " " || event.key === "PageDown") {
        event.preventDefault();
        enterFullscreen();
        go(indexRef.current + 1);
      } else if (event.key === "ArrowLeft" || event.key === "PageUp" || event.key === "Backspace") {
        event.preventDefault();
        go(indexRef.current - 1);
      } else if (event.key === "Home") {
        event.preventDefault();
        go(0);
      } else if (event.key === "End") {
        event.preventDefault();
        go(slides.length - 1);
      } else if (event.key === "f" || event.key === "F") {
        event.preventDefault();
        enterFullscreen();
      } else if (event.key === "Escape" && document.fullscreenElement) {
        event.preventDefault();
        void document.exitFullscreen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enterFullscreen, go]);

  const slide = slides[index] ?? slides[0];
  const ink = slide.theme === "ink";

  return (
    <div
      ref={rootRef}
      className={`relative min-h-dvh overflow-hidden ${ink ? "bg-[#191919] text-white" : "bg-[#f7f6f5] text-[#191919]"}`}
      onClick={(event) => {
        enterFullscreen();
        const rect = event.currentTarget.getBoundingClientRect();
        const x = event.clientX - rect.left;
        go(x < rect.width * 0.22 ? indexRef.current - 1 : indexRef.current + 1);
      }}
    >
      <div className="flex min-h-dvh items-center px-8 py-16 md:px-20">
        <AnimatePresence mode="wait">
          <motion.div key={slide.id} className="w-full" {...fade}>
            {slide.render()}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between px-8 pb-6 text-[12px] text-current/35 md:px-20">
        <span>Referee</span>
        <span>
          {index + 1} / {slides.length}
        </span>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-[2px] bg-current/8">
        <div
          className="h-full bg-current/50 transition-all duration-300"
          style={{ width: `${((index + 1) / slides.length) * 100}%` }}
        />
      </div>
    </div>
  );
}
