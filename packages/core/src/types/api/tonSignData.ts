import type {
  TonSignDataType,
  TonSignedData,
  TonWalletVersion,
  TonWorkChain,
  UintType,
} from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type TonSignDataParams = {
  path: string | number[];
  type: TonSignDataType;
  payload: string;
  schema?: string;
  appdomain: string;
  timestamp: UintType;
  fromAddress?: string;
  walletVersion?: TonWalletVersion;
  walletId?: number;
  workchain?: TonWorkChain;
  isBounceable?: boolean;
  isTestnetOnly?: boolean;
};

export declare function tonSignData(
  connectId: string,
  deviceId: string,
  params: CommonParams & TonSignDataParams
): Response<TonSignedData>;
