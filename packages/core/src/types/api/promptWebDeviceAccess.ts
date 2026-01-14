import type { KnownDevice } from '../device';
import type { Response } from '../params';

export declare function promptWebDeviceAccess(options?: {
  deviceSerialNumberFromUI?: string;
}): Response<{ device: KnownDevice | null }>;
