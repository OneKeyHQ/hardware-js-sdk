import React from 'react';
import { TemplateRegistryBoundary } from './TemplateRegistryBoundary';

interface MethodExecuteBoundaryProps {
  children: React.ReactNode;
  methodName?: string;
  basePath: string;
  baseLabel: string;
  baseIcon: React.ComponentType<{ className?: string }>;
  checkNotFound: () => boolean;
}

export const MethodExecuteBoundary: React.FC<MethodExecuteBoundaryProps> = ({
  children,
  checkNotFound,
}) => {
  return (
    <TemplateRegistryBoundary checkNotFound={checkNotFound}>{children}</TemplateRegistryBoundary>
  );
};
