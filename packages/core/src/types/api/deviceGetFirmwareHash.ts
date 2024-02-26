import { GetFirmwareHash, FirmwareHash } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export declare function deviceGetFirmwareHash(
  connectId: string,
  params: CommonParams & GetFirmwareHash
): Response<FirmwareHash>;
