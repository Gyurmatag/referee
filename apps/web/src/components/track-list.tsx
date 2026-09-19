"use client";

import type { TrackVerdict } from "@referee/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function TrackList({ tracks }: { tracks: TrackVerdict[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tracks</CardTitle>
      </CardHeader>
      <CardContent>
        {tracks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No track scores yet</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {tracks.map((track) => (
              <li key={track.track} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between">
                  <span>{track.track}</span>
                  <span className="font-mono text-sm tabular-nums">
                    {track.score}/{track.max}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{track.notes}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {track.evidence.join(", ") || "No evidence"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
