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
 * firmwareUpdateV4 target binaries grouped by DeviceFirmwareTargetType.
 * Except for romloader, each field maps to a target accepted by bootloader.
 */
export type FirmwareUpdateV4Target =
  | 'boot'
  | 'boot_resources'
  | 'app_v1'
  | 'app_v2'
  | 'coprocessor'
  | 'resource'
  | 'se01'
  | 'se02'
  | 'se03'
  | 'se04';

export interface FirmwareUpdateV4Params {
  platform: IPlatform;
  chunkSize?: number;
  firmwareType?: EFirmwareType;
  targetsToUpdate?: FirmwareUpdateV4Target[];

  /** FW_MGMT_TARGET_ROMLOADER = 2; Pro2 cannot install it through firmwareUpdateV4. */
  romloaderBinary?: ArrayBuffer;
  /** FW_MGMT_TARGET_BOOTLOADER = 3 */
  bootloaderBinary?: ArrayBuffer;
  /** FW_MGMT_TARGET_APPLICATION_P1 = 4 */
  applicationP1Binary?: ArrayBuffer;
  /** FW_MGMT_TARGET_APPLICATION_P2 = 5 */
  applicationP2Binary?: ArrayBuffer;
  /** FW_MGMT_TARGET_COPROCESSOR = 6 */
  coprocessorBinary?: ArrayBuffer;
  /** FW_MGMT_TARGET_SE01-04 = 7-10 */
  se01Binary?: ArrayBuffer;
  se02Binary?: ArrayBuffer;
  se03Binary?: ArrayBuffer;
  se04Binary?: ArrayBuffer;
  forcedUpdateRes?: boolean;
  /**
   * Arbitrary Protocol V2 resource files written directly with FilesystemFileWrite.
   * Use this for manifest-driven boot resources and other non-RESC files.
   * When provided, these files are authoritative for resource and boot_resources targets.
   */
  resourceFiles?: Array<{
    binary: ArrayBuffer;
    devicePath: string;
    size?: number;
    fileHash?: string;
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
