import type {
  TonSignedMessage,
  TonWalletVersion,
  TonWorkChain,
  UintType,
} from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type TonSignMessageParams = {
  path: string | number[];
  destination: string;
  jettonMasterAddress?: string;
  jettonWalletAddress?: string;
  tonAmount: UintType;
  jettonAmount?: UintType;
  fwdFee?: UintType;
  comment?: string;
  isRawData?: boolean;
  mode?: number;
  seqno: number;
  expireAt: UintType;
  walletVersion?: TonWalletVersion;
  walletId?: number;
  workchain?: TonWorkChain;
  isBounceable?: boolean;
  isTestnetOnly?: boolean;
  extDestination?: string[];
  extTonAmount?: UintType[];
  extPayload?: string[];
};

export type TonSignedMessageResponse = {
  skip_validate: boolean;
} & TonSignedMessage;

export declare function tonSignMessage(
  connectId: string,
  deviceId: string,
  params: CommonParams & TonSignMessageParams
): Response<TonSignedMessageResponse>;
