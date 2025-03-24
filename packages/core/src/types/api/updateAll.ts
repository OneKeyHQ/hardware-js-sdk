import type { PROTO } from '../../constants';
import type { Params, Response } from '../params';

export type IUpdateType = 'firmware' | 'ble';

export interface UpdateAllBinaryParams {
  // TODO: 包含所有firmware资源的updates压缩包? 三个文件
  binary?: ArrayBuffer;
  // 蓝牙固件版本
  bleVersion?: number[];
  // 引导程序固件版本
  bootloaderVersion?: number[];
  // 主控固件版本
  firmwareVersion?: number[];
  // MCU固件版本
  mcuVersion?: number[];
  // 是否强制更新资源
  forcedUpdateRes?: boolean;
}

export interface FirmwareUpdateParams {
  version?: number[];
  btcOnly?: boolean;
  updateType: IUpdateType;
  forcedUpdateRes?: boolean;
  isUpdateBootloader?: boolean;
}

type IPlatform = 'native' | 'desktop' | 'ext' | 'web' | 'webEmbed';
type Platform = { platform: IPlatform };

export declare function updateAll(
  connectId: string | undefined,
  params: Params<UpdateAllBinaryParams & Platform>
): Response<PROTO.Success>;
