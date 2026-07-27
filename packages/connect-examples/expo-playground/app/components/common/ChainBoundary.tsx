import React from 'react';
import { TemplateRegistryBoundary } from './TemplateRegistryBoundary';

interface ChainBoundaryProps {
  children: React.ReactNode;
  checkNotFound: () => boolean;
}

export const ChainBoundary: React.FC<ChainBoundaryProps> = ({
  children,
  checkNotFound,
}) => {
  return (
    <TemplateRegistryBoundary
      notFoundMessage="The requested blockchain could not be found."
      checkNotFound={checkNotFound}
    >
      {children}
    </TemplateRegistryBoundary>
  );
};
