import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex h-5 items-center rounded-[2px] px-1.5 text-xs font-medium tabular-nums",
  {
    variants: {
      variant: {
        default: "bg-secondary text-secondary-foreground",
        pass: "bg-pass/15 text-pass",
        partial: "bg-partial/15 text-partial",
        fail: "bg-fail/15 text-fail",
        running: "bg-running/15 text-running",
        outline: "border border-border text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
