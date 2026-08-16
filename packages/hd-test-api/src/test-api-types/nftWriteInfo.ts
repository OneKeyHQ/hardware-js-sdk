import type { NFTWriteInfo, Success } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '@onekeyfe/hd-core';

export declare function nftWriteInfo(
  connectId: string,
  deviceId: string,
  params: CommonParams & NFTWriteInfo
): Response<Success>;
