"use client";

import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function initials(login: string) {
  return login.slice(0, 1).toUpperCase() || "R";
}

export function SiteHeader() {
  const { data, status } = useSession();
  const login = data?.user?.login ?? "";
  const roles = data?.user?.roles ?? [];
  const organizer = roles.includes("organizer");
  const image = data?.user?.image ?? "";

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
          <div className="size-8 animate-pulse rounded-[5px] bg-[#efefef]" />
        ) : login ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Open profile"
                className="rounded-[5px] outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
              >
                <Avatar>
                  {image ? <AvatarImage src={image} alt={login} /> : null}
                  <AvatarFallback>{initials(login)}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{login}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile">Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void signOut({ callbackUrl: "/" })}>
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
