import React from "react";
import { Link } from "@remix-run/react";
import { ChevronRight } from "lucide-react";
import { cn } from "~/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  current?: boolean;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className }) => {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center space-x-1 text-sm", className)}
    >
      <ol className="flex items-center space-x-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const IconComponent = item.icon;

          return (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground mx-1 flex-shrink-0" />
              )}

              {item.href && !isLast ? (
                <Link
                  to={item.href}
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors duration-200 hover:underline"
                >
                  {IconComponent && (
                    <IconComponent className="h-4 w-4 flex-shrink-0" />
                  )}
                  <span className="truncate">{item.label}</span>
                </Link>
              ) : (
                <span
                  className={cn(
                    "flex items-center gap-1.5",
                    isLast
                      ? "text-foreground font-medium"
                      : "text-muted-foreground"
                  )}
                >
                  {IconComponent && (
                    <IconComponent className="h-4 w-4 flex-shrink-0" />
                  )}
                  <span className="truncate">{item.label}</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export { Breadcrumb };
