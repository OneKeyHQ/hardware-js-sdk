import type { EosSignTx, EosSignedTx } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '@onekeyfe/hd-core';

export type EosSignTxParams = {
  path: string | number[];
} & Omit<EosSignTx, 'address_n'>;

export declare function eosSignTx(
  connectId: string,
  deviceId: string,
  params: CommonParams & EosSignTxParams
): Response<EosSignedTx>;
