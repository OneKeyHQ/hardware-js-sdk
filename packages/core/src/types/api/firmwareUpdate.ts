import type { PROTO } from '../../constants';
import type { Params, Response } from '../params';

export interface FirmwareUpdateBinaryParams {
  binary: ArrayBuffer;
}

export interface FirmwareUpdateParams {
  version?: number[];
  btcOnly?: boolean;
  updateType: 'firmware' | 'ble';
  forcedUpdateRes?: boolean;
  isUpdateBootloader?: boolean;
}

export declare function firmwareUpdate(
  connectId: string | undefined,
  params: Params<FirmwareUpdateParams>
): Response<PROTO.Success>;
export declare function firmwareUpdate(
  connectId: string | undefined,
  params: Params<FirmwareUpdateBinaryParams>
): Response<PROTO.Success>;

type IPlatform = 'native' | 'desktop' | 'ext' | 'web' | 'webEmbed';
type Platform = { platform: IPlatform };

export declare function firmwareUpdateV2(
  connectId: string | undefined,
  params: Params<FirmwareUpdateParams & Platform>
): Response<PROTO.Success>;
export declare function firmwareUpdateV2(
  connectId: string | undefined,
  params: Params<FirmwareUpdateBinaryParams & Platform>
): Response<PROTO.Success>;
