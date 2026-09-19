"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { clearRadarSession, useRadarSession } from "@/lib/auth-session";

const links = [
  { href: "/", label: "Network" },
  { href: "/scans", label: "Scans" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const session = useRadarSession();

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback>CB</AvatarFallback>
          </Avatar>
          <div className="leading-tight">
            <p className="text-sm font-medium">Chain Bridge Radar</p>
            <p className="text-xs text-muted-foreground">Team Chain Bridge</p>
          </div>
        </div>
        <nav className="flex items-center gap-1">
          {links.map((link) => (
            <Button key={link.href} asChild variant={pathname === link.href ? "secondary" : "ghost"} size="sm">
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))}
          {session ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => clearRadarSession()}>
              {session.name}
            </Button>
          ) : (
            <Button asChild variant="ghost" size="sm">
              <Link href="/oauth/github/">Sign in with GitHub</Link>
            </Button>
          )}
        </nav>
      </div>
      <Separator />
    </header>
  );
}
