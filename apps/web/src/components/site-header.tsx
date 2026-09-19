"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();
  const { data, status } = useSession();
  const login = data?.user?.login ?? "";
  const roles = data?.user?.roles ?? [];
  const organizer = roles.includes("organizer");
  const image = data?.user?.image ?? "";
  const eventId = pathname.match(/^\/events\/([^/]+)/)?.[1] ?? null;

  return (
    <header className="shell flex items-center justify-between py-5">
      <nav className="flex items-center gap-7 text-sm">
        <Link href="/" className="flex items-center gap-2 font-medium">
          <span className="grid size-10 place-items-center rounded-[6px] bg-foreground text-[16px] text-background">
            R
          </span>
        </Link>
        {login ? (
          <Link href="/events" className="hidden text-muted-foreground hover:text-foreground sm:inline">
            Events
          </Link>
        ) : null}
        {eventId ? (
          <>
            <Link
              href={`/events/${eventId}/submit`}
              className="hidden text-muted-foreground hover:text-foreground sm:inline"
            >
              Submit
            </Link>
            <Link
              href={`/events/${eventId}/wall`}
              className="hidden text-muted-foreground hover:text-foreground sm:inline"
            >
              Wall
            </Link>
            {organizer ? (
              <Link
                href={`/events/${eventId}/admin`}
                className="hidden text-muted-foreground hover:text-foreground sm:inline"
              >
                Admin
              </Link>
            ) : null}
          </>
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
            <Button type="button" variant="ghost" onClick={() => void signIn("github", { callbackUrl: "/" })}>
              Log in
            </Button>
            <Button type="button" onClick={() => void signIn("github", { callbackUrl: "/" })}>
              Get started
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
