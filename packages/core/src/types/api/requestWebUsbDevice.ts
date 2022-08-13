import { KnownDevice } from '../device';
import { Response } from '../params';

export declare function requestWebUsbDevice(): Response<{ device: KnownDevice }>;
