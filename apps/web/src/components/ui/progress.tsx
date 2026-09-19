import * as React from "react";
import { cn } from "@/lib/utils";

function Progress({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-[2px] bg-muted", className)}
    >
      <div
        className="h-full bg-running transition-[width]"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export { Progress };
