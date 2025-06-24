import React from 'react';
import { useTranslation } from 'react-i18next';
import { TemplateRegistryBoundary } from './TemplateRegistryBoundary';

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
  const { t } = useTranslation();
  const breadcrumbs: BreadcrumbItem[] = [
    { label: baseLabel, href: basePath, icon: baseIcon },
    { label: methodName || t('components.methodExecuteBoundary.loadingDefault'), icon: baseIcon },
  ];

  return (
    <TemplateRegistryBoundary
      loadingMessage={t('components.methodExecuteBoundary.loadingMethod')}
      loadingSubtitle={t('components.methodExecuteBoundary.preparingExecution')}
      loadingBreadcrumbs={breadcrumbs}
      notFoundTitle={t('components.methodExecuteBoundary.methodNotFound')}
      notFoundMessage={t('components.methodExecuteBoundary.methodNotFoundDesc')}
      checkNotFound={checkNotFound}
    >
      {children}
    </TemplateRegistryBoundary>
  );
};
