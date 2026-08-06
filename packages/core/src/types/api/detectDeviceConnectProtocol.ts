import type { HardwareConnectProtocol } from '@onekeyfe/hd-shared';
import type { Response } from '../params';

export declare function detectDeviceConnectProtocol(
  connectId: string
): Response<HardwareConnectProtocol>;
