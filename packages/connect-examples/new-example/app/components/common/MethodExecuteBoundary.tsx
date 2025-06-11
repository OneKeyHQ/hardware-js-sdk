import React from "react";
import { TemplateRegistryBoundary } from "./TemplateRegistryBoundary";

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }> | (() => React.ReactNode);
}

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
  methodName,
  basePath,
  baseLabel,
  baseIcon,
  checkNotFound,
}) => {
  const breadcrumbs: BreadcrumbItem[] = [
    { label: baseLabel, href: basePath, icon: baseIcon },
    { label: methodName || "Loading...", icon: baseIcon },
  ];

  return (
    <TemplateRegistryBoundary
      loadingMessage="Loading Method"
      loadingSubtitle="Preparing method execution..."
      loadingBreadcrumbs={breadcrumbs}
      notFoundTitle="Method Not Found"
      notFoundMessage="The requested method could not be found."
      checkNotFound={checkNotFound}
    >
      {children}
    </TemplateRegistryBoundary>
  );
};
