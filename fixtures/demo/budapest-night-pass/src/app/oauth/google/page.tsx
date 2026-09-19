"use client";

import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { writePassSession } from "@/lib/auth-session";

const accounts = [
  { name: "Ada Pest", email: "ada.pest@gmail.com", initials: "AP" },
  { name: "Gyurmatag", email: "gyurmatag@gmail.com", initials: "GY" },
];

export default function GoogleOauthPage() {
  const router = useRouter();

  function pick(account: (typeof accounts)[number]) {
    writePassSession({
      name: account.name,
      method: "google",
      email: account.email,
    });
    router.push("/");
  }

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>Sign in with Google</CardTitle>
        <CardDescription>Choose an account to continue to Margaret Night Pass. Demo Google. Not a real OAuth hop.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {accounts.map((account) => (
          <Button
            key={account.email}
            type="button"
            variant="outline"
            className="h-auto w-full justify-start gap-3 py-3"
            onClick={() => pick(account)}
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback>{account.initials}</AvatarFallback>
            </Avatar>
            <span className="text-left leading-tight">
              <span className="block text-sm font-medium">{account.name}</span>
              <span className="block text-xs text-muted-foreground">{account.email}</span>
            </span>
          </Button>
        ))}
        <Button type="button" variant="ghost" className="w-full" onClick={() => router.push("/")}>
          Cancel
        </Button>
      </CardContent>
    </Card>
  );
}
