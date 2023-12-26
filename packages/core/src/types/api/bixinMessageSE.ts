import { BixinOutMessageSE, BixinMessageSE } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export declare function bixinMessageSE(
  connectId: string,
  deviceId: string,
  params: CommonParams & BixinMessageSE
): Response<BixinOutMessageSE>;
