import type { PROTO } from '../../constants';

export interface CardanoAddressParameters {
  addressType: PROTO.CardanoAddressType;
  path?: string | number[];
  stakingPath?: string | number[];
  stakingKeyHash?: string;
  certificatePointer?: CardanoCertificatePointer;
  paymentScriptHash?: string;
  stakingScriptHash?: string;
}

export interface CardanoCertificatePointer {
  blockIndex: number;
  txIndex: number;
  certificateIndex: number;
}
