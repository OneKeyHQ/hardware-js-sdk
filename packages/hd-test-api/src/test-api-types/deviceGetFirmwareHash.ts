import type { FirmwareHash, GetFirmwareHash } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '@onekeyfe/hd-core';

export declare function deviceGetFirmwareHash(
  connectId: string,
  params: CommonParams & GetFirmwareHash
): Response<FirmwareHash>;
