/**
 * 设备兼容性系统 - 集成版本
 * 功能：配置要跳过的方法，检测时跳过
 */

import { useMemo } from 'react';
import { getDeviceType as getDeviceTypeFromSDK } from '@onekeyfe/hd-core';

import { useDevice } from '../../provider/DeviceProvider';

import type { EDeviceType } from '@onekeyfe/hd-shared';

// 设备插件配置
export interface DevicePlugin {
  deviceType: EDeviceType;
  ignoreMethod: string[]; // 要跳过的方法列表
  ignoreMethodPath?: Record<string, string[]>; // 要跳过的方法+路径组合
}

// 兼容性检查结果
export interface CompatibilityResult {
  shouldSkip: boolean;
  reason?: string;
}

/**
 * 设备兼容性管理器
 */
export class DeviceCompatibilityManager {
  private plugins: Map<EDeviceType, DevicePlugin> = new Map();

  registerPlugin(plugin: DevicePlugin) {
    this.plugins.set(plugin.deviceType, plugin);
  }

  // 使用 SDK 提供的精确设备类型判断
  getDeviceType(features: any): EDeviceType {
    const deviceType = getDeviceTypeFromSDK(features);
    // SDK 返回的类型已经是精确的，直接使用
    return deviceType as EDeviceType;
  }

  // 检查方法是否应该跳过（支持路径级别检查）
  checkMethod(features: any, method: string, path?: string): CompatibilityResult {
    const deviceType = this.getDeviceType(features);
    const plugin = this.plugins.get(deviceType);

    if (!plugin) {
      return { shouldSkip: false };
    }

    // 1. 检查整个方法是否跳过
    if (plugin.ignoreMethod.includes(method)) {
      return {
        shouldSkip: true,
        reason: `${method} is not supported on ${deviceType}`,
      };
    }

    // 2. 检查特定路径是否跳过
    if (path && plugin.ignoreMethodPath?.[method]) {
      const ignorePaths = plugin.ignoreMethodPath[method];
      if (ignorePaths.includes(path)) {
        return {
          shouldSkip: true,
          reason: `${method} path ${path} is not supported on ${deviceType}`,
        };
      }
    }

    return { shouldSkip: false };
  }
}

// 全局实例
export const compatibilityManager = new DeviceCompatibilityManager();

/**
 * 设备兼容性 Hook
 *
 * @example
 * const { shouldSkip, skipReason } = useDeviceCompatibility(method);
 */
export function useDeviceCompatibility(method: string) {
  const { selectedDevice } = useDevice();

  return useMemo(() => {
    if (!selectedDevice?.features) {
      return { shouldSkip: false, skipReason: '' };
    }

    const result = compatibilityManager.checkMethod(selectedDevice.features, method);

    return {
      shouldSkip: result.shouldSkip,
      skipReason: result.reason || '',
    };
  }, [selectedDevice?.features, method]);
}

/**
 * 批量兼容性检查（支持路径级别）
 */
export function useBatchDeviceCompatibility(
  methods: string[],
  pathsByMethod?: Record<string, string[]>
) {
  const { selectedDevice } = useDevice();

  return useMemo(() => {
    if (!selectedDevice?.features) {
      return {
        skippedMethods: [],
        supportedMethods: methods,
        pathSkipInfo: {},
      };
    }

    const skippedMethods: string[] = [];
    const supportedMethods: string[] = [];
    const pathSkipInfo: Record<string, { total: number; skipped: string[] }> = {};

    methods.forEach(method => {
      const result = compatibilityManager.checkMethod(selectedDevice.features, method);

      if (result.shouldSkip) {
        skippedMethods.push(method);
      } else {
        supportedMethods.push(method);

        // 检查路径级别跳过
        if (pathsByMethod?.[method]) {
          const paths = pathsByMethod[method];
          const skippedPaths: string[] = [];

          paths.forEach(path => {
            const pathResult = compatibilityManager.checkMethod(
              selectedDevice.features,
              method,
              path
            );
            if (pathResult.shouldSkip) {
              skippedPaths.push(path);
            }
          });

          if (skippedPaths.length > 0) {
            pathSkipInfo[method] = {
              total: paths.length,
              skipped: skippedPaths,
            };
          }
        }
      }
    });

    return { skippedMethods, supportedMethods, pathSkipInfo };
  }, [selectedDevice?.features, methods, pathsByMethod]);
}
