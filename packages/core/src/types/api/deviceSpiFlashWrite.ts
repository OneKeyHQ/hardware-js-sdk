import { SpiFlashWrite, Success } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export declare function deviceSpiFlashWrite(
  connectId: string,
  params: CommonParams & SpiFlashWrite
): Response<Success>;
