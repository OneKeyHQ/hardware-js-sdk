import type { CommonParams, Response } from '../params';
import type { Features } from '../device';

export declare function getFeatures(connectId?: string, params?: CommonParams): Response<Features>;
