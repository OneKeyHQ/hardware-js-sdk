import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { PageLayout } from './PageLayout';

interface TemplateRegistryBoundaryProps {
  children: React.ReactNode;
  notFoundMessage?: string;
  checkNotFound?: () => boolean;
}

export const TemplateRegistryBoundary: React.FC<TemplateRegistryBoundaryProps> = ({
  children,
  notFoundMessage = 'The requested resource could not be found.',
  checkNotFound,
}) => {
  // Not Found 检查
  if (checkNotFound && checkNotFound()) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-96">
          <Card className="bg-card border border-orange-200">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-orange-800 mb-2">Not Found</h3>
              <p className="text-muted-foreground">{notFoundMessage}</p>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  // 正常状态，直接渲染子组件（因为现在是同步的，不需要加载状态和错误状态）
  return <>{children}</>;
};
