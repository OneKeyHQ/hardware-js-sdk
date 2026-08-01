import type { CommonParams, Response } from '../params';
import type { OnekeyFeatures } from '../device';

/**
 * @deprecated Use `getDeviceState(connectId, { scope: 'firmware' })`.
 */
export declare function getOnekeyFeatures(
  connectId?: string,
  params?: CommonParams
): Response<OnekeyFeatures>;
