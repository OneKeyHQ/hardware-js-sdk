import React, { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useDeviceStore } from "../../store/deviceStore";
import { LogEntry } from "../../types/hardware";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Badge } from "../ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/Select";
import {
  Search,
  Filter,
  Trash2,
  Copy,
  Download,
  Info,
  AlertCircle,
  Send,
  Inbox,
  FileText,
} from "lucide-react";

interface LogDisplayProps {
  title?: string;
  showFilters?: boolean;
  showHeader?: boolean;
  maxHeight?: string;
}

const LogDisplay: React.FC<LogDisplayProps> = ({
  title,
  showFilters = true,
  showHeader = true,
  maxHeight = "h-96",
}) => {
  const { t } = useTranslation();
  const { logs, clearLogs } = useDeviceStore();
  const [filter, setFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const handleClearLogs = useCallback(() => {
    clearLogs();
    // 清除日志后重置过滤器，避免混乱
    setFilter("all");
    setSearchTerm("");
  }, [clearLogs]);

  const handleCopyLog = (log: LogEntry) => {
    const logText = `[${log.timestamp}] [${log.type.toUpperCase()}] ${
      log.message
    }${log.data ? "\n" + JSON.stringify(log.data, null, 2) : ""}`;
    navigator.clipboard.writeText(logText);
  };

  const handleExportLogs = () => {
    const exportData = filteredAndSearchedLogs.map((log) => ({
      timestamp: log.timestamp,
      type: log.type,
      message: log.message,
      data: log.data,
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `logs-${new Date().toISOString().slice(0, 19)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatTimestamp = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleTimeString("zh-CN", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getLogClass = (type: string): string => {
    switch (type) {
      case "info":
        return "bg-blue-50/80 text-blue-700 border-blue-200/60 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800/50";
      case "error":
        return "bg-orange-50/80 text-orange-700 border-orange-200/60 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-800/50";
      case "request":
        return "bg-purple-50/80 text-purple-700 border-purple-200/60 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800/50";
      case "response":
        return "bg-green-50/80 text-green-700 border-green-200/60 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800/50";
      default:
        return "bg-gray-50/80 text-gray-700 border-gray-200/60 dark:bg-gray-950/30 dark:text-gray-300 dark:border-gray-800/50";
    }
  };

  const getLogIcon = (type: string) => {
    switch (type) {
      case "info":
        return <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      case "error":
        return (
          <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
        );
      case "request":
        return (
          <Send className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        );
      case "response":
        return <Inbox className="h-4 w-4 text-green-600 dark:text-green-400" />;
      default:
        return (
          <FileText className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        );
    }
  };

  // 过滤和搜索日志 - 优化性能和稳定性
  const filteredAndSearchedLogs = useMemo(() => {
    if (!logs || logs.length === 0) return [];

    return logs
      .filter((log) => {
        // 确保log对象有效
        if (!log || !log.type || !log.message) return false;

        // 类型过滤
        const typeMatch = filter === "all" || log.type === filter;

        // 搜索过滤
        const searchMatch =
          searchTerm === "" ||
          log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (log.data &&
            JSON.stringify(log.data)
              .toLowerCase()
              .includes(searchTerm.toLowerCase()));

        return typeMatch && searchMatch;
      })
      .reverse(); // 最新的日志在前面
  }, [logs, filter, searchTerm]);

  // 日志统计 - 优化计算
  const logStats = useMemo(() => {
    if (!logs || logs.length === 0) {
      return {
        all: 0,
        info: 0,
        error: 0,
        request: 0,
        response: 0,
      };
    }

    const stats = {
      all: logs.length,
      info: 0,
      error: 0,
      request: 0,
      response: 0,
    };

    logs.forEach((log) => {
      if (
        log &&
        log.type &&
        Object.prototype.hasOwnProperty.call(stats, log.type)
      ) {
        stats[log.type as keyof typeof stats]++;
      }
    });
    return stats;
  }, [logs]);

  // 重置过滤器的处理函数
  const handleFilterChange = useCallback(
    (newFilter: string) => {
      setFilter(newFilter);
      // 如果切换到新类型且没有结果，可以考虑清除搜索
      if (newFilter !== "all" && searchTerm) {
        const hasResults = logs.some(
          (log) =>
            log.type === newFilter &&
            log.message.toLowerCase().includes(searchTerm.toLowerCase())
        );
        if (!hasResults) {
          setSearchTerm("");
        }
      }
    },
    [logs, searchTerm]
  );

  return (
    <Card className="h-full flex flex-col bg-card border border-border/50 shadow-sm">
      {showHeader && (
        <CardHeader className="pb-4 space-y-4">
          {/* 标题行 */}
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5 text-muted-foreground" />
              {title || t("logDisplay.title")}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {filteredAndSearchedLogs.length} / {logs.length}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportLogs}
                disabled={filteredAndSearchedLogs.length === 0}
                className="bg-background border-border text-foreground hover:bg-muted/50"
              >
                <Download className="h-3 w-3 mr-1.5" />
                导出
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearLogs}
                disabled={logs.length === 0}
                className="bg-background border-border text-foreground hover:bg-muted hover:text-muted-foreground hover:border-border/70"
              >
                <Trash2 className="h-3 w-3 mr-1.5" />
                {t("logDisplay.clear")}
              </Button>
            </div>
          </div>

          {/* 搜索和过滤行 */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* 搜索框 */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="搜索日志内容、类型或数据..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background border-border"
              />
            </div>

            {/* 类型过滤 */}
            {showFilters && (
              <Select value={filter} onValueChange={handleFilterChange}>
                <SelectTrigger className="w-full sm:w-48 bg-background border-border">
                  <SelectValue placeholder="选择日志类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有类型 ({logStats.all})</SelectItem>
                  <SelectItem value="info">
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      信息 ({logStats.info})
                    </div>
                  </SelectItem>
                  <SelectItem value="request">
                    <div className="flex items-center gap-2">
                      <Send className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      请求 ({logStats.request})
                    </div>
                  </SelectItem>
                  <SelectItem value="response">
                    <div className="flex items-center gap-2">
                      <Inbox className="h-4 w-4 text-green-600 dark:text-green-400" />
                      响应 ({logStats.response})
                    </div>
                  </SelectItem>
                  <SelectItem value="error">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      错误 ({logStats.error})
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
      )}

      {/* 仅搜索和过滤行（当showHeader=false时） */}
      {!showHeader && (showFilters || searchTerm !== "") && (
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* 搜索框 */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="搜索日志内容、类型或数据..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background border-border"
              />
            </div>

            {/* 类型过滤 */}
            {showFilters && (
              <Select value={filter} onValueChange={handleFilterChange}>
                <SelectTrigger className="w-full sm:w-48 bg-background border-border">
                  <SelectValue placeholder="选择日志类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有类型 ({logStats.all})</SelectItem>
                  <SelectItem value="info">
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      信息 ({logStats.info})
                    </div>
                  </SelectItem>
                  <SelectItem value="request">
                    <div className="flex items-center gap-2">
                      <Send className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      请求 ({logStats.request})
                    </div>
                  </SelectItem>
                  <SelectItem value="response">
                    <div className="flex items-center gap-2">
                      <Inbox className="h-4 w-4 text-green-600 dark:text-green-400" />
                      响应 ({logStats.response})
                    </div>
                  </SelectItem>
                  <SelectItem value="error">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      错误 ({logStats.error})
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
      )}

      <CardContent className="flex-1 overflow-hidden p-0">
        <div className={`${maxHeight} overflow-y-auto px-6 pb-6`}>
          {filteredAndSearchedLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <div className="w-12 h-12 bg-muted/20 rounded-full flex items-center justify-center mb-3">
                <Search className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">
                {searchTerm ? "未找到匹配的日志" : t("logDisplay.noLogs")}
              </p>
              {searchTerm && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setSearchTerm("")}
                  className="mt-2"
                >
                  清除搜索
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAndSearchedLogs.map((log: LogEntry) => (
                <div
                  key={log.id}
                  className={`p-4 text-sm border rounded-lg transition-all hover:shadow-sm ${getLogClass(
                    log.type
                  )}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* 日志头部 */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center justify-center">
                          {getLogIcon(log.type)}
                        </div>
                        <Badge variant="outline" className="text-xs font-mono">
                          {log.type.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-mono">
                          {formatTimestamp(log.timestamp)}
                        </span>
                      </div>

                      {/* 日志消息 */}
                      <p className="text-foreground leading-relaxed mb-2">
                        {log.message}
                      </p>

                      {/* 日志数据 */}
                      {log.data && (
                        <div className="mt-3">
                          <pre className="p-3 text-xs bg-muted/50 rounded border overflow-x-auto font-mono">
                            {typeof log.data === "string"
                              ? log.data
                              : JSON.stringify(log.data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>

                    {/* 复制按钮 */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyLog(log)}
                      className="shrink-0 h-8 w-8 p-0 hover:bg-background/80"
                      title="复制日志"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default LogDisplay;
