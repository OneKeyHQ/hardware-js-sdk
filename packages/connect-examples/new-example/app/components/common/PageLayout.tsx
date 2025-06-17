import React from 'react';

interface PageLayoutProps {
  children: React.ReactNode;
  className?: string;
  fixedHeight?: boolean;
}

export function PageLayout({ children, className = '', fixedHeight = false }: PageLayoutProps) {
  return (
    <div
      className={`${
        fixedHeight ? 'h-full overflow-hidden' : 'h-full overflow-y-auto p-4'
      } bg-background ${className}`}
    >
      {fixedHeight ? children : <div className="mx-auto max-w-full">{children}</div>}
    </div>
  );
}
