import React from "react";
import { Card, CardContent } from "../ui/Card";
import { PageLayout } from "./PageLayout";
import { LoadingSpinner } from "./LoadingSpinner";
import { Breadcrumb } from "../ui/Breadcrumb";
import { useTranslation } from "react-i18next";
import { useTemplateRegistry } from "~/hooks/useTemplateRegistry";

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }> | (() => React.ReactNode);
}

interface TemplateRegistryBoundaryProps {
  children: React.ReactNode;
  loadingMessage?: string;
  loadingSubtitle?: string;
  loadingBreadcrumbs?: BreadcrumbItem[];
  notFoundTitle?: string;
  notFoundMessage?: string;
  checkNotFound?: () => boolean;
}

export const TemplateRegistryBoundary: React.FC<
  TemplateRegistryBoundaryProps
> = ({
  children,
  loadingMessage = "Loading",
  loadingSubtitle = "Please wait...",
  loadingBreadcrumbs = [],
  notFoundTitle = "Not Found",
  notFoundMessage = "The requested resource could not be found.",
  checkNotFound,
}) => {
  const { t } = useTranslation();
  const { isInitialLoading, error, isFullyReady } = useTemplateRegistry();

  // 加载状态
  if (isInitialLoading) {
    return (
      <PageLayout>
        <div className="min-h-screen bg-background">
          <div className="mx-auto px-6 py-4">
            {/* 面包屑导航（静态显示） */}
            {loadingBreadcrumbs.length > 0 && (
              <div className="mb-8">
                <Breadcrumb items={loadingBreadcrumbs} />
              </div>
            )}

            <LoadingSpinner
              variant="centered"
              message={loadingMessage}
              subtitle={loadingSubtitle}
            />
          </div>
        </div>
      </PageLayout>
    );
  }

  // 错误状态
  if (error) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-96">
          <Card className="bg-card border border-orange-200">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-orange-800 mb-2">
                {t("common.loadError")}
              </h3>
              <p className="text-muted-foreground">{error}</p>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  // Not Found 检查
  if (isFullyReady && checkNotFound && checkNotFound()) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-96">
          <Card className="bg-card border border-orange-200">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-orange-800 mb-2">
                {notFoundTitle}
              </h3>
              <p className="text-muted-foreground">{notFoundMessage}</p>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  // 正常状态，渲染子组件
  return <>{children}</>;
};
