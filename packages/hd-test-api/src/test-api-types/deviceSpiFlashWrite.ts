import type { SpiFlashWrite, Success } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '@onekeyfe/hd-core';

export declare function deviceSpiFlashWrite(
  connectId: string,
  params: CommonParams & SpiFlashWrite
): Response<Success>;
