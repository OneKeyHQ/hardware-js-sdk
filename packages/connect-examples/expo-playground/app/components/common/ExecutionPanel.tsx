import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { ChevronDown, ChevronUp, Edit, Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
        title: t('components.executionPanel.copySuccess'),
        description: t('components.executionPanel.copySuccessDesc'),
      });
    } else {
      toast({
        title: t('components.executionPanel.copyFailed'),
        description: t('components.executionPanel.copyFailedDesc'),
        variant: 'destructive',
      });
    }
  };

  // 处理编辑状态变化
  const handleEditingChange = (editing: boolean) => {
    setIsEditing(editing);
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* 上部：请求参数编辑区域 - 内联编辑 */}
      <Card className="bg-card border border-border/50 shadow-sm">
        <CardHeader className="py-2 px-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-1">
              <Edit className="h-3 w-3" />
              {t('components.executionPanel.requestParameters')}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsParamsCollapsed(!isParamsCollapsed)}
                className="h-7 px-1 text-xs"
              >
                {isParamsCollapsed ? (
                  <ChevronDown className="h-2.5 w-2.5" />
                ) : (
                  <ChevronUp className="h-2.5 w-2.5" />
                )}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopyParams}
                disabled={disabled}
                className="h-7 px-2 text-xs bg-green-50 text-green-700 hover:bg-green-100 border-green-100"
              >
                <Copy className="h-2.5 w-2.5 mr-0.5" />
                {copied ? t('common.copied') : t('common.copy')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(prev => !prev)}
                disabled={disabled}
                className="h-7 px-2 text-xs bg-sky-50 text-sky-700 hover:bg-sky-100 border-sky-100"
              >
                <Edit className="h-2.5 w-2.5 mr-0.5" />
                {isEditing ? t('common.cancel') : t('common.edit')}
              </Button>
              {!isEditing ? null : (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => jsonEditorRef.current?.copyContent()}
                  disabled={disabled}
                  className="h-5 px-1.5 text-xs"
                >
                  {t('common.copy')}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        {!isParamsCollapsed && (
          <CardContent className="pt-0 pb-2 px-2">
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
        <UnifiedLogger
          logs={logs}
          onClearLogs={onClearLogs}
          className="h-full"
          title={t('components.executionPanel.executionLogs')}
        />
      </div>
    </div>
  );
};

export default ExecutionPanel;
