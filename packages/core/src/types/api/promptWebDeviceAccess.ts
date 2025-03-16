import { KnownDevice } from '../device';
import { Response } from '../params';

export declare function promptWebDeviceAccess(options?: {
  deviceSerialNumberFromUI?: string;
}): Response<{ device: KnownDevice | null }>;
