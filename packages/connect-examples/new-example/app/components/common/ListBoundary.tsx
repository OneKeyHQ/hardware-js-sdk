import React from "react";
import { TemplateRegistryBoundary } from "./TemplateRegistryBoundary";

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }> | (() => React.ReactNode);
}

interface ListBoundaryProps {
  children: React.ReactNode;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const ListBoundary: React.FC<ListBoundaryProps> = ({
  children,
  title,
  icon,
}) => {
  const breadcrumbs: BreadcrumbItem[] = [{ label: title, icon }];

  return (
    <TemplateRegistryBoundary
      loadingMessage={`Loading ${title}`}
      loadingSubtitle="Preparing data..."
      loadingBreadcrumbs={breadcrumbs}
      notFoundTitle="Data Not Found"
      notFoundMessage="No data available."
      // 列表页面通常不需要 checkNotFound，因为空列表是正常状态
    >
      {children}
    </TemplateRegistryBoundary>
  );
};
