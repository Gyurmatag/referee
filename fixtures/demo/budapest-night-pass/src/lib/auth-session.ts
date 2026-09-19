"use client";

import { useEffect, useState } from "react";

const KEY = "mn-session";

export type PassSession = {
  name: string;
  method: "google" | "github";
  email?: string;
};

export function readPassSession(): PassSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PassSession;
    if (!parsed?.name) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writePassSession(session: PassSession) {
  window.localStorage.setItem(KEY, JSON.stringify(session));
  window.dispatchEvent(new Event("mn-session"));
}

export function clearPassSession() {
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("mn-session"));
}

export function usePassSession() {
  const [session, setSession] = useState<PassSession | null | undefined>(undefined);
  useEffect(() => {
    const sync = () => setSession(readPassSession());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("mn-session", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("mn-session", sync);
    };
  }, []);
  return session;
}
