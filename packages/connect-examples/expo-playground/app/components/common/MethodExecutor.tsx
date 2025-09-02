import React, { useEffect, useCallback, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../hooks/use-toast';
import { useMethodParameters } from '../../hooks/useMethodParameters';
import { useMethodExecution } from '../../hooks/useMethodExecution';
import { useDeviceInfo } from '../../hooks/useDeviceInfo';
import { useFirmwareProgress } from '../providers/SDKProvider';
import { useDeviceStore } from '../../store/deviceStore';
import { useHardwareStore } from '../../store/hardwareStore';
import { separateParameters } from '../../utils/parameterUtils';
import type { UnifiedMethodConfig } from '~/data/types';
import type { CommonParametersState } from '../../store/hardwareStore';
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

  // 使用 hardwareStore 获取完整的执行参数（包含通用参数）
  const {
    executionParameters: storeExecutionParameters,
    getExecutionParameters,
    setMethodParameters,
  } = useHardwareStore();

  // 方法级别的执行日志状态
  const [executionStartTime, setExecutionStartTime] = useState<number | null>(null);

  // 使用新的 Hooks
  const { currentDevice, deviceModel, deviceTheme, isConnected } = useDeviceInfo();
  const { progressData, reset: resetFirmwareProgress } = useFirmwareProgress();

  // 参数管理
  const {
    selectedPreset,
    parameters: methodParams,
    setParameter,
    selectPreset,
    reset: resetParameters,
  } = useMethodParameters({ methodConfig });

  // 同步 useMethodParameters 的参数到 hardwareStore
  useEffect(() => {
    if (Object.keys(methodParams).length > 0) {
      setMethodParameters(methodParams);
    }
  }, [methodParams, setMethodParameters]);

  // 处理预设选择
  const handlePresetChange = useCallback(
    (presetTitle: string) => {
      selectPreset(presetTitle);
      // 预设选择后，参数会通过上面的 useEffect 自动同步到 hardwareStore
    },
    [selectPreset]
  );

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

    // 使用 hardwareStore 的完整执行参数（包含通用参数）
    const finalExecutionParams = getExecutionParameters();
    await execute(finalExecutionParams, executionHandler);
  }, [isConnected, execute, getExecutionParameters, executionHandler, toast, t]);

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

    // 如果是固件更新，重置固件进度状态
    if (type === 'firmware') {
      resetFirmwareProgress();
    }
  }, [status, handleCancel, resetExecution, resetParameters, type, resetFirmwareProgress]);

  // 清空当前执行日志（只影响显示，不影响全局日志）
  const handleClearExecutionLogs = useCallback(() => {
    setExecutionStartTime(Date.now());
  }, []);

  // 处理参数变化
  const handleParamChange = useCallback(
    (paramName: string, value: unknown) => {
      // 同时更新 useMethodParameters 和 hardwareStore
      setParameter(paramName, value); // 这会更新 useMethodParameters 的本地状态

      // 直接从 store 获取 setCommonParameter 和 setMethodParameter
      const { setCommonParameter, setMethodParameter } = useHardwareStore.getState();

      const commonParamNames = ['useEmptyPassphrase', 'passphraseState', 'deriveCardano']; // 定义通用参数名

      if (commonParamNames.includes(paramName)) {
        setCommonParameter(paramName as keyof CommonParametersState, value); // 更新通用参数
      } else {
        setMethodParameter(paramName, value); // 更新方法参数
      }
    },
    [setParameter] // 依赖项只需 setParameter，因为 setCommonParameter/setMethodParameter 是从 getState() 获取的
  );

  // 处理参数编辑请求
  const handleRequestParamsEdit = useCallback(
    (data: Record<string, unknown>) => {
      // 使用统一的参数处理工具分离和处理参数
      const { methodParams, commonParams } = separateParameters(data);

      // 同步方法参数到 useMethodParameters
      Object.entries(methodParams).forEach(([key, value]) => {
        setParameter(key, value);
      });

      // 批量更新到 hardwareStore
      if (Object.keys(methodParams).length > 0) {
        setMethodParameters(methodParams);
      }

      // 如果有通用参数，需要单独处理
      if (Object.keys(commonParams).length > 0) {
        // 这里需要调用 hardwareStore 的 setCommonParameters
        const { setCommonParameters } = useHardwareStore.getState();
        setCommonParameters(commonParams);
      }
    },
    [setParameter, setMethodParameters]
  );

  return (
    <div className={`flex flex-col ${className}`}>
      {/* 参数输入区域 - 紧凑布局 */}
      <div className="flex-shrink-0 mb-2">
        <ParameterInput
          methodConfig={methodConfig}
          selectedPreset={selectedPreset}
          onPresetChange={handlePresetChange}
          onParamChange={handleParamChange}
        />
      </div>

      {/* 主要内容区域 - 紧凑高度 */}
      <div className="w-full min-h-[380px] h-full">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 h-full">
          {/* 左侧：设备交互动效 */}
          <div className="lg:col-span-2 flex flex-col h-full min-h-0">
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
          <div className="lg:col-span-3 flex flex-col h-full min-h-0">
            <ExecutionPanel
              requestData={storeExecutionParameters}
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
