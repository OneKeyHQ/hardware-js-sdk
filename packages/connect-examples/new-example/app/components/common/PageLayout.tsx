import React from 'react';

interface PageLayoutProps {
  children: React.ReactNode;
  className?: string;
  fixedHeight?: boolean;
}

export function PageLayout({ children, className = '', fixedHeight = false }: PageLayoutProps) {
  return (
    <div className={`${fixedHeight ? 'h-full flex flex-col' : ''} bg-background ${className}`}>
      {fixedHeight ? (
        <div className="flex-1 overflow-y-auto min-h-0">{children}</div>
      ) : (
        <div className="w-full">{children}</div>
      )}
    </div>
  );
}
