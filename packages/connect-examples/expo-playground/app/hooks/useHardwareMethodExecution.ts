import { useCallback } from 'react';
import { useDeviceStore } from '../store/deviceStore';
import { callHardwareAPI } from '../services/hardwareService';
import type { UnifiedMethodConfig } from '~/data/types';

interface UseHardwareMethodExecutionOptions {
  requireDevice?: boolean;
}

export function useHardwareMethodExecution({
  requireDevice = true,
}: UseHardwareMethodExecutionOptions = {}) {
  const { currentDevice } = useDeviceStore();

  const executeMethod = useCallback(
    async (
      params: Record<string, unknown>,
      methodConfig: UnifiedMethodConfig
    ): Promise<Record<string, unknown>> => {
      if (!methodConfig) {
        throw new Error('方法配置未找到');
      }

      if (requireDevice && !currentDevice) {
        throw new Error('设备未连接');
      }

      // 构建执行参数
      const executionParams =
        requireDevice && currentDevice
          ? {
              connectId: currentDevice.connectId,
              // 只有在方法需要 deviceId 时才传递
              ...(methodConfig.noDeviceIdReq ? {} : { deviceId: currentDevice.deviceId }),
              ...params,
            }
          : params;

      // 调用硬件 API
      const result = await callHardwareAPI(methodConfig.method, executionParams);

      if (result.success) {
        return {
          success: true,
          data: result.payload,
        };
      } else {
        throw new Error(result.payload?.error || '执行失败');
      }
    },
    [currentDevice, requireDevice]
  );

  return {
    executeMethod,
    canExecute: !requireDevice || !!currentDevice,
    currentDevice,
  };
}
