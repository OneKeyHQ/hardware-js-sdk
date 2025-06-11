import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "~/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-onekey-primary focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-onekey-primary text-white shadow-onekey hover:bg-onekey-primary-hover hover:shadow-onekey-lg",
        secondary:
          "border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100 hover:border-neutral-300",
        destructive:
          "border-transparent bg-gray-500 text-white shadow hover:bg-gray-600",
        outline:
          "border-onekey-primary/30 bg-onekey-primary-light text-onekey-accent hover:bg-onekey-primary-soft hover:border-onekey-primary/50",
        success:
          "border-transparent bg-onekey-primary/90 text-white shadow-onekey hover:bg-onekey-primary",
        warning:
          "border-transparent bg-orange-500 text-white shadow hover:bg-orange-600",
        info: "border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
