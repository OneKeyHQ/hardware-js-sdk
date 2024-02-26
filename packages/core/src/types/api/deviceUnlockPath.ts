import { UnlockPath, UnlockedPathRequest } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type DeviceVerifyParams = {
  dataHex: string;
};

export type DeviceVerifySignature = {
  cert: string;
  signature: string;
};

export declare function deviceUnlockPath(
  connectId: string,
  params: CommonParams & UnlockPath
): Response<UnlockedPathRequest>;
