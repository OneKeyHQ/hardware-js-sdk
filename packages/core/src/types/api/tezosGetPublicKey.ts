import { GetPublicKey as HardwareGetPublicKey } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type TezosPublicKey = {
  path: string;
} & HardwareGetPublicKey;

export type TezosGetPublicKeyParams = {
  path: string | number[];
  showOnOneKey?: boolean;
};

export declare function tezosGetPublicKey(
  connectId: string,
  deviceId: string,
  params: CommonParams & TezosGetPublicKeyParams
): Response<TezosPublicKey>;

export declare function tezosGetPublicKey(
  connectId: string,
  deviceId: string,
  params: CommonParams & { bundle?: TezosGetPublicKeyParams[] }
): Response<Array<TezosPublicKey>>;
