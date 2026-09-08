import type { CommonParams, Response } from '../params';
import type { Features } from '../device';

/**
 * @deprecated Use `getDeviceState` for both Protocol V1 and Protocol V2.
 * Existing calls still work. Read `payload.identity.deviceId` from `getDeviceState`.
 */
export declare function getFeatures(connectId?: string, params?: CommonParams): Response<Features>;
