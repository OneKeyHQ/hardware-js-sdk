import React from 'react';
import { useTranslation } from 'react-i18next';
import { TemplateRegistryBoundary } from './TemplateRegistryBoundary';

interface ListBoundaryProps {
  children: React.ReactNode;
}

export const ListBoundary: React.FC<ListBoundaryProps> = ({ children }) => {
  const { t } = useTranslation();

  return (
    <TemplateRegistryBoundary
      notFoundMessage={t('components.listBoundary.noDataAvailable')}
      // 列表页面通常不需要 checkNotFound，因为空列表是正常状态
    >
      {children}
    </TemplateRegistryBoundary>
  );
};
