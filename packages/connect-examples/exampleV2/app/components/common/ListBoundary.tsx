import React from 'react';
import { useTranslation } from 'react-i18next';
import { TemplateRegistryBoundary } from './TemplateRegistryBoundary';

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

export const ListBoundary: React.FC<ListBoundaryProps> = ({ children, title, icon }) => {
  const { t } = useTranslation();
  const breadcrumbs: BreadcrumbItem[] = [{ label: title, icon }];

  return (
    <TemplateRegistryBoundary
      loadingMessage={`Loading ${title}`}
      loadingSubtitle={t('components.listBoundary.preparingData')}
      loadingBreadcrumbs={breadcrumbs}
      notFoundTitle={t('components.listBoundary.dataNotFound')}
      notFoundMessage={t('components.listBoundary.noDataAvailable')}
      // 列表页面通常不需要 checkNotFound，因为空列表是正常状态
    >
      {children}
    </TemplateRegistryBoundary>
  );
};
