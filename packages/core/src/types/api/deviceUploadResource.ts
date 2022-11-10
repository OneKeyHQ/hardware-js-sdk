import { ResourceType, Success } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type DeviceUploadResourceParams = {
  suffix: string;
  dataHex: string;
  thumbnailDataHex: string;
  resType: ResourceType;
  nftMetaData: string;
};

export declare function deviceUploadResource(
  connectId: string,
  params: CommonParams & DeviceUploadResourceParams
): Response<Success>;
