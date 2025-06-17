import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useHardwareStore, convertFilesToArrayBuffers } from '../../store/hardwareStore';
import type { DeviceModel, ThemeType } from '../ui/DeviceActionAnimation';
import { useDeviceStore } from '../../store/deviceStore';
import { useToast } from '../../hooks/use-toast';
import type { MethodConfig, ExecutionStatus, ParameterField } from '~/data/types';
import { UiEvent } from '@onekeyfe/hd-core';
import { PlaygroundProps } from '../../data/components/Playground';
import { useFirmwareProgress } from '../providers/SDKProvider';
import { cancelHardwareOperation } from '../../services/hardwareService';
// 导入子组件
import ParameterInput from './ParameterInput';
import DeviceInteractionArea from './DeviceInteractionArea';
import ExecutionPanel from './ExecutionPanel';
import { UnifiedLogEntry, LogType } from './UnifiedLogger';

// 统一的预设类型
interface UnifiedPreset {
  title: string;
  value: Record<string, unknown>;
}

// 执行器类型
type ExecutorType = 'standard' | 'firmware';

export interface UnifiedMethodExecutorProps {
  methodConfig: MethodConfig | PlaygroundProps;
  executionHandler: (params: Record<string, unknown>) => Promise<Record<string, unknown>>;
  onResult?: (result: unknown) => void;
  onError?: (error: string) => void;
  className?: string;
  type?: ExecutorType; // 新增：指定执行器类型
}

const UnifiedMethodExecutor: React.FC<UnifiedMethodExecutorProps> = ({
  methodConfig,
  executionHandler,
  onResult,
  onError,
  className = '',
  type = 'standard',
}) => {
  const { toast } = useToast();
  const { currentDevice, deviceAction: globalDeviceAction } = useDeviceStore();

  // 获取硬件状态管理器
  const { methodParameters, getExecutionParameters, setMethodParameters, resetMethodParameters } =
    useHardwareStore();

  // 固件进度状态（仅在firmware类型时使用）
  const { progressData } = useFirmwareProgress();

  // 统一获取预设的辅助函数
  const presets = useMemo((): UnifiedPreset[] => {
    if ('presets' in methodConfig && methodConfig.presets) {
      return methodConfig.presets.map(p => ({
        title: p.title,
        value: p.value,
      }));
    }
    if ('presupposes' in methodConfig && methodConfig.presupposes) {
      return methodConfig.presupposes.map(p => ({
        title: p.title,
        value: p.value,
      }));
    }
    return [];
  }, [methodConfig]);

  // 获取所有参数
  const allParameters = useMemo((): ParameterField[] => {
    if (!presets || presets.length === 0) {
      return [];
    }

    const parameterSet = new Set<string>();
    presets.forEach(preset => {
      Object.keys(preset.value).forEach(key => {
        parameterSet.add(key);
      });
    });

    return Array.from(parameterSet).map(name => {
      // 检查是否为文件参数
      const fileParams = [
        'binary',
        'firmwareFile',
        'bootloaderFile',
        'bleFile',
        'resourceFile',
        'firmwareBinary',
        'bleBinary',
        'bootloaderBinary',
        'resourceBinary',
      ];

      return {
        name,
        type: fileParams.includes(name) ? ('file' as const) : ('string' as const),
        required: false,
        default: undefined,
      };
    });
  }, [presets]);

  // 执行状态
  const [status, setStatus] = useState<ExecutionStatus>('idle');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [localDeviceAction, setLocalDeviceAction] = useState<{
    actionType: UiEvent['type'];
    deviceInfo?: unknown;
  } | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [executionLogs, setExecutionLogs] = useState<UnifiedLogEntry[]>([]);

  // 初始化参数值
  const initializeParameters = useCallback(() => {
    console.log('[UnifiedMethodExecutor] 🔄 方法变化，重置参数:', methodConfig.method);

    resetMethodParameters();

    // 自动选择第一个预设
    if (presets && presets.length > 0) {
      const firstPreset = presets[0];
      setSelectedPreset(firstPreset.title);
      setMethodParameters({ ...firstPreset.value });

      console.log('[UnifiedMethodExecutor] 📋 初始化参数:', {
        方法名称: methodConfig.method,
        预设参数: firstPreset.value,
      });
    } else {
      setSelectedPreset(null);
      setMethodParameters({});

      console.log('[UnifiedMethodExecutor] 📋 无预设，使用空参数:', {
        方法名称: methodConfig.method,
      });
    }
  }, [methodConfig.method, presets, setMethodParameters, resetMethodParameters]);

  // 初始化参数值 - 只在方法变化时执行
  useEffect(() => {
    initializeParameters();
  }, [initializeParameters]);

  // 监听全局设备动作状态
  useEffect(() => {
    if (globalDeviceAction.isActive && globalDeviceAction.actionType) {
      console.log('🎯 [UnifiedMethodExecutor] UI Response:', globalDeviceAction.actionType);

      addLog('hardware', 'UI Response', `设备操作: ${globalDeviceAction.actionType}`, {
        actionType: globalDeviceAction.actionType,
        ...globalDeviceAction.deviceInfo,
      });

      setStatus('device-interaction');
      setLocalDeviceAction({
        actionType: globalDeviceAction.actionType,
        deviceInfo: globalDeviceAction.deviceInfo,
      });
    }
  }, [globalDeviceAction, status]);

  // 处理预设选择
  const handlePresetChange = useCallback(
    (presetTitle: string) => {
      const preset = presets?.find(p => p.title === presetTitle);
      if (preset) {
        setSelectedPreset(presetTitle);
        setMethodParameters({ ...preset.value });

        console.log('[UnifiedMethodExecutor] 🔄 切换预设:', {
          预设名称: presetTitle,
          预设参数: preset.value,
        });
      }
    },
    [presets, setMethodParameters]
  );

  // 验证参数
  const validateParams = (): boolean => {
    for (const param of allParameters) {
      if (param.required && !methodParameters[param.name]) {
        toast({
          title: '参数错误',
          description: `参数 "${param.name}" 是必需的`,
          variant: 'warning',
        });
        return false;
      }
    }
    return true;
  };

  // 执行方法
  const executeMethod = async () => {
    if (!validateParams()) return;
    performExecution();
  };

  // 执行具体操作
  const performExecution = async () => {
    const rawParams = getExecutionParameters();
    let executionParams: Record<string, unknown> = {};

    try {
      setStatus('loading');
      setIsCancelling(false);

      // 根据类型决定是否需要文件转换
      if (type === 'firmware') {
        executionParams = await convertFilesToArrayBuffers(rawParams);
      } else {
        executionParams = rawParams;
      }

      console.log('🚀 [UnifiedMethodExecutor] 开始执行方法:', {
        方法名称: methodConfig.method,
        执行类型: type,
        执行参数: executionParams,
      });

      // 添加请求日志
      addLog('request', '开始执行', `方法: ${methodConfig.method}`, executionParams);

      const startTime = Date.now();
      const result = await executionHandler(executionParams);
      const duration = Date.now() - startTime;

      // 检查执行结果（主要针对firmware类型）
      if (type === 'firmware' && result.success === false) {
        const errorMessage = result.error || '执行失败';

        console.error('❌ [UnifiedMethodExecutor] 方法执行失败:', {
          方法名称: methodConfig.method,
          错误信息: errorMessage,
          耗时: `${duration}ms`,
        });

        addLog('error', '执行失败', JSON.stringify(result));
        setStatus('error');
        onError?.(JSON.stringify(result));

        toast({
          title: '执行失败',
          description: JSON.stringify(result),
          variant: 'destructive',
        });
        return;
      }

      // 执行成功
      console.log('✅ [UnifiedMethodExecutor] 方法执行成功:', {
        方法名称: methodConfig.method,
        执行结果: result,
        耗时: `${duration}ms`,
      });

      addLog('response', '执行成功', `耗时: ${duration}ms`, result);
      setStatus('success');
      onResult?.(result);

      toast({
        title: '执行成功',
        description: `方法 "${methodConfig.method}" 执行完成`,
      });
    } catch (error) {
      console.error('❌ [UnifiedMethodExecutor] 方法执行异常:', error);

      const errorMessage = error instanceof Error ? error.message : String(error);

      addLog('error', '执行异常', errorMessage, {
        error:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
              }
            : error,
        method: methodConfig.method,
        executionParams: executionParams,
      });

      setStatus('error');
      onError?.(errorMessage);

      toast({
        title: '执行异常',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  // 重置状态
  const handleReset = async () => {
    try {
      // 如果当前正在执行中，先调用SDK的cancel方法
      if (status === 'loading' || status === 'device-interaction') {
        setIsCancelling(true);

        console.log('🛑 [UnifiedMethodExecutor] 正在取消硬件操作...');

        // 获取当前设备的connectId
        const connectId = currentDevice?.connectId;

        // 调用SDK的cancel方法
        const cancelResult = await cancelHardwareOperation(connectId);

        if (cancelResult.success) {
          console.log('✅ [UnifiedMethodExecutor] 硬件操作已取消');
          addLog('info', '操作已取消', `设备: ${connectId || '未知'}`, cancelResult.payload);

          toast({
            title: '操作已取消',
            description: '硬件操作已成功取消',
          });
        } else {
          console.warn('⚠️ [UnifiedMethodExecutor] 取消操作失败:', cancelResult.payload);
          addLog(
            'error',
            '取消操作失败',
            cancelResult.payload?.error as string,
            cancelResult.payload
          );
        }
      }

      setStatus('idle');
      setLocalDeviceAction(null);
      setIsCancelling(false);

      initializeParameters();

      console.log('🔄 [UnifiedMethodExecutor] 状态已重置');

      toast({
        title: '状态重置',
        description: '已重置到初始状态',
      });
    } catch (error) {
      console.error('❌ [UnifiedMethodExecutor] 重置失败:', error);
      setIsCancelling(false);
      toast({
        title: '重置失败',
        description: error instanceof Error ? error.message : String(error),
        variant: 'destructive',
      });
    }
  };

  // 处理参数编辑请求
  const handleRequestParamsEdit = (data: Record<string, unknown>) => {
    setMethodParameters(data);
  };

  // 获取设备模型
  const getDeviceModel = (): DeviceModel => {
    if (!currentDevice?.deviceType) {
      return 'classic';
    }

    const deviceType = currentDevice.deviceType.toString().toLowerCase();
    if (deviceType.includes('classic')) return 'classic';
    if (deviceType.includes('mini')) return 'mini';
    if (deviceType.includes('pro')) return 'pro';
    if (deviceType.includes('touch')) return 'touch';
    return 'classic';
  };

  // 获取设备主题
  const getDeviceTheme = (): ThemeType => {
    return 'light';
  };

  // 添加日志
  const addLog = (
    type: LogType,
    title: string,
    description?: string,
    content?: string | Record<string, unknown> | null
  ) => {
    const logEntry: UnifiedLogEntry = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      type: type === 'hardware' ? 'info' : (type as UnifiedLogEntry['type']),
      title,
      content: content || null,
      description,
    };

    setExecutionLogs(prev => [...prev, logEntry]);
  };

  // 清空日志
  const clearLogs = () => {
    setExecutionLogs([]);
  };

  // 处理参数变化
  const handleParamChange = useCallback(
    (paramName: string, value: unknown) => {
      setMethodParameters({
        ...methodParameters,
        [paramName]: value,
      });
    },
    [methodParameters, setMethodParameters]
  );

  // 创建兼容的 MethodConfig 对象
  const compatibleMethodConfig: MethodConfig = useMemo(
    () => ({
      method: methodConfig.method,
      description: methodConfig.description,
      presets: presets,
      noDeviceIdReq: 'noDeviceIdReq' in methodConfig ? methodConfig.noDeviceIdReq : false,
    }),
    [methodConfig, presets]
  );

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* 参数输入区域 */}
      <div className="flex-shrink-0 mb-3">
        <ParameterInput
          methodConfig={compatibleMethodConfig}
          selectedPreset={selectedPreset}
          onPresetChange={handlePresetChange}
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
              deviceAction={localDeviceAction}
              deviceModel={getDeviceModel()}
              deviceTheme={getDeviceTheme()}
              onExecute={executeMethod}
              onReset={handleReset}
              isCancelling={isCancelling}
              firmwareProgress={type === 'firmware' ? progressData : undefined}
              currentDevice={currentDevice}
            />
          </div>

          {/* 右侧：执行面板 */}
          <div className="lg:col-span-3 flex flex-col min-h-0">
            <ExecutionPanel
              requestData={getExecutionParameters()}
              onSaveRequest={handleRequestParamsEdit}
              logs={executionLogs}
              onClearLogs={clearLogs}
              disabled={status === 'loading' || status === 'device-interaction'}
              className="h-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedMethodExecutor;
