import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="shell pb-20 pt-16">
      <h1 className="text-4xl font-medium">Page not found</h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        That route is empty. Open Events or go back to the landing page.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/">Home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/events">Events</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/devin">Devin</Link>
        </Button>
      </div>
    </main>
  );
}
