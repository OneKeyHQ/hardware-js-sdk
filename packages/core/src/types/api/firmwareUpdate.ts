import type { EFirmwareType } from '@onekeyfe/hd-shared';
import type { PROTO } from '../../constants';
import type { Params, Response } from '../params';
import type { FirmwareUpdatePreparedPlan } from './firmwareUpdatePreparedPlan';

type IUpdateType = 'firmware' | 'ble';

export interface FirmwareArtifactReference {
  artifactRef: string;
  size: number;
  sha256: string;
}

export interface FirmwareArtifactReader {
  open(input: { artifactRef: string }): Promise<{
    readerId: string;
    size: number;
  }>;
  read(input: { readerId: string; offset: number; length: number }): Promise<{
    data: ArrayBuffer;
    bytesRead: number;
    eof: boolean;
  }>;
  close(input: { readerId: string }): Promise<void>;
}

export interface FirmwareUpdateHostBinding {
  artifactReader: FirmwareArtifactReader;
  /** 将读取器 generation 绑定到包含 ZIP 条目的完整 PreparedPlan。 */
  preparedPlanDigest: string;
}

export interface FirmwareUpdateBinaryParams {
  binary: ArrayBuffer;
  updateType: IUpdateType;
}

export interface FirmwareUpdateArtifactParams {
  preparedPlan: FirmwareUpdatePreparedPlan;
  hostBindingGeneration: number;
  /** @deprecated Core derives the component artifact from preparedPlan. */
  artifact?: FirmwareArtifactReference;
  resourceEntries?: Array<{
    entryName: string;
    artifact: FirmwareArtifactReference;
  }>;
  updateType: IUpdateType;
  forcedUpdateRes?: boolean;
  isUpdateBootloader?: boolean;
  firmwareType?: EFirmwareType;
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
export declare function firmwareUpdateV2(
  connectId: string | undefined,
  params: Params<FirmwareUpdateArtifactParams & Platform>
): Response<PROTO.Success>;

export interface FirmwareUpdateV3Params {
  preparedPlan?: FirmwareUpdatePreparedPlan;
  hostBindingGeneration?: number;
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

  artifactReader?: FirmwareArtifactReader;
  artifacts?: {
    ble?: FirmwareArtifactReference;
    firmware?: FirmwareArtifactReference;
    bootloader?: FirmwareArtifactReference;
    resourceEntries?: Array<{
      entryName: string;
      artifact: FirmwareArtifactReference;
    }>;
  };
}

/**
 * firmwareUpdateV4 target binaries grouped by DeviceFirmwareTargetType.
 * Except for romloader, each field maps to a target accepted by bootloader.
 */
export type FirmwareUpdateV4Target =
  | 'boot'
  /** @deprecated Use resource with resourceArchiveBinary. */
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
  preparedPlan?: FirmwareUpdatePreparedPlan;
  /** Required whenever preparedPlan is present; Core resolves the reader from this digest-bound host. */
  hostBindingGeneration?: number;
  platform: IPlatform;
  expectedDeviceId?: string;
  chunkSize?: number;
  firmwareType?: EFirmwareType;
  targetsToUpdate?: FirmwareUpdateV4Target[];
  expectedTargetVersions?: Partial<Record<FirmwareUpdateV4Target, string>>;

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
  /** Complete Protocol V2 resource ZIP for local development; Core converts it to a local PreparedPlan. */
  resourceArchiveBinary?: ArrayBuffer;
  forcedUpdateRes?: boolean;
  artifactReader?: FirmwareArtifactReader;
  componentArtifacts?: Partial<
    Record<
      Exclude<FirmwareUpdateV4Target, 'resource' | 'boot_resources'>,
      FirmwareArtifactReference
    >
  >;
}

export declare function registerFirmwareUpdateHostBinding(
  binding: FirmwareUpdateHostBinding
): number;

export declare function unregisterFirmwareUpdateHostBinding(generation?: number): boolean;

export declare function getFirmwareUpdateHostBindingGeneration(): number;

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
