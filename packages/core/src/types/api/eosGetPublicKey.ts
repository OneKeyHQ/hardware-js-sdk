import { EosPublicKey } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type GetPublicKeyParams = {
  path: string | number[];
  showOnOneKey?: boolean;
};

export declare function eosGetPublicKey(
  connectId: string,
  deviceId: string,
  params: CommonParams & GetPublicKeyParams
): Response<EosPublicKey>;
