import { Alert, AlertDescription } from '../ui/Alert';
import DeviceActionAnimation from '../ui/DeviceActionAnimation';
import { CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import type { DeviceModel, ThemeType } from '../ui/DeviceActionAnimation';

export type ExecutionStatus = 'idle' | 'loading' | 'device-interaction' | 'success' | 'error';

interface ExecutionStatusProps {
  status: ExecutionStatus;
  result?: unknown;
  error?: string | null;
  deviceModel?: DeviceModel;
  deviceTheme?: ThemeType;
  className?: string;
}

export function ExecutionStatus({
  status,
  result,
  error,
  deviceModel = 'classic',
  deviceTheme = 'light',
  className = '',
}: ExecutionStatusProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'loading':
        return {
          variant: 'default' as const,
          icon: Loader2,
          title: '正在执行',
          description: '请等待方法执行完成',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50/50',
          borderColor: 'border-blue-200/50',
          animate: true,
        };
      case 'device-interaction':
        return {
          variant: 'default' as const,
          icon: Loader2,
          title: '设备交互',
          description: '请在设备上确认操作',
          color: 'text-orange-600',
          bgColor: 'bg-orange-50/50',
          borderColor: 'border-orange-200/50',
          animate: true,
        };
      case 'success':
        return {
          variant: 'default' as const,
          icon: CheckCircle,
          title: '执行成功',
          description: '方法已成功执行',
          color: 'text-green-600',
          bgColor: 'bg-green-50/50',
          borderColor: 'border-green-200/50',
          animate: false,
        };
      case 'error':
        return {
          variant: 'warning' as const,
          icon: AlertTriangle,
          title: '执行失败',
          description: error || '执行过程中发生错误',
          color: 'text-red-600',
          bgColor: 'bg-red-50/50',
          borderColor: 'border-red-200/50',
          animate: false,
        };
      default:
        return null;
    }
  };

  const statusConfig = getStatusConfig();
  if (!statusConfig || status === 'idle') {
    return null;
  }

  const {
    icon: IconComponent,
    title,
    description,
    color,
    bgColor,
    borderColor,
    animate,
  } = statusConfig;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 状态提示 */}
      <Alert className={`${bgColor} ${borderColor} border`}>
        <IconComponent className={`h-4 w-4 ${color} ${animate ? 'animate-spin' : ''}`} />
        <AlertDescription>
          <div className={`font-medium ${color} text-sm`}>{title}</div>
          <div className={`text-xs mt-0.5 ${color}/80`}>{description}</div>
        </AlertDescription>
      </Alert>

      {/* 设备动画 */}
      {(status === 'loading' || status === 'device-interaction') && (
        <div className="flex justify-center">
          <DeviceActionAnimation deviceModel={deviceModel} action="ui-button" theme={deviceTheme} />
        </div>
      )}

      {/* 成功结果显示 */}
      {status === 'success' && result && (
        <div className="mt-4">
          <h4 className="font-medium text-foreground mb-2 text-sm">执行结果：</h4>
          <div className="bg-muted/30 rounded-lg p-3 overflow-x-auto border border-border/50">
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-words">
              {(() => {
                if (typeof result === 'string') {
                  return result;
                }
                try {
                  return JSON.stringify(result, null, 2);
                } catch {
                  return String(result);
                }
              })()}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
