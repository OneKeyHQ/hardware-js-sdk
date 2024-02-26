import { FirmwareUpdateEmmc, Success } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export declare function firmwareUpdateEmmcTest(
  connectId: string,
  params: CommonParams & FirmwareUpdateEmmc
): Response<Success>;
