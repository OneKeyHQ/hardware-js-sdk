import { ResourceType, Success } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type DeviceUploadResourceParams = {
  suffix: string;
  dataHex: string;
  thumbnailDataHex: string;
  blurDataHex: string;
  resType: ResourceType;
  nftMetaData: string;
  fileNameNoExt?: string;
};

export type DeviceUploadResourceResponse = Success & {
  applyScreen?: boolean;
};

export declare function deviceUploadResource(
  connectId: string,
  params: CommonParams & DeviceUploadResourceParams
): Response<DeviceUploadResourceResponse>;
