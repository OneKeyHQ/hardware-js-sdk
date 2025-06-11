import * as React from "react";
import { cn } from "../../lib/utils";

interface CollapsibleProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

const Collapsible: React.FC<CollapsibleProps> = ({ children, className }) => {
  return <div className={cn("w-full", className)}>{children}</div>;
};

interface CollapsibleTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

const CollapsibleTrigger: React.FC<CollapsibleTriggerProps> = ({
  children,
  className,
  ...props
}) => {
  return (
    <button
      className={cn(
        "flex w-full items-center justify-between py-2 text-sm font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

interface CollapsibleContentProps {
  open?: boolean;
  children: React.ReactNode;
  className?: string;
}

const CollapsibleContent: React.FC<CollapsibleContentProps> = ({
  open = false,
  children,
  className,
}) => {
  return (
    <div
      className={cn(
        "overflow-hidden transition-all duration-200",
        open ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0",
        className
      )}
    >
      <div className="pt-2">{children}</div>
    </div>
  );
};

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
