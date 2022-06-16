import { StellarSignedTx } from '@onekeyfe/hd-transport/src/types/messages';
import { CommonParams, Response } from '../params';

export type StellarAsset = {
  type: 0 | 1 | 2; // 0: native, 1: credit_alphanum4, 2: credit_alphanum12
  code: string;
  issuer?: string;
};

type StellarCreateAccountOperation = {
  type: 'createAccount';
  source?: string;
  destination: string;
  startingBalance: string;
};

type StellarPaymentOperation = {
  type: 'payment';
  source?: string;
  destination: string;
  asset?: StellarAsset | typeof undefined;
  amount: string;
};

type StellarPathPaymentOperation = {
  type: 'pathPayment';
  source?: string;
  sendAsset: StellarAsset;
  sendMax: string;
  destination: string;
  destAsset: StellarAsset;
  destAmount: string;
  path?: StellarAsset[];
};

type StellarPassiveOfferOperation = {
  type: 'createPassiveOffer';
  source?: string;
  buying: StellarAsset;
  selling: StellarAsset;
  amount: string;
  price: { n: number; d: number };
};

type StellarManageOfferOperation = {
  type: 'manageOffer';
  source?: string;
  buying: StellarAsset;
  selling: StellarAsset;
  amount: string;
  offerId?: string;
  price: { n: number; d: number };
};

type StellarSetOptionsOperation = {
  type: 'setOptions';
  source?: string;
  signer?: {
    type: 0 | 1 | 2;
    key: string | Buffer;
    weight?: number;
  };
  inflationDest?: string;
  clearFlags?: number;
  setFlags?: number;
  masterWeight?: number | string;
  lowThreshold?: number | string;
  medThreshold?: number | string;
  highThreshold?: number | string;
  homeDomain?: string;
};

type StellarChangeTrustOperation = {
  type: 'changeTrust';
  source?: string;
  line: StellarAsset;
  limit?: string;
};

type StellarAllowTrustOperation = {
  type: 'allowTrust';
  source?: string;
  trustor: string;
  assetCode: string;
  assetType: number;
  authorize?: boolean | typeof undefined;
};

type StellarAccountMergeOperation = {
  type: 'accountMerge';
  source?: string;
  destination: string;
};

type StellarManageDataOperation = {
  type: 'manageData';
  source?: string;
  name: string;
  value?: Buffer | string;
};

type StellarBumpSequenceOperation = {
  type: 'bumpSequence';
  source?: string;
  bumpTo: string;
};

type StellarInflationOperation = {
  type: 'inflation';
  source?: string;
};

export type StellarOperation =
  | StellarCreateAccountOperation
  | StellarPaymentOperation
  | StellarPathPaymentOperation
  | StellarPassiveOfferOperation
  | StellarManageOfferOperation
  | StellarSetOptionsOperation
  | StellarChangeTrustOperation
  | StellarAllowTrustOperation
  | StellarAccountMergeOperation
  | StellarInflationOperation
  | StellarManageDataOperation
  | StellarBumpSequenceOperation;

export type StellarTransaction = {
  source: string;
  fee: number;
  sequence: string | number;
  timebounds?: {
    minTime: number;
    maxTime: number;
  };
  memo?: {
    type: 0 | 1 | 2 | 3 | 4;
    id?: string;
    text?: string;
    hash?: string | Buffer;
  };
  operations: StellarOperation[];
};

export type StellarSignTransactionParams = {
  path: string | number[];
  networkPassphrase: string;
  transaction: StellarTransaction;
};

export declare function stellarSignTransaction(
  connectId: string,
  params: CommonParams & StellarSignTransactionParams
): Response<StellarSignedTx>;
