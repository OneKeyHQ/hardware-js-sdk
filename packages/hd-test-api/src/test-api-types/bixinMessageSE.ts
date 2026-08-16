import type { BixinMessageSE, BixinOutMessageSE } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '@onekeyfe/hd-core';

export declare function bixinMessageSE(
  connectId: string,
  deviceId: string,
  params: CommonParams & BixinMessageSE
): Response<BixinOutMessageSE>;
