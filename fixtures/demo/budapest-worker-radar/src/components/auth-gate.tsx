"use client";

import { useRadarSession } from "@/lib/auth-session";
import { SignInCard } from "@/components/sign-in-card";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const session = useRadarSession();
  if (session === undefined) {
    return <div className="h-48 animate-pulse rounded-lg bg-muted" />;
  }
  if (!session) return <SignInCard />;
  return <>{children}</>;
}
