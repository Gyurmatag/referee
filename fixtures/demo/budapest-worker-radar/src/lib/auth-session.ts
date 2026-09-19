"use client";

import { useEffect, useState } from "react";

export const DEMO_EMAIL = "judge@team.dev";
export const DEMO_PASSWORD = "radar";
const KEY = "cb-session";

export type RadarSession = {
  name: string;
  method: "github" | "password";
  email?: string;
};

export function readRadarSession(): RadarSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RadarSession;
    if (!parsed?.name) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeRadarSession(session: RadarSession) {
  window.localStorage.setItem(KEY, JSON.stringify(session));
  window.dispatchEvent(new Event("cb-session"));
}

export function clearRadarSession() {
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("cb-session"));
}

export function useRadarSession() {
  const [session, setSession] = useState<RadarSession | null | undefined>(undefined);
  useEffect(() => {
    const sync = () => setSession(readRadarSession());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("cb-session", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("cb-session", sync);
    };
  }, []);
  return session;
}
