import type { CommonParams, Response } from '../params';
import type { Features } from '../device';

/**
 * @deprecated Use `getDeviceState` for both Protocol V1 and Protocol V2 devices.
 */
export declare function getFeatures(connectId?: string, params?: CommonParams): Response<Features>;
