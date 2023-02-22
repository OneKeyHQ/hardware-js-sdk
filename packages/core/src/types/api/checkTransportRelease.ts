import type { Response } from '../params';
import { TransportReleaseStatus } from '../firmware';

export declare function checkTransportRelease(connectId?: string): Response<TransportReleaseStatus>;
