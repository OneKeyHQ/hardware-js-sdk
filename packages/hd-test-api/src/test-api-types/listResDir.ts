import type { FileInfoList, ListResDir as HardwareListResDir } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '@onekeyfe/hd-core';

export declare function listResDir(
  connectId?: string,
  deviceId?: string,
  params?: CommonParams & HardwareListResDir
): Response<FileInfoList>;
