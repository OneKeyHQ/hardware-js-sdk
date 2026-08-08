import { useCallback } from 'react';
import { useDeviceStore } from '../store/deviceStore';
import {
  callHardwareAPI,
  type HardwareApiCallMode,
  type HardwareApiMethod,
} from '../services/hardwareService';
import { resolveLazyParameterValues } from '../utils/parameterUtils';
import type { UnifiedMethodConfig } from '~/data/types';

interface UseHardwareMethodExecutionOptions {
  requireDevice?: boolean;
}

const PROTOCOL_V2_PATH_METHODS = new Set([
  'deviceFirmwareUpdate',
  'pathInfo',
  'dirList',
  'dirMake',
  'dirRemove',
  'fileRead',
  'fileWrite',
  'fileDelete',
  'filesystemPathInfoQuery',
  'filesystemDirList',
  'filesystemDirMake',
  'filesystemDirRemove',
  'filesystemFileRead',
  'filesystemFileWrite',
  'filesystemFileDelete',
]);

function normalizeProtocolV2Path(path: string): string {
  const value = path.trim();
  if (!value || value === '/') return 'vol0:';
  if (value.startsWith('/')) return `vol0:${value.slice(1)}`;
  return value;
}

function getBinarySize(data: unknown): number | undefined {
  if (data instanceof ArrayBuffer) return data.byteLength;
  if (ArrayBuffer.isView(data)) return data.byteLength;
  if (typeof data === 'string') return new TextEncoder().encode(data).byteLength;
  if (data && typeof data === 'object' && 'size' in data) {
    const size = Number((data as { size?: unknown }).size);
    return Number.isFinite(size) ? size : undefined;
  }
  return undefined;
}

function normalizeProtocolV2FileParams(
  method: string,
  params: Record<string, unknown>
): Record<string, unknown> {
  let normalized = params;
  if (PROTOCOL_V2_PATH_METHODS.has(method)) {
    normalized = { ...normalized };
    if (typeof normalized.path === 'string') {
      normalized.path = normalizeProtocolV2Path(normalized.path);
    }
    if (Array.isArray(normalized.targets)) {
      normalized.targets = normalized.targets.map(target => {
        if (!target || typeof target !== 'object') return target;
        const item = target as Record<string, unknown>;
        return {
          ...item,
          ...(typeof item.path === 'string' ? { path: normalizeProtocolV2Path(item.path) } : {}),
        };
      });
    }
  }

  if (method !== 'filesystemFileWrite' && method !== 'fileWrite') return normalized;
  const dataSize = getBinarySize(normalized.data);
  const totalSize = Number(normalized.totalSize);
  if (!dataSize || (Number.isFinite(totalSize) && totalSize > 0)) return normalized;
  return { ...normalized, totalSize: dataSize };
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

      const requiresConnectedDevice = requireDevice && !methodConfig.noConnIdReq;
      if (requiresConnectedDevice && !currentDevice?.connectId) {
        throw new Error('设备未连接');
      }
      if (requiresConnectedDevice && !methodConfig.noDeviceIdReq && !currentDevice?.deviceId) {
        throw new Error('设备尚未返回可用的 deviceId');
      }

      // 构建执行参数
      const executionParams =
        requiresConnectedDevice && currentDevice
          ? {
              connectId: currentDevice.connectId,
              // 只有在方法需要 deviceId 时才传递
              ...(methodConfig.noDeviceIdReq ? {} : { deviceId: currentDevice.deviceId }),
              ...params,
            }
          : params;

      // 调用硬件 API
      const resolvedParams = resolveLazyParameterValues(executionParams);
      const normalizedParams = normalizeProtocolV2FileParams(methodConfig.method, resolvedParams);
      const callMode: HardwareApiCallMode = methodConfig.noConnIdReq
        ? 'params'
        : methodConfig.noDeviceIdReq
        ? 'connectId-params'
        : 'connectId-deviceId-params';

      const result = await callHardwareAPI(
        methodConfig.method as HardwareApiMethod,
        normalizedParams,
        callMode
      );

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
