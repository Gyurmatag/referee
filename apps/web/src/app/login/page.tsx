"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function LoginPage() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError("");
    const res = await signIn("demo", {
      email: String(form.get("email") || ""),
      password: String(form.get("password") || ""),
      callbackUrl: "/events",
      redirect: false,
    });
    setPending(false);
    if (!res || res.error) {
      setError("Login failed");
      return;
    }
    window.location.assign(res.url || "/events");
  }

  return (
    <main className="shell pb-20 pt-16">
      <h1 className="text-4xl font-medium">Log in</h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        Devin and judges use the email and password. GitHub is optional.
      </p>
      <Card className="mt-8 max-w-md">
        <CardContent>
          <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-4">
            <label className="text-sm">
              Email
              <input name="email" type="email" autoComplete="username" className="field" />
            </label>
            <label className="text-sm">
              Password
              <input name="password" type="password" autoComplete="current-password" className="field" />
            </label>
            {error ? <p className="text-sm text-fail">{error}</p> : null}
            <Button type="submit" disabled={pending}>
              {pending ? "Signing in" : "Sign in"}
            </Button>
          </form>
          <div className="mt-6 border-t border-black/10 pt-4">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => void signIn("github", { callbackUrl: "/events" })}
            >
              Continue with GitHub
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
