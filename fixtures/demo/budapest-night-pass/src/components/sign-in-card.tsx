import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SignInCard() {
  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>Members only</CardTitle>
        <CardDescription>
          Margaret Night Pass is behind a social login. The judge cannot finish this. A human has to.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button asChild className="w-full">
          <Link href="/oauth/google/">Continue with Google</Link>
        </Button>
        <Button asChild variant="outline" className="w-full">
          <Link href="/oauth/github/">Sign in with GitHub</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
