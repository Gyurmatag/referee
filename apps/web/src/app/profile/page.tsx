"use client";

import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

function initials(login: string) {
  return login.slice(0, 1).toUpperCase() || "R";
}

export default function ProfilePage() {
  const { data, status } = useSession();
  const login = data?.user?.login ?? "";
  const name = data?.user?.name ?? login;
  const image = data?.user?.image ?? "";
  const roles = data?.user?.roles ?? [];

  if (status === "loading") {
    return (
      <main className="mx-auto max-w-lg px-6 pb-20 pt-10">
        <div className="h-10 w-28 animate-pulse rounded-[2px] bg-[#efefef]" />
        <div className="box mt-8 p-6">
          <div className="flex items-center gap-4">
            <div className="size-14 animate-pulse rounded-[5px] bg-[#efefef]" />
            <div className="flex-1">
              <div className="h-5 w-36 animate-pulse rounded-[2px] bg-[#efefef]" />
              <div className="mt-2 h-4 w-24 animate-pulse rounded-[2px] bg-[#efefef]" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!login) {
    return (
      <main className="mx-auto max-w-lg px-6 pb-20 pt-16">
        <h1 className="text-4xl font-medium">Profile</h1>
        <p className="mt-3 text-sm text-muted-foreground">Log in with GitHub to open your profile.</p>
        <Button className="mt-6" type="button" onClick={() => void signIn("github", { callbackUrl: "/profile" })}>
          Continue with GitHub
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-6 pb-20 pt-10">
      <h1 className="text-4xl font-medium">Profile</h1>
      <section className="box mt-8 p-6">
        <div className="flex items-center gap-4">
          <Avatar className="size-14">
            {image ? <AvatarImage src={image} alt={login} /> : null}
            <AvatarFallback className="text-base">{initials(login)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-[16px] font-medium">{name}</p>
            <a
              href={`https://github.com/${login}`}
              className="mt-1 block truncate font-mono text-[13px] text-muted-foreground hover:text-foreground"
              target="_blank"
              rel="noreferrer"
            >
              {login}
            </a>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-1.5">
          {roles.map((role) => (
            <Badge key={role} variant="outline">
              {role}
            </Badge>
          ))}
        </div>
        <Separator className="my-5" />
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/submit">Submit</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/wall">Wall</Link>
          </Button>
          {roles.includes("organizer") ? (
            <Button asChild variant="outline">
              <Link href="/org">Organizer</Link>
            </Button>
          ) : null}
        </div>
        <Button
          className="mt-5"
          type="button"
          variant="outline"
          onClick={() => void signOut({ callbackUrl: "/" })}
        >
          Log out
        </Button>
      </section>
    </main>
  );
}
