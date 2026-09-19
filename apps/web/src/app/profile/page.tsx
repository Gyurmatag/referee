"use client";

import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

function initials(login: string) {
  return login.slice(0, 1).toUpperCase() || "R";
}

export default function ProfilePage() {
  const { data, status, update } = useSession();
  const login = data?.user?.login ?? "";
  const image = data?.user?.image ?? "";
  const [name, setName] = useState(data?.user?.name ?? "");
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!login) return;
    void fetch("/api/me")
      .then((r) => r.json())
      .then((json: { name?: string }) => {
        if (json.name) setName(json.name);
      })
      .catch(() => undefined);
  }, [login]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setSaved(false);
    setError("");
    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const body = (await res.json().catch(() => null)) as { name?: string; error?: string } | null;
    setPending(false);
    if (!res.ok || !body?.name) {
      setError(body?.error ?? "Save failed");
      return;
    }
    setName(body.name);
    await update({ name: body.name });
    setSaved(true);
  }

  if (status === "loading") {
    return (
      <main className="shell pb-20 pt-10">
        <div className="h-10 w-28 animate-pulse rounded-[2px] bg-[#efefef]" />
        <div className="box mt-8 p-6">
          <div className="flex items-center gap-4">
            <div className="size-14 animate-pulse rounded-[5px] bg-[#efefef]" />
            <div className="h-4 w-24 animate-pulse rounded-[2px] bg-[#efefef]" />
          </div>
          <div className="mt-6 h-4 w-16 animate-pulse rounded-[2px] bg-[#efefef]" />
          <div className="mt-2 h-10 w-full animate-pulse rounded-[2px] bg-[#efefef]" />
          <div className="mt-5 h-9 w-16 animate-pulse rounded-[2px] bg-[#191919]" />
        </div>
      </main>
    );
  }

  if (!login) {
    return (
      <main className="shell pb-20 pt-16">
        <h1 className="text-4xl font-medium">Profile</h1>
        <p className="mt-3 text-sm text-muted-foreground">Log in with GitHub to open your profile.</p>
        <Button className="mt-6" type="button" onClick={() => void signIn("github", { callbackUrl: "/profile" })}>
          Continue with GitHub
        </Button>
      </main>
    );
  }

  return (
    <main className="shell pb-20 pt-10">
      <h1 className="text-4xl font-medium">Profile</h1>
      <form className="box mt-8 p-6" onSubmit={(e) => void onSave(e)}>
        <div className="flex items-center gap-4">
          <Avatar className="size-14">
            {image ? <AvatarImage src={image} alt={login} /> : null}
            <AvatarFallback className="text-base">{initials(login)}</AvatarFallback>
          </Avatar>
          <p className="truncate font-mono text-[13px] text-muted-foreground">{login}</p>
        </div>
        <label className="mt-6 block text-sm">
          Name
          <input
            className="field"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSaved(false);
            }}
            maxLength={80}
            required
          />
        </label>
        {error ? <p className="mt-3 text-sm text-fail">{error}</p> : null}
        {saved ? <p className="mt-3 text-sm text-muted-foreground">Saved</p> : null}
        <Button className="mt-5" type="submit" disabled={pending || !name.trim()}>
          {pending ? "Saving" : "Save"}
        </Button>
      </form>
    </main>
  );
}
