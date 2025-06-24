import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  useMethodParameters as useMethodParametersStore,
  useMethodPresets,
} from '../store/methodStore';
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
  // 使用 methodStore 进行持久化
  const { saveParameters, getParameters } = useMethodParametersStore(methodConfig.method);
  const { setLastPreset, getLastPreset } = useMethodPresets(methodConfig.method);

  // 基础状态
  const [parameters, setParametersState] = useState<Record<string, unknown>>({});
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  // 预设值 - 使用 useMemo 确保引用稳定
  const presets = useMemo(() => methodConfig.presets || [], [methodConfig.presets]);
  const hasPresets = presets.length > 0;

  // 初始化参数
  const initializeParameters = useCallback(() => {
    // 首先尝试从 store 中获取保存的参数
    const savedParams = getParameters();
    const lastPreset = getLastPreset();

    let initialParams: Record<string, unknown> = {};
    let presetToSelect: string | null = null;

    // 如果有保存的参数，优先使用
    if (Object.keys(savedParams).length > 0) {
      initialParams = savedParams;
      presetToSelect = lastPreset;
    } else if (hasPresets) {
      // 否则使用第一个预设值
      const firstPreset = presets[0];
      presetToSelect = firstPreset.title;

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
    }

    setParametersState(initialParams);
    setSelectedPreset(presetToSelect);
  }, [presets, hasPresets, getParameters, getLastPreset]);

  // 自动初始化
  useEffect(() => {
    if (autoInitialize) {
      initializeParameters();
    }
  }, [initializeParameters, autoInitialize]);

  // 操作函数
  const setParameter = useCallback(
    (key: string, value: unknown) => {
      setParametersState(prev => {
        const newParams = {
          ...prev,
          [key]: value,
        };

        // 自动保存到 store
        saveParameters(newParams);
        return newParams;
      });
    },
    [saveParameters]
  );

  const setParameters = useCallback(
    (newParams: Record<string, unknown>) => {
      setParametersState(newParams);
      // 保存到 store
      saveParameters(newParams);
    },
    [saveParameters]
  );

  const selectPreset = useCallback(
    (presetTitle: string) => {
      const preset = presets.find(p => p.title === presetTitle);
      if (preset) {
        setSelectedPreset(presetTitle);
        // 保存最后选择的预设
        setLastPreset(presetTitle);

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
        // 保存到 store
        saveParameters(presetParams);
      }
    },
    [presets, setLastPreset, saveParameters]
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
