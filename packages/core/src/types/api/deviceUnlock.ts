import type { Features } from '../device';
import type { CommonParams, Response } from '../params';

export declare function deviceUnlock(connectId: string, params?: CommonParams): Response<Features>;
