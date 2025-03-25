import type { PROTO } from '../../constants';
import type { Params, Response } from '../params';

export type IUpdateType = 'firmware' | 'ble';

export interface UpdateAllBinaryParams {
  // 蓝牙固件版本
  bleVersion?: number[];
  bleBinary?: ArrayBuffer;
  // 主控固件版本
  firmwareVersion?: number[];
  firmwareBinary?: ArrayBuffer;
  // 引导程序固件版本
  bootloaderVersion?: number[];
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

export declare function firmwareUpdateV3(
  connectId: string | undefined,
  params: Params<UpdateAllBinaryParams>
): Response<PROTO.Success>;
