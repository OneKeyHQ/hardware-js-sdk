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

  firmwareVersion?: number[];
  firmwareBinary?: ArrayBuffer;

  bootloaderVersion?: number[];
  bootloaderBinary?: ArrayBuffer;

  resourceBinary?: ArrayBuffer;
  forcedUpdateRes?: boolean;

  firmwareType?: EFirmwareType;

  platform: IPlatform;
}

export type FirmwareUpdateV4Params = FirmwareUpdateV3Params;

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
