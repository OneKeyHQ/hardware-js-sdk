import { FileInfoList, ListResDir as HardwareListResDir } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export declare function listResDir(
  connectId?: string,
  deviceId?: string,
  params?: CommonParams & HardwareListResDir
): Response<FileInfoList>;
