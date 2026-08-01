import React from 'react';

interface PageLayoutProps {
  children: React.ReactNode;
  className?: string;
  fixedHeight?: boolean;
}

export function PageLayout({ children, className = '', fixedHeight = false }: PageLayoutProps) {
  if (fixedHeight) {
    return (
      <div className={`h-full flex flex-col bg-background ${className}`}>
        <div className="flex-1 overflow-y-auto min-h-0">{children}</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-background ${className}`}>
      <div className="w-full">{children}</div>
    </div>
  );
}
