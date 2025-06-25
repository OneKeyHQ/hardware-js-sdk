import { useState, useEffect, useCallback, useMemo } from 'react';
import type { UnifiedMethodConfig, MethodPreset } from '~/data/types';

interface UseMethodParametersOptions {
  methodConfig: UnifiedMethodConfig;
  autoInitialize?: boolean;
}

interface UseMethodParametersReturn {
  // 状态
  parameters: Record<string, unknown>;
  selectedPreset: string | null;

  // 操作
  setParameter: (key: string, value: unknown) => void;
  setParameters: (params: Record<string, unknown>) => void;
  selectPreset: (presetTitle: string) => void;
  reset: () => void;

  // 计算属性
  presets: MethodPreset[];
  hasPresets: boolean;
  executionParameters: Record<string, unknown>;
}

export function useMethodParameters({
  methodConfig,
  autoInitialize = true,
}: UseMethodParametersOptions): UseMethodParametersReturn {
  // 基础状态
  const [parameters, setParametersState] = useState<Record<string, unknown>>({});
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  // 预设值 - 使用 useMemo 确保引用稳定
  const presets = useMemo(() => methodConfig.presets || [], [methodConfig.presets]);
  const hasPresets = presets.length > 0;

  // 初始化参数
  const initializeParameters = useCallback(() => {
    const initialParams: Record<string, unknown> = {};

    // 应用第一个预设值（如果存在）
    if (hasPresets) {
      const firstPreset = presets[0];
      setSelectedPreset(firstPreset.title);

      // 从预设的参数中提取值
      if (firstPreset.parameters) {
        firstPreset.parameters.forEach(param => {
          if (param.value !== undefined) {
            // 对于 bundle 参数，需要解析 JSON 字符串
            if (param.name === 'bundle' && typeof param.value === 'string') {
              try {
                initialParams[param.name] = JSON.parse(param.value);
              } catch (error) {
                console.error('Failed to parse bundle JSON:', error);
                initialParams[param.name] = param.value;
              }
            } else {
              initialParams[param.name] = param.value;
            }
          }
        });
      }
    } else {
      setSelectedPreset(null);
    }

    setParametersState(initialParams);
  }, [presets, hasPresets]);

  // 自动初始化
  useEffect(() => {
    if (autoInitialize) {
      initializeParameters();
    }
  }, [initializeParameters, autoInitialize]);

  // 操作函数
  const setParameter = useCallback((key: string, value: unknown) => {
    setParametersState(prev => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const setParameters = useCallback((newParams: Record<string, unknown>) => {
    setParametersState(newParams);
  }, []);

  const selectPreset = useCallback(
    (presetTitle: string) => {
      const preset = presets.find(p => p.title === presetTitle);
      if (preset) {
        setSelectedPreset(presetTitle);

        // 从预设的参数中提取值
        const presetParams: Record<string, unknown> = {};
        if (preset.parameters) {
          preset.parameters.forEach(param => {
            if (param.value !== undefined) {
              // 对于 bundle 参数，需要解析 JSON 字符串
              if (param.name === 'bundle' && typeof param.value === 'string') {
                try {
                  presetParams[param.name] = JSON.parse(param.value);
                } catch (error) {
                  console.error('Failed to parse bundle JSON:', error);
                  presetParams[param.name] = param.value;
                }
              } else {
                presetParams[param.name] = param.value;
              }
            }
          });
        }

        setParametersState(presetParams);
      }
    },
    [presets]
  );

  const reset = useCallback(() => {
    initializeParameters();
  }, [initializeParameters]);

  // 计算执行参数 - 过滤空值
  const executionParameters = useMemo(() => {
    return Object.fromEntries(
      Object.entries(parameters).filter(([, value]) => {
        return value !== null && value !== undefined && value !== '';
      })
    );
  }, [parameters]);

  return {
    // 状态
    parameters,
    selectedPreset,

    // 操作
    setParameter,
    setParameters,
    selectPreset,
    reset,

    // 计算属性
    presets,
    hasPresets,
    executionParameters,
  };
}
