import { TonWalletVersion, TonWorkChain } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type TonAddress = {
  path: string;
  publicKey: string;
  address: string;
};

export type TonGetAddressParams = {
  path: string | number[];
  showOnOneKey?: boolean;
  walletVersion?: TonWalletVersion;
  isBounceable?: boolean;
  isTestnetOnly?: boolean;
  workchain?: TonWorkChain;
  walletId?: number;
};

export declare function tonGetAddress(
  connectId: string,
  deviceId: string,
  params: CommonParams & TonGetAddressParams
): Response<TonAddress>;

export declare function tonGetAddress(
  connectId: string,
  deviceId: string,
  params: CommonParams & { bundle?: TonGetAddressParams[] }
): Response<Array<TonAddress>>;
