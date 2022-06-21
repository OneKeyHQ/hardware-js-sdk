import type { PROTO } from '../../constants';
import type { Params, Response } from '../params';

export interface FirmwareUpdateBinary {
  binary: ArrayBuffer;
}

export interface FirmwareUpdate {
  version: number[];
  btcOnly?: boolean;
  updateType: 'firmware' | 'ble';
}

export declare function firmwareUpdate(
  connectId: string | undefined,
  params: Params<FirmwareUpdate>
): Response<PROTO.Success>;
export declare function firmwareUpdate(
  connectId: string | undefined,
  params: Params<FirmwareUpdateBinary>
): Response<PROTO.Success>;
