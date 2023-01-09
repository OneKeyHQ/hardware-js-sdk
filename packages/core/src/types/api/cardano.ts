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

export interface CardanoToken {
  assetNameBytes: string;
  amount?: string;
  mintAmount?: string;
}

export interface CardanoAssetGroup {
  policyId: string;
  tokenAmounts: CardanoToken[];
}

export type AssetGroupWithTokens = {
  policyId: string;
  tokens: PROTO.CardanoToken[];
};

export interface CardanoCertificate {
  type: PROTO.CardanoCertificateType;
  path?: string | number[];
  pool?: string;
  poolParameters?: CardanoPoolParameters;
  scriptHash?: string;
  keyHash?: string;
}

export type CertificateWithPoolOwnersAndRelays = {
  certificate: PROTO.CardanoTxCertificate;
  poolOwners: PROTO.CardanoPoolOwner[];
  poolRelays: PROTO.CardanoPoolRelayParameters[];
};

export interface CardanoPoolOwner {
  stakingKeyPath?: string | number[];
  stakingKeyHash?: string;
}

export interface CardanoPoolRelay {
  type: PROTO.CardanoPoolRelayType;
  ipv4Address?: string;
  ipv6Address?: string;
  port?: number;
  hostName?: string;
}

export interface CardanoPoolMetadata {
  url: string;
  hash: string;
}

export interface CardanoPoolMargin {
  numerator: string;
  denominator: string;
}

export interface CardanoPoolParameters {
  poolId: string;
  vrfKeyHash: string;
  pledge: string;
  cost: string;
  margin: CardanoPoolMargin;
  rewardAccount: string;
  owners: CardanoPoolOwner[];
  relays: CardanoPoolRelay[];
  metadata: CardanoPoolMetadata;
}

export interface CardanoInput {
  path?: string | number[];
  prev_hash: string;
  prev_index: number;
}

export type CardanoOutput = (
  | {
      addressParameters: CardanoAddressParameters;
    }
  | {
      address: string;
    }
) & {
  amount: string;
  tokenBundle?: CardanoAssetGroup[];
  datumHash?: string;
  format?: PROTO.CardanoTxOutputSerializationFormat;
  inlineDatum?: string;
  referenceScript?: string;
};

export interface CardanoWithdrawal {
  path?: string | number[];
  amount: string;
  scriptHash?: string;
  keyHash?: string;
}

export type CardanoMint = CardanoAssetGroup[];

export interface CardanoCollateralInput {
  path?: string | number[];
  prev_hash: string;
  prev_index: number;
}

export interface CardanoRequiredSigner {
  keyPath?: string | number[];
  keyHash?: string;
}

export interface CardanoReferenceInput {
  prev_hash: string;
  prev_index: number;
}

export interface CardanoGovernanceRegistrationDelegation {
  votingPublicKey: string;
  weight: number;
}

export interface CardanoCatalystRegistrationParameters {
  votingPublicKey: string;
  stakingPath: string | number[];
  rewardAddressParameters: CardanoAddressParameters;
  nonce: string;
}

export interface CardanoGovernanceRegistrationParameters {
  votingPublicKey?: string;
  stakingPath: string | number[];
  rewardAddressParameters: CardanoAddressParameters;
  nonce: string;
  format?: PROTO.CardanoGovernanceRegistrationFormat;
  delegations?: CardanoGovernanceRegistrationDelegation[];
  votingPurpose?: number;
}

export interface CardanoAuxiliaryData {
  hash?: string;
  governanceRegistrationParameters?: CardanoGovernanceRegistrationParameters;
}

export interface CardanoSignTransaction {
  inputs: CardanoInput[];
  outputs: CardanoOutput[];
  fee: string;
  ttl?: string;
  certificates?: CardanoCertificate[];
  withdrawals?: CardanoWithdrawal[];
  validityIntervalStart?: string;
  auxiliaryData?: CardanoAuxiliaryData;
  mint?: CardanoMint;
  scriptDataHash?: string;
  collateralInputs?: CardanoCollateralInput[];
  requiredSigners?: CardanoRequiredSigner[];
  collateralReturn?: CardanoOutput;
  totalCollateral?: string;
  referenceInputs?: CardanoReferenceInput[];
  additionalWitnessRequests?: (string | number[])[];
  protocolMagic: number;
  networkId: number;
  signingMode: PROTO.CardanoTxSigningMode;
  derivationType?: PROTO.CardanoDerivationType;
  includeNetworkId?: boolean;
}

export interface CardanoSignedTxWitness {
  type: PROTO.CardanoTxWitnessType;
  pubKey: string;
  signature: string;
  chainCode?: string;
}

export interface CardanoAuxiliaryDataSupplement {
  type: PROTO.CardanoTxAuxiliaryDataSupplementType;
  auxiliaryDataHash: string;
  catalystSignature?: string;
}

export interface CardanoSignedTxData {
  hash: string;
  witnesses: CardanoSignedTxWitness[];
  auxiliaryDataSupplement?: CardanoAuxiliaryDataSupplement;
}
