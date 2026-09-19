"use client";

import { usePathname } from "next/navigation";
import { SiteHeader } from "@/components/site-header";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/presentation")) return children;
  return (
    <>
      <SiteHeader />
      {children}
    </>
  );
}
