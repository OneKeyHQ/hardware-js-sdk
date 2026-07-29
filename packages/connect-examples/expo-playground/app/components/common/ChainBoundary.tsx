import React from "react";
import { Layers } from "lucide-react";
import { TemplateRegistryBoundary } from "./TemplateRegistryBoundary";

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
  const breadcrumbs = [
    { label: "Blockchain Methods", href: "/chains", icon: Layers },
    {
      label: chainId || "Loading...",
      icon: () => <div className="w-4 h-4 bg-muted rounded" />,
    },
  ];

  return (
    <TemplateRegistryBoundary
      loadingMessage="Loading Chain"
      loadingSubtitle="Preparing blockchain methods..."
      loadingBreadcrumbs={breadcrumbs}
      notFoundTitle="Chain Not Found"
      notFoundMessage="The requested blockchain could not be found."
      checkNotFound={checkNotFound}
    >
      {children}
    </TemplateRegistryBoundary>
  );
};
