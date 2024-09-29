import type { CommonParams, Response } from '../params';
import type { CardanoAddressParameters } from './cardano';

export type INetwork =
  | 'evm'
  // BTC forks
  | 'btc'
  | 'tbtc'
  | 'doge'
  | 'neurai'
  | 'ltc'
  | 'bch'
  // Other
  | 'sol'
  | 'algo'
  | 'near'
  | 'stc'
  | 'cfx'
  | 'tron'
  | 'aptos'
  | 'xrp'
  | 'cosmos'
  | 'ada'
  | 'sui'
  | 'fil'
  | 'dot'
  | 'kaspa'
  | 'nexa'
  | 'dynex'
  | 'nervos'
  | 'scdo'
  | 'ton'
  | 'alph';

type CommonResponseParams = {
  path: string;
  network: INetwork;
  chainName?: string;
  prefix?: string;
};

export type AllNetworkAddressParams = {
  path: string | number[];
  network: INetwork;
  chainName?: string;
  prefix?: string;
  showOnOneKey?: boolean;
};

type AllNetworkAddressPayload =
  | {
      address: string;
      publicKey?: string;
    }
  | {
      // Cardano
      addressParameters: CardanoAddressParameters;
      protocolMagic: number;
      networkId: number;
      serializedPath: string;
      serializedStakingPath: string;
      address: string;
      xpub?: string;
      stakeAddress?: string;
    };

export type AllNetworkAddress = CommonResponseParams & {
  success: boolean;
  error?: string;
  payload?: AllNetworkAddressPayload;
};

export type AllNetworkGetAddressParams = {
  bundle: AllNetworkAddressParams[];
};

export declare function allNetworkGetAddress(
  connectId: string,
  deviceId: string,
  params: CommonParams & AllNetworkGetAddressParams
): Response<AllNetworkAddress>;
