import React, { useCallback, useState } from 'react';
import { Trash2, FileText, Home, Settings, Info, HardDrive, Clock, Database } from 'lucide-react';
import { useDeviceStore } from '../store/deviceStore';
import UnifiedLogger from '../components/common/UnifiedLogger';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { PageLayout } from '../components/common/PageLayout';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/Dialog';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Checkbox } from '../components/ui/Checkbox';
import { useToast } from '../hooks/use-toast';

const LogsPage: React.FC = () => {
  const { logs, clearLogs, logStorageConfig, setLogStorageConfig, getLogStorageStats, exportLogs } =
    useDeviceStore();
  const { t } = useTranslation();
  const { toast } = useToast();

  // 配置对话框状态
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [tempConfig, setTempConfig] = useState(logStorageConfig);

  // 获取存储统计信息
  const storageStats = getLogStorageStats();

  const handleExportLogs = useCallback(() => {
    if (logs.length === 0) {
      toast({
        title: t('logs.exportMessages.failed'),
        description: t('logs.exportMessages.noLogs'),
        variant: 'destructive',
      });
      return;
    }

    try {
      const logContent = exportLogs('text');

      // Create download link
      const blob = new Blob([logContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `onekey_logs_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: t('logs.exportMessages.success'),
        description: t('logs.exportMessages.successDesc', { count: logs.length }),
      });
    } catch (error) {
      toast({
        title: t('logs.exportMessages.failed'),
        description: error instanceof Error ? error.message : t('logs.exportMessages.error'),
        variant: 'destructive',
      });
    }
  }, [logs, exportLogs, toast, t]);

  const handleSaveConfig = useCallback(() => {
    setLogStorageConfig(tempConfig);
    setIsConfigOpen(false);

    toast({
      title: t('logs.config.saved'),
      description: t('logs.config.savedDesc'),
    });
  }, [tempConfig, setLogStorageConfig, toast, t]);

  const handleResetConfig = useCallback(() => {
    setTempConfig(logStorageConfig);
  }, [logStorageConfig]);

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 格式化日期
  const formatDate = (dateString?: string): string => {
    if (!dateString) return t('logs.stats.none');
    return new Date(dateString).toLocaleString();
  };

  const breadcrumbItems = [{ label: 'System Logs', icon: FileText }];

  return (
    <PageLayout fixedHeight={true}>
      <div className="min-h-screen bg-background">
        <div className="mx-auto px-6 py-4 space-y-4">
          {/* 面包屑导航 + 操作按钮 */}
          <div className="flex items-center justify-between gap-4">
            <Breadcrumb items={breadcrumbItems} />
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {logs.length} {t('logs.records')}
              </Badge>

              {/* 存储配置对话框 */}
              <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-background border-border text-foreground hover:bg-muted/50"
                  >
                    <Settings className="h-3 w-3 mr-1.5" />
                    {t('logs.configuration')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>{t('logs.storageConfig.title')}</DialogTitle>
                    <DialogDescription>{t('logs.storageConfig.description')}</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="maxEntries">{t('logs.storageConfig.maxEntries')}</Label>
                        <Input
                          id="maxEntries"
                          type="number"
                          value={tempConfig.maxEntries}
                          onChange={e =>
                            setTempConfig({
                              ...tempConfig,
                              maxEntries: parseInt(e.target.value) || 1000,
                            })
                          }
                          min="100"
                          max="10000"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="expirationDays">
                          {t('logs.storageConfig.expirationDays')}
                        </Label>
                        <Input
                          id="expirationDays"
                          type="number"
                          value={tempConfig.expirationDays}
                          onChange={e =>
                            setTempConfig({
                              ...tempConfig,
                              expirationDays: parseInt(e.target.value) || 2,
                            })
                          }
                          min="1"
                          max="30"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxSizeBytes">{t('logs.storageConfig.maxSizeMb')}</Label>
                      <Input
                        id="maxSizeBytes"
                        type="number"
                        value={Math.round(tempConfig.maxSizeBytes / (1024 * 1024))}
                        onChange={e =>
                          setTempConfig({
                            ...tempConfig,
                            maxSizeBytes: (parseInt(e.target.value) || 30) * 1024 * 1024,
                          })
                        }
                        min="1"
                        max="100"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="compressionEnabled"
                        checked={tempConfig.compressionEnabled}
                        onCheckedChange={(checked: boolean) =>
                          setTempConfig({
                            ...tempConfig,
                            compressionEnabled: checked,
                          })
                        }
                      />
                      <Label htmlFor="compressionEnabled">
                        {t('logs.storageConfig.enableCompression')}
                      </Label>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={handleResetConfig}>
                      {t('logs.storageConfig.reset')}
                    </Button>
                    <Button onClick={handleSaveConfig}>{t('logs.storageConfig.save')}</Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Button
                variant="outline"
                size="sm"
                onClick={clearLogs}
                disabled={logs.length === 0}
                className="bg-background border-border text-foreground hover:bg-muted hover:text-muted-foreground hover:border-border/70 disabled:opacity-50"
              >
                <Trash2 className="h-3 w-3 mr-1.5" />
                {t('logs.clear')}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportLogs}
                disabled={logs.length === 0}
                className="bg-background border-border text-foreground hover:bg-muted/50 disabled:opacity-50"
              >
                <FileText className="h-3 w-3 mr-1.5" />
                {t('logs.exportText')}
              </Button>
            </div>
          </div>

          {/* 存储统计信息 */}
          {logs.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-card border border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Database className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium">{t('logs.stats.totalEntries')}</p>
                      <p className="text-lg font-bold">{storageStats.totalEntries}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card border border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <HardDrive className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="text-sm font-medium">{t('logs.stats.storageSize')}</p>
                      <p className="text-lg font-bold">
                        {formatFileSize(storageStats.totalSizeBytes)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card border border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-orange-500" />
                    <div>
                      <p className="text-sm font-medium">{t('logs.stats.oldestRecord')}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(storageStats.oldestEntry)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card border border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Info className="h-4 w-4 text-purple-500" />
                    <div>
                      <p className="text-sm font-medium">{t('logs.stats.newestRecord')}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(storageStats.newestEntry)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 页面描述 */}
          <div>
            <p className="text-sm text-muted-foreground">{t('logs.description')}</p>
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
                  <h3 className="text-lg font-semibold text-foreground mb-2">{t('logs.noLogs')}</h3>
                  <p className="text-muted-foreground mb-6 max-w-md text-sm">
                    {t('logs.noLogsDesc')}
                  </p>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      asChild
                      className="bg-background border-border text-foreground hover:bg-muted/50"
                    >
                      <Link to="/">
                        <Home className="h-4 w-4 mr-2" />
                        {t('common.goHome')}
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      asChild
                      className="bg-background border-border text-foreground hover:bg-muted/50"
                    >
                      <Link to="/device-methods">{t('logs.executeOperation')}</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              /* 日志显示 - 使用统一的UnifiedLogger */
              <div className="h-[calc(100vh-320px)] min-h-[400px]">
                <UnifiedLogger
                  logs={logs}
                  onClearLogs={clearLogs}
                  showFilters={true}
                  showHeader={false}
                  className="h-full"
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
