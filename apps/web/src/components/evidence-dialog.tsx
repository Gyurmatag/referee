"use client";

import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function EvidenceDialog({ path }: { path: string }) {
  const src = path.startsWith("http")
    ? path
    : `/api/evidence?key=${encodeURIComponent(path)}`;
  const isVideo = path.endsWith(".webm") || path.endsWith(".mp4");
  const isImage = /\.(png|jpg|jpeg|webp)$/i.test(path);
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {path.split("/").pop()}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>{path}</DialogTitle>
        {isVideo ? (
          <video controls className="mt-3 w-full rounded-[2px] bg-black" src={src} />
        ) : isImage ? (
          <img src={src} alt="" className="mt-3 w-full rounded-[2px] border border-black/10" />
        ) : (
          <p className="mt-3 font-mono text-sm">{path}</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
