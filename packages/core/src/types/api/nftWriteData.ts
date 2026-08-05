import type { NFTWriteData as HardwareNFTWriteData, Success } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export declare function nftWriteData(
  connectId: string,
  deviceId: string,
  params: CommonParams & HardwareNFTWriteData
): Response<Success>;
