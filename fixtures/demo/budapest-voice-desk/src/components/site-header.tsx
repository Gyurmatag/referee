"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const links = [
  { href: "/", label: "Inbox" },
  { href: "/briefs", label: "Briefs" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback>DV</AvatarFallback>
          </Avatar>
          <div className="leading-tight">
            <p className="text-sm font-medium">Danube Voice Desk</p>
            <p className="text-xs text-muted-foreground">Team Danube</p>
          </div>
        </div>
        <nav className="flex items-center gap-1">
          {links.map((link) => (
            <Button key={link.href} asChild variant={pathname === link.href ? "secondary" : "ghost"} size="sm">
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))}
        </nav>
      </div>
      <Separator />
    </header>
  );
}
