"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { writeDeskSession } from "@/lib/auth-session";

export default function GithubOauthPage() {
  const router = useRouter();
  const [name, setName] = useState("");

  function authorize(event: React.FormEvent) {
    event.preventDefault();
    writeDeskSession({
      name: name.trim() || "Gyurmatag",
      method: "github",
    });
    router.push("/");
  }

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>Authorize Danube Voice Desk</CardTitle>
        <CardDescription>
          Demo GitHub authorize screen. The isolated judge browser waits here for a human.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-3" onSubmit={authorize}>
          <div className="space-y-1.5">
            <Label htmlFor="github-login">GitHub username</Label>
            <Input
              id="github-login"
              name="username"
              autoComplete="username"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit">Authorize Voice Desk</Button>
            <Button type="button" variant="outline" onClick={() => router.push("/")}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
