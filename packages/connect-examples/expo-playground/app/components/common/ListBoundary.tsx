import React from 'react';
import { TemplateRegistryBoundary } from './TemplateRegistryBoundary';

interface ListBoundaryProps {
  children: React.ReactNode;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const ListBoundary: React.FC<ListBoundaryProps> = ({ children, title }) => {
  return (
    <TemplateRegistryBoundary
      notFoundMessage={`No data is available for ${title}.`}
      // 列表页面通常不需要 checkNotFound，因为空列表是正常状态
    >
      {children}
    </TemplateRegistryBoundary>
  );
};
