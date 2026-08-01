/**
 * Default fallback for tsc, which doesn't understand Metro's `.native.ts` /
 * `.web.ts` resolution. At runtime Metro always picks a platform-suffixed
 * sibling; this file is never executed.
 */
import type { HwkAdapterBundle, HwkAdapterDeps, HwkBrand } from './types';

export const createHwkAdapter = (_brand: HwkBrand, _deps: HwkAdapterDeps): HwkAdapterBundle => {
  throw new Error(
    'createHwkAdapter: no platform-specific factory was resolved. This default fallback should never run at runtime.'
  );
};

export type { HwkAdapter, HwkAdapterBundle, HwkAdapterDeps, HwkBrand } from './types';
