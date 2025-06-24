import React, { useEffect, useCallback, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../hooks/use-toast';
import { useMethodParameters } from '../../hooks/useMethodParameters';
import { useMethodExecution } from '../../hooks/useMethodExecution';
import { useDeviceInfo } from '../../hooks/useDeviceInfo';
import { useFirmwareProgress } from '../providers/SDKProvider';
import { useDeviceStore } from '../../store/deviceStore';
import type { UnifiedMethodConfig } from '~/data/types';
// 导入子组件
import ParameterInput from './ParameterInput';
import DeviceInteractionArea from './DeviceInteractionArea';
import ExecutionPanel from './ExecutionPanel';

interface MethodExecutorProps {
  methodConfig: UnifiedMethodConfig;
  executionHandler: (params: Record<string, unknown>) => Promise<Record<string, unknown>>;
  onResult?: (result: unknown) => void;
  onError?: (error: string) => void;
  className?: string;
  type?: 'standard' | 'firmware';
}

const MethodExecutor: React.FC<MethodExecutorProps> = ({
  methodConfig,
  executionHandler,
  onResult,
  onError,
  className = '',
  type = 'standard',
}) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { deviceAction: globalDeviceAction, logs: globalLogs } = useDeviceStore();

  // 方法级别的执行日志状态
  const [executionStartTime, setExecutionStartTime] = useState<number | null>(null);

  // 使用新的 Hooks
  const { currentDevice, deviceModel, deviceTheme, isConnected } = useDeviceInfo();
  const { progressData } = useFirmwareProgress();

  // 参数管理
  const {
    selectedPreset,
    executionParameters,
    setParameter,
    selectPreset,
    reset: resetParameters,
  } = useMethodParameters({ methodConfig });

  // 执行状态管理
  const {
    status,
    isCancelling,
    deviceAction,
    execute,
    cancel,
    reset: resetExecution,
    setDeviceAction,
  } = useMethodExecution({
    type,
    onResult,
    onError,
  });

  // 计算当前方法的执行日志（只显示本次执行的日志）
  const currentExecutionLogs = useMemo(() => {
    if (!executionStartTime) {
      return [];
    }

    // 只返回执行开始时间之后的日志
    return globalLogs.filter(log => {
      const logTime =
        typeof log.timestamp === 'string'
          ? new Date(log.timestamp).getTime()
          : log.timestamp.getTime();
      return logTime >= executionStartTime;
    });
  }, [globalLogs, executionStartTime]);

  // 监听全局设备动作状态
  useEffect(() => {
    if (globalDeviceAction.isActive && globalDeviceAction.actionType) {
      setDeviceAction({
        actionType: globalDeviceAction.actionType,
        deviceInfo: globalDeviceAction.deviceInfo,
      });
    }
  }, [globalDeviceAction, setDeviceAction]);

  // 执行方法
  const handleExecute = useCallback(async () => {
    if (!isConnected) {
      toast({
        title: t('components.methodExecutor.deviceNotConnected'),
        description: t('components.methodExecutor.connectDeviceFirst'),
        variant: 'destructive',
      });
      return;
    }

    // 记录执行开始时间，用于过滤当前执行的日志
    setExecutionStartTime(Date.now());

    await execute(executionParameters, executionHandler);
  }, [isConnected, execute, executionParameters, executionHandler, toast, t]);

  // 取消操作
  const handleCancel = useCallback(async () => {
    await cancel(currentDevice?.connectId);
  }, [cancel, currentDevice?.connectId]);

  // 重置状态
  const handleReset = useCallback(async () => {
    if (status === 'loading' || status === 'device-interaction') {
      await handleCancel();
    }
    resetExecution();
    resetParameters();
    // 重置执行开始时间，清空执行日志显示
    setExecutionStartTime(null);
  }, [status, handleCancel, resetExecution, resetParameters]);

  // 清空当前执行日志（只影响显示，不影响全局日志）
  const handleClearExecutionLogs = useCallback(() => {
    setExecutionStartTime(Date.now());
  }, []);

  // 处理参数变化
  const handleParamChange = useCallback(
    (paramName: string, value: unknown) => {
      setParameter(paramName, value);
    },
    [setParameter]
  );

  // 处理参数编辑请求
  const handleRequestParamsEdit = useCallback(
    (data: Record<string, unknown>) => {
      // 批量更新参数
      Object.entries(data).forEach(([key, value]) => {
        setParameter(key, value);
      });
    },
    [setParameter]
  );

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* 参数输入区域 */}
      <div className="flex-shrink-0 mb-3">
        <ParameterInput
          methodConfig={methodConfig}
          selectedPreset={selectedPreset}
          onPresetChange={selectPreset}
          onParamChange={handleParamChange}
        />
      </div>

      {/* 主要内容区域 */}
      <div className="flex-1 min-h-0">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 h-full">
          {/* 左侧：设备交互动效 */}
          <div className="lg:col-span-2 flex flex-col">
            <DeviceInteractionArea
              status={status}
              deviceAction={deviceAction}
              deviceModel={deviceModel}
              deviceTheme={deviceTheme}
              onExecute={handleExecute}
              onReset={handleReset}
              isCancelling={isCancelling}
              firmwareProgress={type === 'firmware' ? progressData : undefined}
              currentDevice={currentDevice}
            />
          </div>

          {/* 右侧：执行面板 */}
          <div className="lg:col-span-3 flex flex-col min-h-0">
            <ExecutionPanel
              requestData={executionParameters}
              onSaveRequest={handleRequestParamsEdit}
              logs={currentExecutionLogs}
              onClearLogs={handleClearExecutionLogs}
              disabled={status === 'loading' || status === 'device-interaction'}
              className="h-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MethodExecutor;
