/**
 * 设备兼容性系统
 * 通过统一 overrides 规则处理「跳过执行」与「期望覆盖」两类行为
 */

import { useMemo } from 'react';
import { getDeviceType as getDeviceTypeFromSDK } from '@onekeyfe/hd-core';

import { useDevice } from '../../provider/DeviceProvider';

import type { EDeviceType } from '@onekeyfe/hd-shared';

export interface DeviceCompatibilityCheckOptions {
  path?: string;
  params?: any;
  key?: string;
  testContext?: Record<string, any>;
}

export interface DeviceCompatibilityRuleContext extends DeviceCompatibilityCheckOptions {
  method: string;
  features: any;
  deviceType: EDeviceType;
}

export interface DeviceCompatibilityOverride {
  id: string;
  methods: string | string[];
  when?: (context: DeviceCompatibilityRuleContext) => boolean;
  skip?: string;
  expected?: boolean;
}

// 设备插件配置（统一使用 overrides）
export interface DevicePlugin {
  deviceType: EDeviceType;
  overrides?: DeviceCompatibilityOverride[];
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
    return deviceType as EDeviceType;
  }

  private parseCheckOptions(
    pathOrParams?: string | DeviceCompatibilityCheckOptions
  ): DeviceCompatibilityCheckOptions {
    if (typeof pathOrParams === 'string') {
      return { path: pathOrParams };
    }

    return pathOrParams || {};
  }

  private isMethodMatched(rule: DeviceCompatibilityOverride, method: string): boolean {
    const methods = Array.isArray(rule.methods) ? rule.methods : [rule.methods];
    return methods.includes(method);
  }

  private findMatchedOverride(
    context: DeviceCompatibilityRuleContext,
    predicate: (rule: DeviceCompatibilityOverride) => boolean
  ): DeviceCompatibilityOverride | undefined {
    const plugin = this.plugins.get(context.deviceType);
    if (!plugin?.overrides?.length) {
      return undefined;
    }

    return plugin.overrides.find(rule => {
      if (!this.isMethodMatched(rule, context.method)) {
        return false;
      }
      if (rule.when && !rule.when(context)) {
        return false;
      }
      return predicate(rule);
    });
  }

  // 检查方法是否需要跳过（支持路径级别与参数级别）
  checkMethod(
    features: any,
    method: string,
    pathOrParams?: string | DeviceCompatibilityCheckOptions
  ): CompatibilityResult {
    const deviceType = this.getDeviceType(features);
    const options = this.parseCheckOptions(pathOrParams);
    const context: DeviceCompatibilityRuleContext = {
      ...options,
      method,
      features,
      deviceType,
    };

    const matchedRule = this.findMatchedOverride(context, rule => typeof rule.skip === 'string');
    if (matchedRule?.skip) {
      return {
        shouldSkip: true,
        reason: matchedRule.skip,
      };
    }

    return { shouldSkip: false };
  }

  // 获取期望值覆盖（用于同一测试在不同设备上的差异）
  getExpectedOverride(
    features: any,
    method: string,
    key: string,
    testContext?: Record<string, any>
  ): boolean | undefined {
    const deviceType = this.getDeviceType(features);
    const context: DeviceCompatibilityRuleContext = {
      method,
      key,
      testContext,
      features,
      deviceType,
    };
    const matchedRule = this.findMatchedOverride(
      context,
      rule => typeof rule.expected === 'boolean'
    );
    return matchedRule?.expected;
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
