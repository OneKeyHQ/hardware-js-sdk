import type { Response } from '../params';
import type { Features } from '../device';

export declare function getFeatures(connectId?: string): Response<Features>;
