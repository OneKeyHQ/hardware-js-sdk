import { SpiFlashData, SpiFlashRead } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export declare function deviceSpiFlashRead(
  connectId: string,
  params: CommonParams & SpiFlashRead
): Response<SpiFlashData>;
