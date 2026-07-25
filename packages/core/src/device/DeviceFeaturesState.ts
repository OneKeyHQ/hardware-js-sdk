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
 * Merge a field-level device-state patch.
 *
 * `undefined` means the response omitted a field and preserves the cache; `null`
 * means the device explicitly returned an empty value and must be cached. Callers
 * provide complete object fields such as raw; this function does not deep-merge.
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
