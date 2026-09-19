"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function AppealForm({ id }: { id: string }) {
  const router = useRouter();
  const [hints, setHints] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setPending(true);
    setError(null);
    const res = await fetch(`/api/submissions/${id}/appeal`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ hints }),
    });
    setPending(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Appeal failed");
      return;
    }
    router.push(`/s/${id}`);
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Request re-run with hints</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Request re-run with hints</DialogTitle>
        <textarea
          className="field-area min-h-28"
          value={hints}
          onChange={(e) => setHints(e.target.value)}
          placeholder="Install with pnpm. App listens on 5173."
        />
        {error ? <p className="mt-2 text-sm text-fail">{error}</p> : null}
        <div className="mt-3 flex justify-end">
          <Button disabled={pending} onClick={() => void submit()}>
            {pending ? "Starting" : "Start re-run"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
