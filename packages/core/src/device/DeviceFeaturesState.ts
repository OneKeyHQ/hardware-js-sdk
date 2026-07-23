import type { Features } from '../types';

export type DeviceFeaturesUpdateSource =
  | 'device-info'
  | 'device-status'
  | 'device-settings-get'
  | 'device-settings-set'
  | 'apply-settings'
  | 'unlock'
  | 'cache';

/**
 * 合并设备状态的字段级 patch。
 *
 * `undefined` 表示本次响应未提供该字段，不覆盖缓存；`null` 表示设备明确
 * 返回空值，需要写入缓存。raw 等对象字段由调用方构造完整值后再传入，
 * 这里不做隐式深合并。
 */
export function mergeDeviceFeaturesPatch(previous: Features, patch: Partial<Features>): Features {
  let next = previous;

  for (const [key, value] of Object.entries(patch) as Array<
    [keyof Features, Features[keyof Features] | undefined]
  >) {
    if (value !== undefined && !Object.is(previous[key], value)) {
      if (next === previous) {
        next = { ...previous };
      }
      (next as Record<keyof Features, Features[keyof Features]>)[key] = value;
    }
  }

  return next;
}
