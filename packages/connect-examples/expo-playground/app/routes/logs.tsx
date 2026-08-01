import React, { useCallback, useState } from 'react';
import { Trash2, FileText, Home, Settings, Search, Filter } from 'lucide-react';
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

  // 搜索和过滤状态
  const [searchTerm, setSearchTerm] = useState('');
  const [logTypeFilter, setLogTypeFilter] = useState('all');

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

  const breadcrumbItems = [{ label: 'System Logs', icon: FileText }];

  return (
    <PageLayout fixedHeight={true}>
      <div className="flex-1 flex flex-col space-y-4 min-h-0 w-full">
        {/* 面包屑导航 + 操作按钮 */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Breadcrumb items={breadcrumbItems} />
            {logs.length > 0 && (
              <Badge
                variant="outline"
                className="text-xs bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
              >
                {formatFileSize(storageStats.totalSizeBytes)}
              </Badge>
            )}
          </div>
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

        {/* 搜索和过滤区域 */}
        {logs.length > 0 && (
          <Card className="bg-card border border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder={t('logs.searchPlaceholder')}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <select
                    value={logTypeFilter}
                    onChange={e => setLogTypeFilter(e.target.value)}
                    className="px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="all">{t('components.unifiedLogger.all')}</option>
                    <option value="request">{t('components.unifiedLogger.request')}</option>
                    <option value="response">{t('components.unifiedLogger.response')}</option>
                    <option value="hardware">{t('components.unifiedLogger.hardware')}</option>
                    <option value="error">{t('common.error')}</option>
                    <option value="info">{t('components.unifiedLogger.info')}</option>
                  </select>
                </div>
                <div className="text-sm text-muted-foreground">
                  {logs.length} {t('logs.records')}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {/* 主要内容 - 填充剩余高度 */}
        <div className="flex-1 min-h-0 relative">
          {logs.length === 0 ? (
            /* 空状态 */
            <Card className="bg-card border border-border/50 shadow-sm h-full">
              <CardContent className="h-full flex flex-col items-center justify-center text-center">
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
            /* 日志显示 - 使用统一的UnifiedLogger，填充全部高度 */
            <UnifiedLogger
              logs={logs}
              onClearLogs={clearLogs}
              showFilters={true}
              showHeader={false}
              className="h-full"
              externalSearchTerm={searchTerm}
              externalFilter={logTypeFilter}
            />
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export default LogsPage;
