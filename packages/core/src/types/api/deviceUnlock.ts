import type { DeviceSessionPinType } from '@onekeyfe/hd-transport';
import type { Features } from '../device';
import type { CommonParams, Response } from '../params';

export type DeviceUnlockParams = {
  /**
   * 限定本次解锁允许使用的 PIN 类型。省略时保持兼容行为，仅允许主 PIN。
   */
  pinType?: DeviceSessionPinType;
};

export declare function deviceUnlock(
  connectId: string,
  params?: CommonParams & DeviceUnlockParams
): Response<Features>;
