import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useHardwareStore, convertFilesToArrayBuffers } from '../../store/hardwareStore';
import type { DeviceModel, ThemeType } from '../ui/DeviceActionAnimation';
import { useDeviceStore } from '../../store/deviceStore';
import { useToast } from '../../hooks/use-toast';
import type { MethodConfig, ExecutionStatus, ParameterField } from '~/data/types';
import { UiEvent } from '@onekeyfe/hd-core';
import { PlaygroundProps } from '../../data/components/Playground';
import { useFirmwareProgress } from '../providers/SDKProvider';

// 导入子组件
import ParameterInput from './ParameterInput';
import DeviceInteractionArea from './DeviceInteractionArea';
import ExecutionPanel from './ExecutionPanel';
import { LogEntry, LogType } from './ExecutionLogger';

// 统一的预设类型
interface UnifiedPreset {
  title: string;
  value: Record<string, unknown>;
}

export interface FirmwareMethodExecutorProps {
  methodConfig: MethodConfig | PlaygroundProps;
  executionHandler: (params: Record<string, unknown>) => Promise<Record<string, unknown>>;
  onResult?: (result: unknown) => void;
  onError?: (error: string) => void;
  className?: string;
}

const FirmwareMethodExecutor: React.FC<FirmwareMethodExecutorProps> = ({
  methodConfig,
  executionHandler,
  onResult,
  onError,
  className = '',
}) => {
  const { toast } = useToast();
  const { currentDevice, deviceAction: globalDeviceAction } = useDeviceStore();

  // 获取硬件状态管理器
  const { methodParameters, getExecutionParameters, setMethodParameters, resetMethodParameters } =
    useHardwareStore();

  // 统一获取预设的辅助函数 - 使用 useMemo 缓存
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

  // 使用 useMemo 缓存 allParameters，避免无限渲染
  const allParameters = useMemo((): ParameterField[] => {
    // 获取方法的所有参数，从预设中推断
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
  const [executionLogs, setExecutionLogs] = useState<LogEntry[]>([]);

  // 添加固件进度状态
  const { progressData } = useFirmwareProgress();

  // 初始化参数值 - 使用 useCallback 避免重复创建函数
  const initializeParameters = useCallback(() => {
    console.log('[FirmwareMethodExecutor] 🔄 方法变化，重置参数:', methodConfig.method);

    resetMethodParameters();

    // 自动选择第一个预设
    if (presets && presets.length > 0) {
      const firstPreset = presets[0];
      setSelectedPreset(firstPreset.title);

      // 直接使用预设值
      const presetParams = { ...firstPreset.value };

      console.log('[FirmwareMethodExecutor] 📋 初始化参数:', {
        方法名称: methodConfig.method,
        预设参数: firstPreset.value,
        最终参数: presetParams,
      });

      setMethodParameters(presetParams);
    } else {
      setSelectedPreset(null);
      setMethodParameters({});

      console.log('[FirmwareMethodExecutor] 📋 无预设，使用空参数:', {
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
      console.log('🎯 [FirmwareMethodExecutor] 设备交互开始:', globalDeviceAction.actionType);
      // 添加硬件交互日志
      addLog('hardware', '设备交互开始', `等待设备操作: ${globalDeviceAction.actionType}`);

      setStatus('device-interaction');
      setLocalDeviceAction({
        actionType: globalDeviceAction.actionType,
        deviceInfo: globalDeviceAction.deviceInfo,
      });
    }
  }, [globalDeviceAction, status]);

  // 处理预设选择 - 使用 useCallback 避免重复创建函数
  const handlePresetChange = useCallback(
    (presetTitle: string) => {
      const preset = presets?.find(p => p.title === presetTitle);
      if (preset) {
        setSelectedPreset(presetTitle);

        // 直接使用预设值
        const newParams = { ...preset.value };

        console.log('[FirmwareMethodExecutor] 🔄 切换预设:', {
          预设名称: presetTitle,
          预设参数: preset.value,
          最终参数: newParams,
        });

        setMethodParameters(newParams);
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

  // 执行操作
  const performExecution = async () => {
    try {
      setStatus('loading');
      setIsCancelling(false);
      clearLogs();

      // 获取执行参数
      const rawParams = getExecutionParameters();

      // 转换文件参数为 ArrayBuffer
      const executionParams = await convertFilesToArrayBuffers(rawParams);

      console.log('🚀 [FirmwareMethodExecutor] 开始执行方法:', {
        方法名称: methodConfig.method,
        原始参数: rawParams,
        执行参数: executionParams,
      });

      // 添加请求日志
      addLog('request', '开始执行', `方法: ${methodConfig.method}`);

      const startTime = Date.now();

      // 执行方法
      const result = await executionHandler(executionParams);

      const duration = Date.now() - startTime;

      // 检查执行结果
      if (result.success === false) {
        // 执行失败
        const errorMessage = result.error || '执行失败';

        console.error('❌ [FirmwareMethodExecutor] 方法执行失败:', {
          方法名称: methodConfig.method,
          错误信息: errorMessage,
          耗时: `${duration}ms`,
        });

        // 添加错误日志
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
      console.log('✅ [FirmwareMethodExecutor] 方法执行成功:', {
        方法名称: methodConfig.method,
        执行结果: result,
        耗时: `${duration}ms`,
      });

      // 添加成功日志
      addLog('response', '执行成功', `耗时: ${duration}ms`);

      setStatus('success');
      onResult?.(result);

      toast({
        title: '执行成功',
        description: `方法 "${methodConfig.method}" 执行完成`,
      });
    } catch (error) {
      console.error('❌ [FirmwareMethodExecutor] 方法执行异常:', error);

      const errorMessage = error instanceof Error ? error.message : String(error);

      // 添加错误日志
      addLog('error', '执行异常', errorMessage);

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
      setStatus('idle');
      setLocalDeviceAction(null);
      setIsCancelling(false);
      clearLogs();

      // 重新初始化参数
      initializeParameters();

      console.log('🔄 [FirmwareMethodExecutor] 状态已重置');

      toast({
        title: '状态重置',
        description: '已重置到初始状态',
      });
    } catch (error) {
      console.error('❌ [FirmwareMethodExecutor] 重置失败:', error);
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
      return 'classic'; // 默认值
    }

    const deviceType = currentDevice.deviceType.toString().toLowerCase();
    if (deviceType.includes('classic')) return 'classic';
    if (deviceType.includes('mini')) return 'mini';
    if (deviceType.includes('pro')) return 'pro';
    if (deviceType.includes('touch')) return 'touch';
    return 'classic'; // 默认值
  };

  // 获取设备主题
  const getDeviceTheme = (): ThemeType => {
    // 根据当前主题或设备类型返回合适的主题
    return 'light';
  };

  // 添加日志
  const addLog = (type: LogType, title: string, description?: string) => {
    const logEntry: LogEntry = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      type: type === 'hardware' ? 'info' : (type as LogEntry['type']),
      title,
      content: null,
      description,
    };

    setExecutionLogs(prev => [...prev, logEntry]);
  };

  // 清空日志
  const clearLogs = () => {
    setExecutionLogs([]);
  };

  // 创建兼容的 MethodConfig 对象用于 ParameterInput
  const compatibleMethodConfig: MethodConfig = useMemo(
    () => ({
      method: methodConfig.method,
      description: methodConfig.description,
      presets: presets,
      noDeviceIdReq: 'noDeviceIdReq' in methodConfig ? methodConfig.noDeviceIdReq : false,
    }),
    [methodConfig, presets]
  );

  // 修复 handleParamChange 函数的类型
  const handleParamChange = useCallback(
    (paramName: string, value: unknown) => {
      setMethodParameters({
        ...methodParameters,
        [paramName]: value,
      });
    },
    [methodParameters, setMethodParameters]
  );

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* 参数输入区域 - 压缩高度 */}
      <div className="flex-shrink-0 mb-4">
        <ParameterInput
          methodConfig={compatibleMethodConfig}
          selectedPreset={selectedPreset}
          onPresetChange={handlePresetChange}
          onParamChange={handleParamChange}
        />
      </div>

      {/* 主要内容区域 - 三个模块的网格布局 */}
      <div className="flex-1 min-h-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
          {/* 左侧：设备交互动效 - 固定宽度 */}
          <div className="lg:col-span-4 flex flex-col">
            <DeviceInteractionArea
              status={status}
              deviceAction={localDeviceAction}
              deviceModel={getDeviceModel()}
              deviceTheme={getDeviceTheme()}
              onExecute={executeMethod}
              onReset={handleReset}
              isCancelling={isCancelling}
              firmwareProgress={progressData}
              currentDevice={currentDevice}
            />
          </div>

          {/* 右侧：执行面板（请求参数 + 执行日志） - 填充剩余空间 */}
          <div className="lg:col-span-8 flex flex-col min-h-0">
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

export default FirmwareMethodExecutor;
