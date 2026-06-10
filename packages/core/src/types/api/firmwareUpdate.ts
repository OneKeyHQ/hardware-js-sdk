import type { EFirmwareType } from '@onekeyfe/hd-shared';
import type { PROTO } from '../../constants';
import type { Params, Response } from '../params';

type IUpdateType = 'firmware' | 'ble';

export interface FirmwareUpdateBinaryParams {
  binary: ArrayBuffer;
  updateType: IUpdateType;
}

export interface FirmwareUpdateParams {
  version?: number[];
  updateType: IUpdateType;
  forcedUpdateRes?: boolean;
  isUpdateBootloader?: boolean;
  firmwareType?: EFirmwareType;
}

export declare function firmwareUpdate(
  connectId: string | undefined,
  params: Params<FirmwareUpdateParams> & { rebootOnSuccess?: boolean }
): Response<PROTO.Success>;
export declare function firmwareUpdate(
  connectId: string | undefined,
  params: Params<FirmwareUpdateBinaryParams> & { rebootOnSuccess?: boolean }
): Response<PROTO.Success>;

type IPlatform = 'native' | 'desktop' | 'ext' | 'web' | 'web-embed';
type Platform = { platform: IPlatform };

export declare function firmwareUpdateV2(
  connectId: string | undefined,
  params: Params<FirmwareUpdateParams & Platform>
): Response<PROTO.Success>;
export declare function firmwareUpdateV2(
  connectId: string | undefined,
  params: Params<FirmwareUpdateBinaryParams & Platform>
): Response<PROTO.Success>;

export interface FirmwareUpdateV3Params {
  bleVersion?: number[];
  bleBinary?: ArrayBuffer;
  chunkSize?: number;

  firmwareVersion?: number[];
  firmwareBinary?: ArrayBuffer;

  bootloaderVersion?: number[];
  bootloaderBinary?: ArrayBuffer;

  resourceBinary?: ArrayBuffer;
  forcedUpdateRes?: boolean;

  firmwareType?: EFirmwareType;

  platform: IPlatform;
}

/**
 * firmwareUpdateV4（Protocol V2）按 DevFirmwareTargetType 拆分的目标二进制。
 * 每个字段对应一个固件升级 target，可单独更新，也可任意组合一次更新。
 */
export interface FirmwareUpdateV4Params {
  platform: IPlatform;
  chunkSize?: number;
  firmwareType?: EFirmwareType;

  /** TARGET_ROMLOADER = 1 */
  romloaderBinary?: ArrayBuffer;
  /** TARGET_BOOTLOADER = 2 */
  bootloaderBinary?: ArrayBuffer;
  /** TARGET_APPLICATION_P1 = 3 */
  applicationP1Binary?: ArrayBuffer;
  /** TARGET_APPLICATION_P2 = 4 */
  applicationP2Binary?: ArrayBuffer;
  /** TARGET_COPROCESSOR = 5（蓝牙协处理器） */
  coprocessorBinary?: ArrayBuffer;
  /** TARGET_SE01-04 = 6-9 */
  se01Binary?: ArrayBuffer;
  se02Binary?: ArrayBuffer;
  se03Binary?: ArrayBuffer;
  se04Binary?: ArrayBuffer;
  /** TARGET_RESOURCE = 10（zip 包，解压后逐文件上传） */
  resourceBinary?: ArrayBuffer;
  forcedUpdateRes?: boolean;

  /** 按 release 配置自动下载 */
  firmwareVersion?: number[];
  bleVersion?: number[];
  bootloaderVersion?: number[];

  /** legacy 别名：等价 applicationP1Binary */
  firmwareBinary?: ArrayBuffer;
  /** legacy 别名：等价 coprocessorBinary */
  bleBinary?: ArrayBuffer;
}

export declare function firmwareUpdateV3(
  connectId: string | undefined,
  params: Params<FirmwareUpdateV3Params>
): Response<{
  bleVersion: string;
  firmwareVersion: string;
  bootloaderVersion: string;
}>;

export declare function firmwareUpdateV4(
  connectId: string | undefined,
  params: Params<FirmwareUpdateV4Params>
): Response<{
  bleVersion: string;
  firmwareVersion: string;
  bootloaderVersion: string;
}>;
