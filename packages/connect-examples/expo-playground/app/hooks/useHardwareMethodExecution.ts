import { useCallback } from 'react';
import {
  getDeviceBLEFirmwareVersion,
  getDeviceBootloaderVersion,
  getDeviceFirmwareVersion,
} from '@onekeyfe/hd-core';
import { useDeviceStore } from '../store/deviceStore';
import { callHardwareAPI } from '../services/hardwareService';
import { SDKUtils } from '../utils/hardwareInstance';
import { resolveLazyParameterValues } from '../utils/parameterUtils';
import type { UnifiedMethodConfig } from '~/data/types';
import type { DeviceInfo } from '../types/hardware';
import type { Features } from '@onekeyfe/hd-core';

interface UseHardwareMethodExecutionOptions {
  requireDevice?: boolean;
}

interface FirmwareVersionInfo {
  bootloaderVersion?: string;
  firmwareVersion?: string;
  bleVersion?: string;
}

const FIRMWARE_UPDATE_METHODS = new Set([
  'firmwareUpdateV2',
  'firmwareUpdateV3',
  'firmwareUpdateV4',
  'deviceFirmwareUpdate',
  'deviceUpdateBootloader',
]);

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

function getProtocolV2FileWriteDataSize(data: unknown): number | undefined {
  if (data instanceof ArrayBuffer) return data.byteLength;
  if (ArrayBuffer.isView(data)) return data.byteLength;
  if (data && typeof data === 'object' && 'size' in data) {
    const size = Number((data as { size?: unknown }).size);
    return Number.isFinite(size) ? size : undefined;
  }
  if (typeof data === 'string') return new TextEncoder().encode(data).byteLength;
  return undefined;
}

function normalizeProtocolV2FileParams(
  method: string,
  params: Record<string, unknown>
): Record<string, unknown> {
  let normalizedParams = params;

  if (PROTOCOL_V2_PATH_METHODS.has(method)) {
    normalizedParams = { ...normalizedParams };
    if (typeof normalizedParams.path === 'string') {
      normalizedParams.path = normalizeProtocolV2Path(normalizedParams.path);
    }

    if (Array.isArray(normalizedParams.targets)) {
      normalizedParams.targets = normalizedParams.targets.map(target => {
        if (!target || typeof target !== 'object') return target;
        const item = target as Record<string, unknown>;
        return {
          ...item,
          ...(typeof item.path === 'string' ? { path: normalizeProtocolV2Path(item.path) } : {}),
        };
      });
    }
  }

  if (method !== 'filesystemFileWrite' && method !== 'fileWrite') return normalizedParams;

  const dataSize = getProtocolV2FileWriteDataSize(normalizedParams.data);
  if (!dataSize) return normalizedParams;

  const totalSize = Number(normalizedParams.totalSize);
  if (Number.isFinite(totalSize) && totalSize > 0) return normalizedParams;

  return {
    ...normalizedParams,
    totalSize: dataSize,
  };
}

function hasFirmwareVersionInfo(versions: FirmwareVersionInfo): boolean {
  return Boolean(versions.bootloaderVersion || versions.firmwareVersion || versions.bleVersion);
}

function getFirmwareVersionsFromPayload(payload: unknown): FirmwareVersionInfo | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const data = payload as Record<string, unknown>;
  const versions = {
    bootloaderVersion:
      typeof data.bootloaderVersion === 'string' ? data.bootloaderVersion : undefined,
    firmwareVersion: typeof data.firmwareVersion === 'string' ? data.firmwareVersion : undefined,
    bleVersion: typeof data.bleVersion === 'string' ? data.bleVersion : undefined,
  };

  return hasFirmwareVersionInfo(versions) ? versions : undefined;
}

function getFirmwareVersionsFromFeatures(features?: Features): FirmwareVersionInfo | undefined {
  if (!features) return undefined;

  const versions = {
    bootloaderVersion: getDeviceBootloaderVersion(features)?.join('.'),
    firmwareVersion: getDeviceFirmwareVersion(features)?.join('.'),
    bleVersion: getDeviceBLEFirmwareVersion(features)?.join('.'),
  };

  return hasFirmwareVersionInfo(versions) ? versions : undefined;
}

export function useHardwareMethodExecution({
  requireDevice = true,
}: UseHardwareMethodExecutionOptions = {}) {
  const { currentDevice, setCurrentDevice, setDeviceFeatures } = useDeviceStore();

  const refreshCurrentDeviceInfo = useCallback(async (): Promise<DeviceInfo | null> => {
    if (!currentDevice?.connectId) return currentDevice;

    const sdk = await SDKUtils.getInstance();
    const featuresResult = await sdk.getFeatures(currentDevice.connectId);
    if (!featuresResult.success || !featuresResult.payload) {
      return currentDevice;
    }

    let onekeyFeatures = currentDevice.onekeyFeatures;
    try {
      const onekeyFeaturesResult = await sdk.getOnekeyFeatures(currentDevice.connectId);
      if (onekeyFeaturesResult.success && onekeyFeaturesResult.payload) {
        onekeyFeatures = onekeyFeaturesResult.payload;
      }
    } catch (error) {
      console.warn('刷新 OneKey features 失败:', error);
    }

    const updatedDevice = {
      ...currentDevice,
      features: featuresResult.payload,
      onekeyFeatures,
    };

    setDeviceFeatures(featuresResult.payload);
    setCurrentDevice(updatedDevice);

    return updatedDevice;
  }, [currentDevice, setCurrentDevice, setDeviceFeatures]);

  const executeMethod = useCallback(
    async (
      params: Record<string, unknown>,
      methodConfig: UnifiedMethodConfig
    ): Promise<Record<string, unknown>> => {
      if (!methodConfig) {
        throw new Error('方法配置未找到');
      }

      const needsConnectedDevice = requireDevice && !methodConfig.noConnIdReq;

      if (needsConnectedDevice && !currentDevice) {
        throw new Error('设备未连接');
      }

      // 构建执行参数
      const executionParams =
        needsConnectedDevice && currentDevice
          ? {
              connectId: currentDevice.connectId,
              // 只有在方法需要 deviceId 时才传递
              ...(methodConfig.noDeviceIdReq ? {} : { deviceId: currentDevice.deviceId }),
              ...params,
            }
          : params;

      const resolvedExecutionParams = resolveLazyParameterValues(executionParams);
      const normalizedParams = normalizeProtocolV2FileParams(methodConfig.method, resolvedExecutionParams);

      // 调用硬件 API
      const result = await callHardwareAPI(methodConfig.method, normalizedParams);

      if (result.success) {
        let firmwareVersions = FIRMWARE_UPDATE_METHODS.has(methodConfig.method)
          ? getFirmwareVersionsFromPayload(result.payload)
          : undefined;

        if (FIRMWARE_UPDATE_METHODS.has(methodConfig.method)) {
          try {
            const refreshedDevice = await refreshCurrentDeviceInfo();
            firmwareVersions =
              firmwareVersions ?? getFirmwareVersionsFromFeatures(refreshedDevice?.features);
          } catch (error) {
            console.warn('固件更新完成后刷新设备信息失败:', error);
          }
        }

        return {
          success: true,
          data: result.payload,
          ...(firmwareVersions ? { firmwareVersions } : {}),
        };
      } else {
        throw new Error(result.payload?.error || '执行失败');
      }
    },
    [currentDevice, refreshCurrentDeviceInfo, requireDevice]
  );

  return {
    executeMethod,
    canExecute: !requireDevice || !!currentDevice,
    currentDevice,
  };
}
