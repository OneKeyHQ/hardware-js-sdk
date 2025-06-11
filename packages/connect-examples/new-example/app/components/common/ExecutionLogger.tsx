import React, { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Copy, Trash2 } from "lucide-react";
import { useToast } from "../../hooks/use-toast";

// 日志类型定义
export type LogType = "request" | "response" | "hardware" | "error" | "info";

export interface LogEntry {
  id: string;
  timestamp: Date;
  type: LogType;
  title: string;
  content?: string | Record<string, unknown> | null;
  description?: string;
}

interface ExecutionLoggerProps {
  logs: LogEntry[];
  onClearLogs: () => void;
  className?: string;
}

const ExecutionLogger: React.FC<ExecutionLoggerProps> = ({
  logs,
  onClearLogs,
  className = "",
}) => {
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  // 获取日志类型的配置
  const getLogTypeConfig = (type: LogType) => {
    switch (type) {
      case "request":
        return {
          icon: "📋",
          color: "text-blue-600",
          bgColor: "bg-blue-50",
          badge: "bg-blue-100 text-blue-800 border-blue-300",
        };
      case "response":
        return {
          icon: "✅",
          color: "text-green-600",
          bgColor: "bg-green-50",
          badge: "bg-green-100 text-green-800 border-green-300",
        };
      case "hardware":
        return {
          icon: "🔗",
          color: "text-orange-600",
          bgColor: "bg-orange-50",
          badge: "bg-orange-100 text-orange-800 border-orange-300",
        };
      case "error":
        return {
          icon: "❌",
          color: "text-red-600",
          bgColor: "bg-red-50",
          badge: "bg-red-100 text-red-800 border-red-300",
        };
      default:
        return {
          icon: "ℹ️",
          color: "text-gray-600",
          bgColor: "bg-gray-50",
          badge: "bg-gray-100 text-gray-800 border-gray-300",
        };
    }
  };

  // 复制日志内容
  const handleCopyLog = async (log: LogEntry) => {
    try {
      const content = log.content
        ? typeof log.content === "string"
          ? log.content
          : JSON.stringify(log.content, null, 2)
        : log.description || "";

      await navigator.clipboard.writeText(content);
      toast({
        title: "复制成功",
        description: "日志内容已复制到剪贴板",
      });
    } catch (error) {
      toast({
        title: "复制失败",
        description: "无法复制到剪贴板",
        variant: "warning",
      });
    }
  };

  // 格式化时间
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("zh-CN", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <Card className={`bg-card border border-border/50 shadow-sm ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm text-foreground">📋 执行日志</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={onClearLogs}
            disabled={logs.length === 0}
            className="h-7 px-2 text-xs hover:bg-muted"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            清除
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div ref={scrollRef} className="max-h-96 overflow-y-auto space-y-3">
          {logs.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p className="text-sm">暂无日志记录</p>
            </div>
          ) : (
            logs.map((log) => {
              const config = getLogTypeConfig(log.type);
              return (
                <div
                  key={log.id}
                  className={`rounded-lg border p-3 ${config.bgColor} border-border/30`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm">{config.icon}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(log.timestamp)}
                        </span>
                        <Badge className={config.badge} variant="outline">
                          {log.type}
                        </Badge>
                        <span className={`text-sm font-medium ${config.color}`}>
                          {log.title}
                        </span>
                      </div>

                      {log.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {log.description}
                        </p>
                      )}

                      {log.content && (
                        <pre className="text-xs bg-background/50 p-2 rounded border overflow-x-auto">
                          {typeof log.content === "string"
                            ? log.content
                            : JSON.stringify(log.content, null, 2)}
                        </pre>
                      )}
                    </div>

                    {(log.content || log.description) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyLog(log)}
                        className="ml-2 h-6 w-6 p-0 opacity-50 hover:opacity-100"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ExecutionLogger;
