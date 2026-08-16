import type { NFTWriteData as HardwareNFTWriteData, Success } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '@onekeyfe/hd-core';

export declare function nftWriteData(
  connectId: string,
  deviceId: string,
  params: CommonParams & HardwareNFTWriteData
): Response<Success>;
