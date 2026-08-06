import React from 'react';
import { TemplateRegistryBoundary } from './TemplateRegistryBoundary';

interface ChainBoundaryProps {
  children: React.ReactNode;
  chainId?: string;
  checkNotFound: () => boolean;
}

export const ChainBoundary: React.FC<ChainBoundaryProps> = ({
  children,
  chainId,
  checkNotFound,
}) => {
  return (
    <TemplateRegistryBoundary
      notFoundMessage={`The requested blockchain${
        chainId ? ` (${chainId})` : ''
      } could not be found.`}
      checkNotFound={checkNotFound}
    >
      {children}
    </TemplateRegistryBoundary>
  );
};
