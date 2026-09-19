import Link from "next/link";
import { Button } from "@/components/ui/button";

export function MissingEvent() {
  return (
    <main className="shell pb-20 pt-16">
      <h1 className="text-4xl font-medium">Event not found</h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        That event is empty. Open Events and pick one that exists.
      </p>
      <div className="mt-6">
        <Button asChild>
          <Link href="/events">Events</Link>
        </Button>
      </div>
    </main>
  );
}
