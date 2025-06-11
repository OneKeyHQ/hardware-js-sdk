import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import {
  Copy,
  ChevronDown,
  ChevronUp,
  Trash2,
  Edit,
  Check,
} from "lucide-react";
import { useToast } from "../../hooks/use-toast";
import JsonEditor, { JsonEditorRef } from "./JsonEditor";
import type { LogEntry, LogType } from "./ExecutionLogger";

interface ExecutionPanelProps {
  requestData: Record<string, unknown>;
  onSaveRequest: (data: Record<string, unknown>) => void;
  logs: LogEntry[];
  onClearLogs: () => void;
  disabled?: boolean;
  className?: string;
}

const ExecutionPanel: React.FC<ExecutionPanelProps> = ({
  requestData,
  onSaveRequest,
  logs,
  onClearLogs,
  disabled = false,
  className = "",
}) => {
  const { toast } = useToast();
  const [isParamsCollapsed, setIsParamsCollapsed] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const jsonEditorRef = useRef<JsonEditorRef>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  // 复制请求参数
  const handleCopyParams = async () => {
    const success = await jsonEditorRef.current?.copyContent();
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "复制成功",
        description: "请求参数已复制到剪贴板",
      });
    } else {
      toast({
        title: "复制失败",
        description: "无法复制到剪贴板",
        variant: "warning",
      });
    }
  };

  // 编辑请求参数
  const handleEditParams = () => {
    setIsEditing(true);
  };

  // 处理编辑状态变化
  const handleEditingChange = (editing: boolean) => {
    setIsEditing(editing);
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

  // 获取日志类型的配置
  const getLogTypeConfig = (type: LogType) => {
    switch (type) {
      case "request":
        return {
          icon: "📋",
          color: "text-blue-600 dark:text-blue-400",
          bgColor: "bg-blue-50/50 dark:bg-blue-950/20",
          badge:
            "bg-blue-100/80 text-blue-800 border-blue-300/50 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700/50",
        };
      case "response":
        return {
          icon: "✅",
          color: "text-green-600 dark:text-green-400",
          bgColor: "bg-green-50/50 dark:bg-green-950/20",
          badge:
            "bg-green-100/80 text-green-800 border-green-300/50 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700/50",
        };
      case "hardware":
        return {
          icon: "🔗",
          color: "text-blue-600 dark:text-blue-400",
          bgColor: "bg-blue-50/50 dark:bg-blue-950/20",
          badge:
            "bg-blue-100/80 text-blue-800 border-blue-300/50 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700/50",
        };
      case "error":
        return {
          icon: "❌",
          color: "text-red-600 dark:text-red-400",
          bgColor: "bg-red-50/50 dark:bg-red-950/20",
          badge:
            "bg-red-100/80 text-red-800 border-red-300/50 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700/50",
        };
      default:
        return {
          icon: "ℹ️",
          color: "text-muted-foreground",
          bgColor: "bg-muted/20",
          badge: "bg-muted text-muted-foreground border-border",
        };
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
    <Card
      className={`bg-card border border-border/50 shadow-sm flex flex-col h-full ${className}`}
    >
      <CardContent className="p-0 flex flex-col h-full">
        {/* 请求参数区域 - 固定高度 */}
        <div className="border-b border-border/50 flex-shrink-0">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-foreground flex items-center">
                📋 请求参数
              </CardTitle>
              <div className="flex items-center space-x-2">
                {/* 复制按钮 */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyParams}
                  className="h-7 px-2 text-xs hover:bg-primary/10 hover:border-primary/30"
                  disabled={
                    !requestData ||
                    Object.keys(requestData).length === 0 ||
                    disabled
                  }
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 mr-1 text-green-600" />
                      已复制
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" />
                      复制
                    </>
                  )}
                </Button>

                {/* 编辑按钮 */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEditParams}
                  className="h-7 px-2 text-xs hover:bg-primary/10 hover:border-primary/30"
                  disabled={disabled}
                >
                  <Edit className="h-3 w-3 mr-1" />
                  编辑
                </Button>

                {/* 收起按钮 */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsParamsCollapsed(!isParamsCollapsed)}
                  className="h-7 px-2 text-xs"
                >
                  {isParamsCollapsed ? (
                    <>
                      <ChevronDown className="h-3 w-3 mr-1" />
                      展开
                    </>
                  ) : (
                    <>
                      <ChevronUp className="h-3 w-3 mr-1" />
                      收起
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>

          {!isParamsCollapsed && (
            <div className="px-6 pb-4">
              <JsonEditor
                data={requestData}
                onSave={onSaveRequest}
                disabled={disabled}
                isEditing={isEditing}
                onEditingChange={handleEditingChange}
                ref={jsonEditorRef}
              />
            </div>
          )}
        </div>

        {/* 执行日志区域 - 填充剩余空间 */}
        <div className="flex-1 min-h-0 flex flex-col">
          <CardHeader className="pb-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-foreground">
                📋 执行日志
              </CardTitle>
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

          <div className="flex-1 min-h-0 px-6 pb-6">
            <div ref={scrollRef} className="h-full overflow-y-auto space-y-3">
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
                            <span
                              className={`text-sm font-medium ${config.color}`}
                            >
                              {log.title}
                            </span>
                          </div>

                          {log.description && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {log.description}
                            </p>
                          )}

                          {log.content && (
                            <pre className="text-xs bg-muted/30 dark:bg-muted/10 p-2 rounded border border-border/50 overflow-x-auto text-foreground">
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExecutionPanel;
