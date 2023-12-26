import { Success, NFTWriteInfo } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export declare function nftWriteInfo(
  connectId: string,
  deviceId: string,
  params: CommonParams & NFTWriteInfo
): Response<Success>;
