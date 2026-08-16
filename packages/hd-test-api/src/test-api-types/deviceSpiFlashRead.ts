import type { SpiFlashData, SpiFlashRead } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '@onekeyfe/hd-core';

export declare function deviceSpiFlashRead(
  connectId: string,
  params: CommonParams & SpiFlashRead
): Response<SpiFlashData>;
