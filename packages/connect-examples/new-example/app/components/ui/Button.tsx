import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "~/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 hover:shadow-xl hover:scale-105 active:scale-95",
        destructive:
          "bg-gray-600 text-white shadow hover:bg-gray-700 hover:shadow-lg hover:scale-105 active:scale-95",
        warning:
          "bg-orange-500 text-white shadow hover:bg-orange-600 hover:shadow-lg hover:scale-105 active:scale-95",
        outline:
          "border border-border bg-background text-foreground shadow hover:bg-muted hover:shadow-lg",
        secondary:
          "bg-secondary text-secondary-foreground shadow hover:bg-secondary/80 hover:shadow-lg",
        ghost: "text-foreground hover:bg-muted hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary/80",
        success:
          "bg-emerald-500 text-white shadow-lg hover:bg-emerald-600 hover:shadow-xl hover:scale-105 active:scale-95",
        elegant:
          "bg-card border border-border text-foreground shadow hover:bg-muted hover:shadow-lg hover:border-border/70",
      },
      size: {
        default: "h-10 px-6 py-2",
        sm: "h-8 rounded-lg px-4 text-xs",
        lg: "h-12 rounded-2xl px-8 text-base",
        icon: "h-10 w-10",
        xl: "h-14 rounded-2xl px-10 text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
