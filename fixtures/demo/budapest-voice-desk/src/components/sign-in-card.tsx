"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEMO_EMAIL, DEMO_PASSWORD, writeDeskSession } from "@/lib/auth-session";

export function SignInCard() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (email.trim() === DEMO_EMAIL && password === DEMO_PASSWORD) {
      writeDeskSession({ name: "Judge desk", method: "password", email: DEMO_EMAIL });
      return;
    }
    setError("Use the team demo account or sign in with GitHub.");
  }

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>Sign in to the desk</CardTitle>
        <CardDescription>Civic inbox is behind a login. GitHub or the team demo account.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button asChild className="w-full">
          <Link href="/oauth/github/">Sign in with GitHub</Link>
        </Button>
        <form className="space-y-3" onSubmit={onSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" variant="outline" className="w-full">
            Sign in
          </Button>
        </form>
        <p className="text-xs text-muted-foreground">
          Demo account {DEMO_EMAIL} / {DEMO_PASSWORD}
        </p>
      </CardContent>
    </Card>
  );
}
