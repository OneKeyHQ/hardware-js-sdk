import React, { useState, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';
import {
  Copy,
  Trash2,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Info,
  AlertCircle,
  Send,
  Inbox,
  FileText,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../hooks/use-toast';
import CollapsibleJsonViewer from './CollapsibleJsonViewer';

// 兼容现有的日志类型定义
export type LogType = 'request' | 'response' | 'hardware' | 'error' | 'info';

// 统一的日志条目接口，兼容两种格式
export interface UnifiedLogEntry {
  id: string;
  timestamp: Date | string;
  type: LogType;
  title?: string;
  message?: string;
  content?: string | Record<string, unknown> | null;
  data?: Record<string, unknown>;
  description?: string;
}

interface UnifiedLoggerProps {
  logs: UnifiedLogEntry[];
  onClearLogs: () => void;
  title?: string;
  showFilters?: boolean;
  showHeader?: boolean;
  className?: string;
  externalSearchTerm?: string;
  externalFilter?: string;
}

// 内容处理组件
const SmartContentDisplay: React.FC<{
  content: string | Record<string, unknown> | null;
  type: LogType;
  title: string;
}> = ({ content }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { t } = useTranslation();

  if (!content) return null;

  // 如果是字符串，直接显示
  if (typeof content === 'string') {
    const lines = content.split('\n');
    if (lines.length <= 3) {
      return (
        <pre className="text-xs bg-muted/30 dark:bg-muted/20 p-2 rounded-md whitespace-pre-wrap break-words min-w-0 overflow-hidden">
          {content}
        </pre>
      );
    }
    // 对于长字符串，使用简单的折叠显示
    const previewContent = lines.slice(0, 3).join('\n') + (lines.length > 3 ? '\n...' : '');

    return (
      <div className="space-y-1">
        <pre className="text-xs bg-muted/30 dark:bg-muted/20 p-2 rounded-md whitespace-pre-wrap break-words min-w-0 overflow-hidden">
          {isExpanded ? content : previewContent}
        </pre>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-5 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-3 w-3 mr-1" />
              {t('components.unifiedLogger.collapseLines', { count: lines.length })}
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3 mr-1" />
              {t('components.unifiedLogger.expandLines', { count: lines.length })}
            </>
          )}
        </Button>
      </div>
    );
  }

  // 使用新的JSON查看器
  return (
    <div className="bg-muted/30 dark:bg-muted/20 p-2 rounded-md min-w-0 overflow-hidden">
      <CollapsibleJsonViewer data={content} maxDepth={2} />
    </div>
  );
};

const UnifiedLogger: React.FC<UnifiedLoggerProps> = ({
  logs,
  onClearLogs,
  title = '执行日志',
  showFilters = false,
  showHeader = true,
  className = '',
  externalSearchTerm = '',
  externalFilter = '',
}) => {
  const { toast } = useToast();
  const internalScrollRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const { t } = useTranslation();

  // 获取日志类型的配置
  const getLogTypeConfig = (type: LogType) => {
    switch (type) {
      case 'request':
        return {
          icon: <Send className="h-3 w-3" />,
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-50 dark:bg-blue-950/30',
          badge:
            'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700',
        };
      case 'response':
        return {
          icon: <Inbox className="h-3 w-3" />,
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-50 dark:bg-green-950/30',
          badge:
            'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700',
        };
      case 'hardware':
        return {
          icon: <FileText className="h-3 w-3" />,
          color: 'text-purple-600 dark:text-purple-400',
          bgColor: 'bg-purple-50 dark:bg-purple-950/30',
          badge:
            'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 border-purple-300 dark:border-purple-700',
        };
      case 'error':
        return {
          icon: <AlertCircle className="h-3 w-3" />,
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-50 dark:bg-red-950/30',
          badge:
            'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700',
        };
      case 'info':
      default:
        return {
          icon: <Info className="h-3 w-3" />,
          color: 'text-gray-600 dark:text-gray-400',
          bgColor: 'bg-gray-50 dark:bg-gray-950/30',
          badge:
            'bg-gray-100 dark:bg-gray-900/50 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-700',
        };
    }
  };

  // 标准化日志条目
  const normalizeLogEntry = (log: UnifiedLogEntry) => {
    const timestamp = typeof log.timestamp === 'string' ? new Date(log.timestamp) : log.timestamp;
    const title = log.title || log.message || 'Unknown';
    const content = log.content || log.data || null;

    return {
      ...log,
      timestamp,
      title,
      content,
    };
  };

  // 预处理日志数据，缓存标准化结果
  const normalizedLogs = useMemo(() => {
    return logs.map(log => {
      const normalizedLog = normalizeLogEntry(log);
      return {
        ...log,
        normalizedTitle: normalizedLog.title,
        normalizedContent: normalizedLog.content,
        normalizedTimestamp: normalizedLog.timestamp,
        // 预计算搜索字符串以提高搜索性能
        searchableText: [
          normalizedLog.title,
          log.description || '',
          log.message || '',
          typeof normalizedLog.content === 'string'
            ? normalizedLog.content
            : normalizedLog.content
            ? JSON.stringify(normalizedLog.content)
            : '',
        ]
          .join(' ')
          .toLowerCase(),
      };
    });
  }, [logs]);

  // 过滤和排序日志（倒序：最新的在顶部）
  const filteredLogs = useMemo(() => {
    // 使用外部搜索词或内部搜索词
    const effectiveSearchTerm = (externalSearchTerm || searchTerm).toLowerCase().trim();

    let result = normalizedLogs;

    // 应用类型过滤（优先使用外部过滤器）
    const effectiveFilter = externalFilter || filter;
    if (effectiveFilter !== 'all') {
      result = result.filter(log => log.type === effectiveFilter);
    }

    // 应用搜索过滤
    if (effectiveSearchTerm) {
      result = result.filter(log => log.searchableText.includes(effectiveSearchTerm));
    }

    // 排序：倒序，最新的在顶部
    return result.sort((a, b) => {
      const timestampA = typeof a.timestamp === 'string' ? new Date(a.timestamp) : a.timestamp;
      const timestampB = typeof b.timestamp === 'string' ? new Date(b.timestamp) : b.timestamp;
      return timestampB.getTime() - timestampA.getTime();
    });
  }, [normalizedLogs, filter, searchTerm, externalSearchTerm, externalFilter]);

  // 复制日志内容
  const handleCopyLog = async (log: UnifiedLogEntry) => {
    try {
      const normalizedLog = normalizeLogEntry(log);
      const content = normalizedLog.content
        ? typeof normalizedLog.content === 'string'
          ? normalizedLog.content
          : JSON.stringify(normalizedLog.content, null, 2)
        : '';

      const logText = `[${normalizedLog.timestamp.toLocaleString()}] [${log.type.toUpperCase()}] ${
        normalizedLog.title
      }\n${log.description || ''}\n${content}`;

      await navigator.clipboard.writeText(logText);
      toast({
        title: t('components.unifiedLogger.logsCopied'),
        description: t('components.unifiedLogger.logsCopiedDesc'),
      });
    } catch (error) {
      toast({
        title: t('components.unifiedLogger.copyLogsFailed'),
        description: t('components.unifiedLogger.copyLogsFailedDesc'),
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className={`${className} bg-card border border-border/50 shadow-sm flex flex-col h-full`}>
      {showHeader && (
        <CardHeader className="py-2 px-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {title}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {filteredLogs.length} {t('components.unifiedLogger.records')}
              </Badge>
              <Button
                variant="destructive"
                size="sm"
                onClick={onClearLogs}
                disabled={logs.length === 0}
                className="h-7 px-2 text-xs"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                {t('common.clear')}
              </Button>
            </div>
          </div>

          {showFilters && (
            <div className="flex items-center gap-2 pt-2">
              {/* 只有在没有外部搜索时才显示内部搜索框 */}
              {!externalSearchTerm && (
                <div className="flex-1 relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input
                    placeholder={t('components.unifiedLogger.searchLogs')}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-7 h-7 text-xs"
                  />
                </div>
              )}
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-24 h-7 text-xs">
                  <Filter className="h-3 w-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('components.unifiedLogger.all')}</SelectItem>
                  <SelectItem value="request">{t('components.unifiedLogger.request')}</SelectItem>
                  <SelectItem value="response">{t('components.unifiedLogger.response')}</SelectItem>
                  <SelectItem value="hardware">{t('components.unifiedLogger.hardware')}</SelectItem>
                  <SelectItem value="error">{t('common.error')}</SelectItem>
                  <SelectItem value="info">{t('components.unifiedLogger.info')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardHeader>
      )}

      <CardContent className="p-0 flex flex-col flex-1 min-h-0 relative">
        <div ref={internalScrollRef} className="flex-1 min-h-0 overflow-y-auto p-3">
          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {logs.length === 0
                  ? t('components.unifiedLogger.noLogs')
                  : t('components.unifiedLogger.noMatchingLogs')}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* 移除虚拟化，直接渲染所有日志项 */}
              {filteredLogs.map(log => {
                const config = getLogTypeConfig(log.type);
                return (
                  <div
                    key={log.id}
                    className={`${config.bgColor} border border-border/30 rounded-lg p-2 space-y-1.5`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Badge
                          className={`${config.badge} text-xs px-1.5 py-0.5 flex items-center gap-1`}
                        >
                          {config.icon}
                          {log.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {log.normalizedTimestamp.toLocaleString()}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyLog(log)}
                        className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>

                    <div className="space-y-0.5">
                      <h4 className={`text-xs font-medium ${config.color}`}>
                        {log.normalizedTitle}
                      </h4>
                      {log.description && (
                        <p className="text-xs text-muted-foreground">{log.description}</p>
                      )}
                    </div>

                    {log.normalizedContent && (
                      <SmartContentDisplay
                        content={log.normalizedContent}
                        type={log.type}
                        title={log.normalizedTitle}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default UnifiedLogger;
