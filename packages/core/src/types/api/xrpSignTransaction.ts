import type { Messages } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type XrpSignTransactionParams = Messages.RippleSignTx;

export type XrpSignTransactionResponse = {
  serializedTx: string;
  signature: string;
};

type XrpPayment = {
  amount: string;
  destination: string;
  destinationTag?: number;
};

type XrpTransaction = {
  fee: string;
  flags?: number;
  sequence: number;
  maxLedgerVersion?: number; // Proto: "last_ledger_sequence"
  payment: XrpPayment;
};

export declare function xrpSignTransaction(
  connectId: string,
  deviceId: string,
  params: CommonParams & XrpTransaction
): Response<XrpSignTransactionResponse>;
