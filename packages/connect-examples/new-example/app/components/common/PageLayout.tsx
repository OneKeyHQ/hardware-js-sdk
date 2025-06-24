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
        fixedHeight ? 'h-full flex flex-col' : 'h-full overflow-y-auto p-4'
      } bg-background ${className}`}
    >
      {fixedHeight ? (
        <div className="flex-1 overflow-y-auto min-h-0">{children}</div>
      ) : (
        <div className="mx-auto max-w-full">{children}</div>
      )}
    </div>
  );
}
