import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { ChevronDown, ChevronUp, Edit, Copy } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import JsonEditor, { JsonEditorRef } from './JsonEditor';
import UnifiedLogger, { UnifiedLogEntry } from './UnifiedLogger';

interface ExecutionPanelProps {
  requestData: Record<string, unknown>;
  onSaveRequest: (data: Record<string, unknown>) => void;
  logs: UnifiedLogEntry[];
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
  className = '',
}) => {
  const { toast } = useToast();
  const [isParamsCollapsed, setIsParamsCollapsed] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const jsonEditorRef = useRef<JsonEditorRef>(null);

  // 复制请求参数
  const handleCopyParams = async () => {
    const success = await jsonEditorRef.current?.copyContent();
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: '复制成功',
        description: '请求参数已复制到剪贴板',
      });
    } else {
      toast({
        title: '复制失败',
        description: '无法复制到剪贴板',
        variant: 'destructive',
      });
    }
  };

  // 处理编辑状态变化
  const handleEditingChange = (editing: boolean) => {
    setIsEditing(editing);
  };

  return (
    <div className={`flex flex-col gap-3 h-full ${className}`}>
      {/* 上部：请求参数编辑区域 - 紧凑设计 */}
      <Card className="bg-card border border-border/50 shadow-sm flex-shrink-0">
        <CardHeader className="pb-2 pt-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Edit className="h-3.5 w-3.5" />
              请求参数
            </CardTitle>
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsParamsCollapsed(!isParamsCollapsed)}
                className="h-6 px-1.5 text-xs"
              >
                {isParamsCollapsed ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronUp className="h-3 w-3" />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyParams}
                disabled={disabled}
                className="h-6 px-2 text-xs"
              >
                <Copy className="h-3 w-3 mr-1" />
                {copied ? '已复制' : '复制'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                disabled={disabled}
                className="h-6 px-2 text-xs"
              >
                <Edit className="h-3 w-3 mr-1" />
                编辑
              </Button>
            </div>
          </div>
        </CardHeader>
        {!isParamsCollapsed && (
          <CardContent className="pt-0 pb-3">
            <JsonEditor
              ref={jsonEditorRef}
              data={requestData}
              onSave={onSaveRequest}
              disabled={disabled}
              isEditing={isEditing}
              onEditingChange={handleEditingChange}
            />
          </CardContent>
        )}
      </Card>

      {/* 下部：执行日志区域 - 占据剩余空间 */}
      <div className="flex-1 min-h-0">
        <UnifiedLogger logs={logs} onClearLogs={onClearLogs} className="h-full" title="执行日志" />
      </div>
    </div>
  );
};

export default ExecutionPanel;
