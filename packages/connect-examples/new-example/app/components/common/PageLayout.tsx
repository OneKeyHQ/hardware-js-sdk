import React from "react";

interface PageLayoutProps {
  children: React.ReactNode;
  className?: string;
  fixedHeight?: boolean;
}

export function PageLayout({
  children,
  className = "",
  fixedHeight = false,
}: PageLayoutProps) {
  return (
    <div
      className={`${
        fixedHeight ? "h-screen overflow-hidden" : "min-h-screen"
      } bg-background ${className}`}
    >
      {children}
    </div>
  );
}
