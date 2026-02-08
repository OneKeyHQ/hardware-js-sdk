/**
 * Device Compatibility System
 * Configure methods to skip during testing based on device type
 */

import { useMemo } from 'react';
import { getDeviceType as getDeviceTypeFromSDK } from '@onekeyfe/hd-core';

import { useDevice } from '../../provider/DeviceProvider';

import type { EDeviceType } from '@onekeyfe/hd-shared';

// Device plugin configuration
export interface DevicePlugin {
  deviceType: EDeviceType;
  ignoreMethod: string[]; // Methods to skip
  ignoreMethodPath?: Record<string, string[]>; // Method + path combinations to skip
  ignoreMethodParams?: Record<string, (params: any) => boolean | string>; // Method + param conditions to skip (return true or reason string to skip)
  // Expected result overrides: used when device behavior differs from default expectations
  // Format: { method: { coinType: expectedResult } }
  // e.g. { stellarSignTransaction: { '60': true } } means Classic succeeds with wrong coin type 60
  expectedOverrides?: Record<string, Record<string, boolean>>;
}

// Compatibility check result
export interface CompatibilityResult {
  shouldSkip: boolean;
  reason?: string;
}

/**
 * Device Compatibility Manager
 */
export class DeviceCompatibilityManager {
  private plugins: Map<EDeviceType, DevicePlugin> = new Map();

  registerPlugin(plugin: DevicePlugin) {
    this.plugins.set(plugin.deviceType, plugin);
  }

  // Get device type using SDK's precise detection
  getDeviceType(features: any): EDeviceType {
    const deviceType = getDeviceTypeFromSDK(features);
    return deviceType as EDeviceType;
  }

  // Check if method should be skipped (supports path-level and param-level checks)
  checkMethod(
    features: any,
    method: string,
    pathOrParams?: string | { path?: string; params?: any }
  ): CompatibilityResult {
    const deviceType = this.getDeviceType(features);
    const plugin = this.plugins.get(deviceType);

    if (!plugin) {
      return { shouldSkip: false };
    }

    // Parse arguments
    let path: string | undefined;
    let params: any;
    if (typeof pathOrParams === 'string') {
      path = pathOrParams;
    } else if (pathOrParams) {
      path = pathOrParams.path;
      params = pathOrParams.params;
    }

    // 1. Check if the entire method should be skipped
    if (plugin.ignoreMethod.includes(method)) {
      return {
        shouldSkip: true,
        reason: `${method} is not supported on ${deviceType}`,
      };
    }

    // 2. Check if specific path should be skipped
    if (path && plugin.ignoreMethodPath?.[method]) {
      const ignorePaths = plugin.ignoreMethodPath[method];
      if (ignorePaths.includes(path)) {
        return {
          shouldSkip: true,
          reason: `${method} path ${path} is not supported on ${deviceType}`,
        };
      }
    }

    // 3. Check if param conditions require skipping
    if (params && plugin.ignoreMethodParams?.[method]) {
      const checkFn = plugin.ignoreMethodParams[method];
      const result = checkFn(params);
      if (result) {
        const reason = typeof result === 'string' ? result : `${method} with specific params is not supported on ${deviceType}`;
        return {
          shouldSkip: true,
          reason,
        };
      }
    }

    return { shouldSkip: false };
  }

  // Get expected result override
  // Handles cases where different devices have different expected results for the same test case
  getExpectedOverride(
    features: any,
    method: string,
    key: string
  ): boolean | undefined {
    const deviceType = this.getDeviceType(features);
    const plugin = this.plugins.get(deviceType);

    if (!plugin?.expectedOverrides?.[method]) {
      return undefined;
    }

    return plugin.expectedOverrides[method][key];
  }
}

// Global instance
export const compatibilityManager = new DeviceCompatibilityManager();

/**
 * Device Compatibility Hook
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
 * Batch compatibility check (supports path-level)
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

        // Check path-level skipping
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
