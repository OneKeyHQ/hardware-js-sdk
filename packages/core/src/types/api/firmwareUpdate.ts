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
 * firmwareUpdateV4（Protocol V2）按 DeviceFirmwareTargetType 拆分的目标二进制。
 * 除 romloader 外，每个字段对应一个 bootloader 可接受的固件升级 target。
 */
export interface FirmwareUpdateV4Params {
  platform: IPlatform;
  chunkSize?: number;
  firmwareType?: EFirmwareType;

  /** FW_MGMT_TARGET_ROMLOADER = 1；当前 Pro2 bootloader 不接受通过 firmwareUpdateV4 安装 */
  romloaderBinary?: ArrayBuffer;
  /** FW_MGMT_TARGET_BOOTLOADER = 2 */
  bootloaderBinary?: ArrayBuffer;
  /** FW_MGMT_TARGET_APPLICATION_P1 = 3 */
  applicationP1Binary?: ArrayBuffer;
  /** FW_MGMT_TARGET_APPLICATION_P2 = 4 */
  applicationP2Binary?: ArrayBuffer;
  /** FW_MGMT_TARGET_COPROCESSOR = 5 */
  coprocessorBinary?: ArrayBuffer;
  /** FW_MGMT_TARGET_SE01-04 = 6-9 */
  se01Binary?: ArrayBuffer;
  se02Binary?: ArrayBuffer;
  se03Binary?: ArrayBuffer;
  se04Binary?: ArrayBuffer;
  forcedUpdateRes?: boolean;
  /**
   * RESC bundle okpkg 列表，通过 FilesystemFileWrite 直写到 devicePath（vol0:/bundles/...）。
   * 手动传入模式：SDK 直接 FileWrite 安装，不做版本比对。
   */
  resourceBundleFiles?: Array<{
    binary: ArrayBuffer;
    devicePath: string;
  }>;
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
