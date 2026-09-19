"use client";

import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const { data, status } = useSession();
  const login = data?.user?.login ?? "";
  const roles = data?.user?.roles ?? [];
  const organizer = roles.includes("organizer");

  return (
    <header className="flex items-center justify-between px-6 py-5 md:px-10">
      <nav className="flex items-center gap-7 text-sm">
        <Link href="/" className="flex items-center gap-2 font-medium">
          <span className="grid size-6 place-items-center rounded-[5px] bg-foreground text-[11px] text-background">
            R
          </span>
        </Link>
        <Link href="/submit" className="hidden text-muted-foreground hover:text-foreground sm:inline">
          Submit
        </Link>
        <Link href="/wall" className="hidden text-muted-foreground hover:text-foreground sm:inline">
          Wall
        </Link>
        {organizer ? (
          <Link href="/org" className="hidden text-muted-foreground hover:text-foreground sm:inline">
            Organizer
          </Link>
        ) : null}
      </nav>
      <div className="flex items-center gap-2">
        {status === "loading" ? (
          <div className="flex items-center gap-2">
            <div className="h-8 w-14 animate-pulse rounded-[2px] bg-[#efefef]" />
            <div className="h-8 w-24 animate-pulse rounded-[2px] bg-[#191919]" />
          </div>
        ) : login ? (
          <>
            <span className="hidden text-sm text-muted-foreground md:inline">
              {login}
            </span>
            <Button type="button" variant="outline" onClick={() => void signOut({ callbackUrl: "/" })}>
              Sign out
            </Button>
          </>
        ) : (
          <>
            <Button type="button" variant="ghost" onClick={() => void signIn("github", { callbackUrl: "/submit" })}>
              Log in
            </Button>
            <Button type="button" onClick={() => void signIn("github", { callbackUrl: "/submit" })}>
              Get started
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
