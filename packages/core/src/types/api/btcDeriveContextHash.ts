import type { BabylonDerivedContextHash } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type BTCDeriveContextHashParams = {
  path: string | number[];
  appName: string;
  context: string;
  network: 'bitcoin-mainnet' | 'bitcoin-testnet' | 'bitcoin-signet' | 'bitcoin-regtest';
};

export declare function btcDeriveContextHash(
  connectId: string,
  deviceId: string,
  params: CommonParams & BTCDeriveContextHashParams
): Response<BabylonDerivedContextHash>;
