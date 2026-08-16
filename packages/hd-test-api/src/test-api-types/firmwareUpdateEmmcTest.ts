import type { FirmwareUpdateEmmc, Success } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '@onekeyfe/hd-core';

export declare function firmwareUpdateEmmcTest(
  connectId: string,
  params: CommonParams & FirmwareUpdateEmmc
): Response<Success>;
