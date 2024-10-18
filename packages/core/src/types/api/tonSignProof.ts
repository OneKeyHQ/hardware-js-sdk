import type {
  TonSignedProof,
  TonWalletVersion,
  TonWorkChain,
  UintType,
} from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type TonSignProofParams = {
  path: string | number[];
  appdomain: string;
  comment?: string;
  expireAt: UintType;
  walletVersion?: TonWalletVersion;
  walletId?: number;
  workchain?: TonWorkChain;
  isBounceable?: boolean;
  isTestnetOnly?: boolean;
};

export declare function tonSignProof(
  connectId: string,
  deviceId: string,
  params: CommonParams & TonSignProofParams
): Response<TonSignedProof>;
