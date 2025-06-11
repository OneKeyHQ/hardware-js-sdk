import React, { useCallback } from "react";
import { Download, Trash2, FileText, Home } from "lucide-react";
import { useDeviceStore } from "../store/deviceStore";
import LogDisplay from "../components/common/LogDisplay";
import { Button } from "../components/ui/Button";
import { Card, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Breadcrumb } from "../components/ui/Breadcrumb";
import { PageLayout } from "../components/common/PageLayout";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const LogsPage: React.FC = () => {
  const { logs, clearLogs } = useDeviceStore();
  const { t } = useTranslation();

  const handleExportLogs = useCallback(() => {
    if (logs.length === 0) {
      return;
    }

    // Format logs for export
    const logText = logs
      .map(
        (log) =>
          `[${log.timestamp}] [${log.type.toUpperCase()}] ${log.message}${
            log.data ? "\n" + JSON.stringify(log.data, null, 2) : ""
          }`
      )
      .join("\n\n");

    // Create download link
    const blob = new Blob([logText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `onekey_logs_${new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/:/g, "-")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [logs]);

  const breadcrumbItems = [{ label: "System Logs", icon: FileText }];

  return (
    <PageLayout>
      <div className="min-h-screen bg-background">
        <div className="mx-auto px-6 py-4 space-y-4">
          {/* 面包屑导航 + 操作按钮 */}
          <div className="flex items-center justify-between gap-4">
            <Breadcrumb items={breadcrumbItems} />
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {logs.length} {t("logs.records")}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={clearLogs}
                disabled={logs.length === 0}
                className="bg-background border-border text-foreground hover:bg-muted hover:text-muted-foreground hover:border-border/70 disabled:opacity-50"
              >
                <Trash2 className="h-3 w-3 mr-1.5" />
                {t("logs.clear")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportLogs}
                disabled={logs.length === 0}
                className="bg-background border-border text-foreground hover:bg-muted/50 disabled:opacity-50"
              >
                <Download className="h-3 w-3 mr-1.5" />
                {t("logs.export")}
              </Button>
            </div>
          </div>

          {/* 页面描述 */}
          <div>
            <p className="text-sm text-muted-foreground">
              {t("logs.description")}
            </p>
          </div>

          {/* 主要内容 */}
          <div>
            {logs.length === 0 ? (
              /* 空状态 */
              <Card className="bg-card border border-border/50 shadow-sm">
                <CardContent className="py-16 flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mb-6">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {t("logs.noLogs")}
                  </h3>
                  <p className="text-muted-foreground mb-6 max-w-md text-sm">
                    {t("logs.noLogsDesc")}
                  </p>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      asChild
                      className="bg-background border-border text-foreground hover:bg-muted/50"
                    >
                      <Link to="/">
                        <Home className="h-4 w-4 mr-2" />
                        {t("common.goHome")}
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      asChild
                      className="bg-background border-border text-foreground hover:bg-muted/50"
                    >
                      <Link to="/device-methods">
                        {t("logs.executeOperation")}
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              /* 日志显示 - 使用优化后的LogDisplay */
              <div className="h-[calc(100vh-220px)] min-h-[500px]">
                <LogDisplay
                  showFilters={true}
                  showHeader={false}
                  maxHeight="h-full"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default LogsPage;
