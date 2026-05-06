import { useCallback } from 'react';
import {
  getDeviceBLEFirmwareVersion,
  getDeviceBootloaderVersion,
  getDeviceFirmwareVersion,
} from '@onekeyfe/hd-core';
import { useDeviceStore } from '../store/deviceStore';
import { callHardwareAPI } from '../services/hardwareService';
import { SDKUtils } from '../utils/hardwareInstance';
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
  'deviceUpdateBootloader',
]);

function getProtocolV2FileWriteDataSize(data: unknown): number | undefined {
  if (data instanceof ArrayBuffer) return data.byteLength;
  if (ArrayBuffer.isView(data)) return data.byteLength;
  if (typeof data === 'string') return new TextEncoder().encode(data).byteLength;
  return undefined;
}

function normalizeProtocolV2FileParams(
  method: string,
  params: Record<string, unknown>
): Record<string, unknown> {
  if (method !== 'fileWrite') return params;

  const dataSize = getProtocolV2FileWriteDataSize(params.data);
  if (!dataSize) return params;

  const totalSize = Number(params.totalSize);
  if (Number.isFinite(totalSize) && totalSize > 0) return params;

  return {
    ...params,
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

      const normalizedParams = normalizeProtocolV2FileParams(methodConfig.method, executionParams);

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
