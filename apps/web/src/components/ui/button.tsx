import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center rounded-[2px] border text-[16px] leading-[1.4] whitespace-nowrap transition-opacity outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:opacity-80",
        outline: "border-primary bg-transparent hover:bg-black/4",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:opacity-80",
        ghost: "border-transparent hover:bg-muted",
        destructive: "border-transparent bg-fail/10 text-fail hover:bg-fail/20",
      },
      size: {
        default: "px-3 py-[6px]",
        sm: "px-2.5 py-1 text-sm",
        lg: "px-3.5 py-[7px]",
        icon: "size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
