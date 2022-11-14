import type { Messages } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type XrpSignTransactionResponse = {
  serializedTx: string;
  signature: string;
};

export type XrpSignTransactionParams = Messages.RippleSignTx;

export declare function xrpSignTransaction(
  connectId: string,
  deviceId: string,
  params: CommonParams & XrpSignTransactionParams
): Response<XrpSignTransactionResponse>;
