"use client";

import { useEffect, useState } from "react";

export const DEMO_EMAIL = "judge@team.dev";
export const DEMO_PASSWORD = "danube";
const KEY = "vd-session";

export type DeskSession = {
  name: string;
  method: "github" | "password";
  email?: string;
};

export function readDeskSession(): DeskSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DeskSession;
    if (!parsed?.name) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeDeskSession(session: DeskSession) {
  window.localStorage.setItem(KEY, JSON.stringify(session));
  window.dispatchEvent(new Event("vd-session"));
}

export function clearDeskSession() {
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("vd-session"));
}

export function useDeskSession() {
  const [session, setSession] = useState<DeskSession | null | undefined>(undefined);
  useEffect(() => {
    const sync = () => setSession(readDeskSession());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("vd-session", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("vd-session", sync);
    };
  }, []);
  return session;
}
