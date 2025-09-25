// This file is auto generated from data/messages/message.json

// custom type uint32/64 may be represented as string
export type UintType = string | number;

// AlephiumGetAddress
export type AlephiumGetAddress = {
  address_n: number[];
  show_display?: boolean;
  include_public_key?: boolean;
  target_group?: number;
};

// AlephiumAddress
export type AlephiumAddress = {
  address: string;
  public_key?: string;
  derived_path: number[];
};

// AlephiumSignTx
export type AlephiumSignTx = {
  address_n: number[];
  data_initial_chunk: string;
  data_length?: number;
};

// AlephiumSignedTx
export type AlephiumSignedTx = {
  signature: string;
  address: string;
};

// AlephiumTxRequest
export type AlephiumTxRequest = {
  data_length?: number;
  public_key?: string;
  signature?: string;
};

// AlephiumTxAck
export type AlephiumTxAck = {
  data_chunk: string;
};

// AlephiumBytecodeRequest
export type AlephiumBytecodeRequest = {
  data_length?: number;
  public_key?: string;
  signature?: string;
};

// AlephiumBytecodeAck
export type AlephiumBytecodeAck = {
  bytecode_data: string;
};

// AlephiumSignMessage
export type AlephiumSignMessage = {
  address_n: number[];
  message?: string;
  message_type?: string;
};

// AlephiumMessageSignature
export type AlephiumMessageSignature = {
  signature?: string;
  address?: string;
};

// AlgorandGetAddress
export type AlgorandGetAddress = {
  address_n: number[];
  show_display?: boolean;
};

// AlgorandAddress
export type AlgorandAddress = {
  address?: string;
};

// AlgorandSignTx
export type AlgorandSignTx = {
  address_n: number[];
  raw_tx: string;
};

// AlgorandSignedTx
export type AlgorandSignedTx = {
  signature: string;
};

// AptosGetAddress
export type AptosGetAddress = {
  address_n: number[];
  show_display?: boolean;
};

// AptosAddress
export type AptosAddress = {
  address?: string;
};

export enum AptosTransactionType {
  STANDARD = 0,
  WITH_DATA = 1,
}

// AptosSignTx
export type AptosSignTx = {
  address_n: number[];
  raw_tx: string;
  tx_type?: AptosTransactionType;
};

// AptosSignedTx
export type AptosSignedTx = {
  public_key: string;
  signature: string;
};

export type AptosMessagePayload = {
  address?: string;
  chain_id?: string;
  application?: string;
  nonce: string;
  message: string;
};

// AptosSignMessage
export type AptosSignMessage = {
  address_n: number[];
  payload: AptosMessagePayload;
};

// AptosMessageSignature
export type AptosMessageSignature = {
  signature: string;
  address: string;
};

// AptosSignSIWAMessage
export type AptosSignSIWAMessage = {
  address_n: number[];
  siwa_payload: string;
};

// BenfenGetAddress
export type BenfenGetAddress = {
  address_n: number[];
  show_display?: boolean;
};

// BenfenAddress
export type BenfenAddress = {
  address?: string;
};

// BenfenSignTx
export type BenfenSignTx = {
  address_n: number[];
  raw_tx: string;
  data_initial_chunk?: string;
  coin_type?: string;
  data_length?: number;
};

// BenfenSignedTx
export type BenfenSignedTx = {
  public_key: string;
  signature: string;
};

// BenfenTxRequest
export type BenfenTxRequest = {
  data_length?: number;
  public_key?: string;
  signature?: string;
};

// BenfenTxAck
export type BenfenTxAck = {
  data_chunk: string;
};

// BenfenSignMessage
export type BenfenSignMessage = {
  address_n: number[];
  message: string;
};

// BenfenMessageSignature
export type BenfenMessageSignature = {
  signature: string;
  address: string;
};

// BinanceGetAddress
export type BinanceGetAddress = {
  address_n: number[];
  show_display?: boolean;
};

// BinanceAddress
export type BinanceAddress = {
  address: string;
};

// BinanceGetPublicKey
export type BinanceGetPublicKey = {
  address_n: number[];
  show_display?: boolean;
};

// BinancePublicKey
export type BinancePublicKey = {
  public_key: string;
};

// BinanceSignTx
export type BinanceSignTx = {
  address_n: number[];
  msg_count?: number;
  account_number?: number;
  chain_id?: string;
  memo?: string;
  sequence?: number;
  source?: number;
};

// BinanceTxRequest
export type BinanceTxRequest = {};

export type BinanceCoin = {
  amount?: UintType;
  denom?: string;
};

export type BinanceInputOutput = {
  address?: string;
  coins: BinanceCoin[];
};

// BinanceTransferMsg
export type BinanceTransferMsg = {
  inputs: BinanceInputOutput[];
  outputs: BinanceInputOutput[];
};

export enum BinanceOrderType {
  OT_UNKNOWN = 0,
  MARKET = 1,
  LIMIT = 2,
  OT_RESERVED = 3,
}

export enum BinanceOrderSide {
  SIDE_UNKNOWN = 0,
  BUY = 1,
  SELL = 2,
}

export enum BinanceTimeInForce {
  TIF_UNKNOWN = 0,
  GTE = 1,
  TIF_RESERVED = 2,
  IOC = 3,
}

// BinanceOrderMsg
export type BinanceOrderMsg = {
  id?: string;
  ordertype?: BinanceOrderType;
  price?: number;
  quantity?: number;
  sender?: string;
  side?: BinanceOrderSide;
  symbol?: string;
  timeinforce?: BinanceTimeInForce;
};

// BinanceCancelMsg
export type BinanceCancelMsg = {
  refid?: string;
  sender?: string;
  symbol?: string;
};

// BinanceSignedTx
export type BinanceSignedTx = {
  signature: string;
  public_key: string;
};

export enum Enum_InputScriptType {
  SPENDADDRESS = 0,
  SPENDMULTISIG = 1,
  EXTERNAL = 2,
  SPENDWITNESS = 3,
  SPENDP2SHWITNESS = 4,
  SPENDTAPROOT = 5,
}
export type InputScriptType = keyof typeof Enum_InputScriptType;

export enum Enum_OutputScriptType {
  PAYTOADDRESS = 0,
  PAYTOSCRIPTHASH = 1,
  PAYTOMULTISIG = 2,
  PAYTOOPRETURN = 3,
  PAYTOWITNESS = 4,
  PAYTOP2SHWITNESS = 5,
  PAYTOTAPROOT = 6,
}
export type OutputScriptType = keyof typeof Enum_OutputScriptType;

export enum DecredStakingSpendType {
  SSGen = 0,
  SSRTX = 1,
}

export enum AmountUnit {
  BITCOIN = 0,
  MILLIBITCOIN = 1,
  MICROBITCOIN = 2,
  SATOSHI = 3,
}

// HDNodeType
export type HDNodeType = {
  depth: number;
  fingerprint: number;
  child_num: number;
  chain_code: string;
  private_key?: string;
  public_key: string;
};

export type HDNodePathType = {
  node: HDNodeType | string;
  address_n: number[];
};

// MultisigRedeemScriptType
export type MultisigRedeemScriptType = {
  pubkeys: HDNodePathType[];
  signatures: string[];
  m: number;
  nodes?: HDNodeType[];
  address_n?: number[];
};

// GetPublicKey
export type GetPublicKey = {
  address_n: number[];
  ecdsa_curve_name?: string;
  show_display?: boolean;
  coin_name?: string;
  script_type?: InputScriptType;
  ignore_xpub_magic?: boolean;
};

// PublicKey
export type PublicKey = {
  node: HDNodeType;
  xpub: string;
  root_fingerprint?: number;
};

// GetAddress
export type GetAddress = {
  address_n: number[];
  coin_name?: string;
  show_display?: boolean;
  multisig?: MultisigRedeemScriptType;
  script_type?: InputScriptType;
  ignore_xpub_magic?: boolean;
};

// Address
export type Address = {
  address: string;
};

// GetOwnershipId
export type GetOwnershipId = {
  address_n: number[];
  coin_name?: string;
  multisig?: MultisigRedeemScriptType;
  script_type?: InputScriptType;
};

// OwnershipId
export type OwnershipId = {
  ownership_id: string;
};

// SignMessage
export type SignMessage = {
  address_n: number[];
  message: string;
  coin_name?: string;
  script_type?: InputScriptType;
  no_script_type?: boolean;
  is_bip322_simple?: boolean;
};

// MessageSignature
export type MessageSignature = {
  address: string;
  signature: string;
};

// VerifyMessage
export type VerifyMessage = {
  address: string;
  signature: string;
  message: string;
  coin_name?: string;
};

// SignTx
export type SignTx = {
  outputs_count: number;
  inputs_count: number;
  coin_name?: string;
  version?: number;
  lock_time?: number;
  expiry?: number;
  overwintered?: boolean;
  version_group_id?: number;
  timestamp?: number;
  branch_id?: number;
  amount_unit?: AmountUnit;
  decred_staking_ticket?: boolean;
};

export enum Enum_RequestType {
  TXINPUT = 0,
  TXOUTPUT = 1,
  TXMETA = 2,
  TXFINISHED = 3,
  TXEXTRADATA = 4,
  TXORIGINPUT = 5,
  TXORIGOUTPUT = 6,
}
export type RequestType = keyof typeof Enum_RequestType;

export type TxRequestDetailsType = {
  request_index: number;
  tx_hash?: string;
  extra_data_len?: number;
  extra_data_offset?: number;
};

export type TxRequestSerializedType = {
  signature_index?: number;
  signature?: string;
  serialized_tx?: string;
};

// TxRequest
export type TxRequest = {
  request_type: RequestType;
  details: TxRequestDetailsType;
  serialized?: TxRequestSerializedType;
};

// TxInputType replacement
// TxInputType needs more exact types
// differences: external input (no address_n + required script_pubkey)

export type InternalInputScriptType = Exclude<InputScriptType, 'EXTERNAL'>;

type CommonTxInputType = {
  prev_hash: string; // required: previous transaction hash (reversed)
  prev_index: number; // required: previous transaction index
  amount: UintType; // required
  sequence?: number;
  multisig?: MultisigRedeemScriptType;
  decred_tree?: number;
  orig_hash?: string; // RBF
  orig_index?: number; // RBF
  decred_staking_spend?: DecredStakingSpendType;
  script_pubkey?: string; // required if script_type=EXTERNAL
  script_sig?: string; // used by EXTERNAL, depending on script_pubkey
  witness?: string; // used by EXTERNAL, depending on script_pubkey
  ownership_proof?: string; // used by EXTERNAL, depending on script_pubkey
  commitment_data?: string; // used by EXTERNAL, depending on ownership_proof
};

export type TxInputType =
  | (CommonTxInputType & {
      address_n: number[];
      script_type?: InternalInputScriptType;
    })
  | (CommonTxInputType & {
      address_n?: typeof undefined;
      script_type: 'EXTERNAL';
      script_pubkey: string;
    });

export type TxInput = TxInputType;

// TxInputType replacement end

export type TxOutputBinType = {
  amount: UintType;
  script_pubkey: string;
  decred_script_version?: number;
};

// TxOutputType replacement
// TxOutputType needs more exact types
// differences: external output (no address_n), opreturn output (no address_n, no address)

export type ChangeOutputScriptType = Exclude<OutputScriptType, 'PAYTOOPRETURN'>;

export type TxOutputType =
  | {
      address: string;
      address_n?: typeof undefined;
      script_type: 'PAYTOADDRESS';
      amount: UintType;
      multisig?: MultisigRedeemScriptType;
      orig_hash?: string;
      orig_index?: number;
      payment_req_index?: number;
    }
  | {
      address?: typeof undefined;
      address_n: number[];
      script_type: ChangeOutputScriptType;
      amount: UintType;
      multisig?: MultisigRedeemScriptType;
      orig_hash?: string;
      orig_index?: number;
      payment_req_index?: number;
    }
  | {
      address?: typeof undefined;
      address_n?: typeof undefined;
      amount: '0';
      op_return_data: string;
      script_type: 'PAYTOOPRETURN';
      orig_hash?: string;
      orig_index?: number;
      payment_req_index?: number;
    };

export type TxOutput = TxOutputType;

// - TxOutputType replacement end

// PrevTx
export type PrevTx = {
  version: number;
  lock_time: number;
  inputs_count: number;
  outputs_count: number;
  extra_data_len?: number;
  expiry?: number;
  version_group_id?: number;
  timestamp?: number;
  branch_id?: number;
};

// PrevInput
export type PrevInput = {
  prev_hash: string;
  prev_index: number;
  script_sig: string;
  sequence: number;
  decred_tree?: number;
};

// PrevOutput
export type PrevOutput = {
  amount: UintType;
  script_pubkey: string;
  decred_script_version?: number;
};

// TxAck

// TxAck replacement
// TxAck needs more exact types
// PrevInput and TxInputType requires exact responses in TxAckResponse
// main difference: PrevInput should not contain address_n (unexpected field by protobuf)

export type TxAckResponse =
  | {
      inputs: Array<TxInputType | PrevInput>;
    }
  | {
      bin_outputs: TxOutputBinType[];
    }
  | {
      outputs: TxOutputType[];
    }
  | {
      extra_data: string;
    }
  | {
      version?: number;
      lock_time?: number;
      inputs_cnt: number;
      outputs_cnt: number;
      extra_data?: string;
      extra_data_len?: number;
      timestamp?: number;
      version_group_id?: number;
      expiry?: number;
      branch_id?: number;
    };

export type TxAck = {
  tx: TxAckResponse;
};
// - TxAck replacement end

export type TxAckInputWrapper = {
  input: TxInput;
};

// TxAckInput
export type TxAckInput = {
  tx: TxAckInputWrapper;
};

export type TxAckOutputWrapper = {
  output: TxOutput;
};

// TxAckOutput
export type TxAckOutput = {
  tx: TxAckOutputWrapper;
};

// TxAckPrevMeta
export type TxAckPrevMeta = {
  tx: PrevTx;
};

export type TxAckPrevInputWrapper = {
  input: PrevInput;
};

// TxAckPrevInput
export type TxAckPrevInput = {
  tx: TxAckPrevInputWrapper;
};

export type TxAckPrevOutputWrapper = {
  output: PrevOutput;
};

// TxAckPrevOutput
export type TxAckPrevOutput = {
  tx: TxAckPrevOutputWrapper;
};

export type TxAckPrevExtraDataWrapper = {
  extra_data_chunk: string;
};

// TxAckPrevExtraData
export type TxAckPrevExtraData = {
  tx: TxAckPrevExtraDataWrapper;
};

// GetOwnershipProof
export type GetOwnershipProof = {
  address_n: number[];
  coin_name?: string;
  script_type?: InputScriptType;
  multisig?: MultisigRedeemScriptType;
  user_confirmation?: boolean;
  ownership_ids?: string[];
  commitment_data?: string;
};

// OwnershipProof
export type OwnershipProof = {
  ownership_proof: string;
  signature: string;
};

// AuthorizeCoinJoin
export type AuthorizeCoinJoin = {
  coordinator: string;
  max_total_fee: number;
  fee_per_anonymity?: number;
  address_n: number[];
  coin_name?: string;
  script_type?: InputScriptType;
  amount_unit?: AmountUnit;
};

export type BIP32Address = {
  address_n: number[];
};

// GetPublicKeyMultiple
export type GetPublicKeyMultiple = {
  addresses: BIP32Address[];
  ecdsa_curve_name?: string;
  show_display?: boolean;
  coin_name?: string;
  script_type?: InputScriptType;
  ignore_xpub_magic?: boolean;
};

// PublicKeyMultiple
export type PublicKeyMultiple = {
  xpubs: string[];
};

// SignPsbt
export type SignPsbt = {
  psbt: string;
  coin_name?: string;
};

// SignedPsbt
export type SignedPsbt = {
  psbt: string;
};

// FirmwareErase
export type FirmwareErase = {
  length?: number;
};

// FirmwareRequest
export type FirmwareRequest = {
  offset?: number;
  length?: number;
};

// FirmwareUpload
export type FirmwareUpload = {
  payload: Buffer | ArrayBuffer;
  hash?: string;
};

// SelfTest
export type SelfTest = {
  payload?: string;
};

// FirmwareErase_ex
export type FirmwareErase_ex = {
  length?: number;
};

export enum RebootType {
  Normal = 0,
  Boardloader = 1,
  BootLoader = 2,
}

// Reboot
export type Reboot = {
  reboot_type: RebootType;
};

// FirmwareUpdateEmmc
export type FirmwareUpdateEmmc = {
  path: string;
  reboot_on_success?: boolean;
};

export enum CardanoDerivationType {
  LEDGER = 0,
  ICARUS = 1,
  ICARUS_TREZOR = 2,
}

export enum CardanoAddressType {
  BASE = 0,
  BASE_SCRIPT_KEY = 1,
  BASE_KEY_SCRIPT = 2,
  BASE_SCRIPT_SCRIPT = 3,
  POINTER = 4,
  POINTER_SCRIPT = 5,
  ENTERPRISE = 6,
  ENTERPRISE_SCRIPT = 7,
  BYRON = 8,
  REWARD = 14,
  REWARD_SCRIPT = 15,
}

export enum CardanoNativeScriptType {
  PUB_KEY = 0,
  ALL = 1,
  ANY = 2,
  N_OF_K = 3,
  INVALID_BEFORE = 4,
  INVALID_HEREAFTER = 5,
}

export enum CardanoNativeScriptHashDisplayFormat {
  HIDE = 0,
  BECH32 = 1,
  POLICY_ID = 2,
}

export enum CardanoTxOutputSerializationFormat {
  ARRAY_LEGACY = 0,
  MAP_BABBAGE = 1,
}

export enum CardanoCertificateType {
  STAKE_REGISTRATION = 0,
  STAKE_DEREGISTRATION = 1,
  STAKE_DELEGATION = 2,
  STAKE_POOL_REGISTRATION = 3,
  STAKE_REGISTRATION_CONWAY = 7,
  STAKE_DEREGISTRATION_CONWAY = 8,
  VOTE_DELEGATION = 9,
}

export enum CardanoDRepType {
  KEY_HASH = 0,
  SCRIPT_HASH = 1,
  ABSTAIN = 2,
  NO_CONFIDENCE = 3,
}

export enum CardanoPoolRelayType {
  SINGLE_HOST_IP = 0,
  SINGLE_HOST_NAME = 1,
  MULTIPLE_HOST_NAME = 2,
}

export enum CardanoTxAuxiliaryDataSupplementType {
  NONE = 0,
  CVOTE_REGISTRATION_SIGNATURE = 1,
}

export enum CardanoCVoteRegistrationFormat {
  CIP15 = 0,
  CIP36 = 1,
}

export enum CardanoTxSigningMode {
  ORDINARY_TRANSACTION = 0,
  POOL_REGISTRATION_AS_OWNER = 1,
  MULTISIG_TRANSACTION = 2,
  PLUTUS_TRANSACTION = 3,
}

export enum CardanoTxWitnessType {
  BYRON_WITNESS = 0,
  SHELLEY_WITNESS = 1,
}

// CardanoBlockchainPointerType
export type CardanoBlockchainPointerType = {
  block_index: number;
  tx_index: number;
  certificate_index: number;
};

// CardanoNativeScript
export type CardanoNativeScript = {
  type: CardanoNativeScriptType;
  scripts?: CardanoNativeScript[];
  key_hash?: string;
  key_path?: number[];
  required_signatures_count?: number;
  invalid_before?: UintType;
  invalid_hereafter?: UintType;
};

// CardanoGetNativeScriptHash
export type CardanoGetNativeScriptHash = {
  script: CardanoNativeScript;
  display_format: CardanoNativeScriptHashDisplayFormat;
  derivation_type: CardanoDerivationType;
};

// CardanoNativeScriptHash
export type CardanoNativeScriptHash = {
  script_hash: string;
};

// CardanoAddressParametersType
export type CardanoAddressParametersType = {
  address_type: CardanoAddressType;
  address_n: number[];
  address_n_staking: number[];
  staking_key_hash?: string;
  certificate_pointer?: CardanoBlockchainPointerType;
  script_payment_hash?: string;
  script_staking_hash?: string;
};

// CardanoGetAddress
export type CardanoGetAddress = {
  show_display?: boolean;
  protocol_magic: number;
  network_id: number;
  address_parameters: CardanoAddressParametersType;
  derivation_type: CardanoDerivationType;
  chunkify?: boolean;
};

// CardanoAddress
export type CardanoAddress = {
  address: string;
};

// CardanoGetPublicKey
export type CardanoGetPublicKey = {
  address_n: number[];
  show_display?: boolean;
  derivation_type: CardanoDerivationType;
};

// CardanoPublicKey
export type CardanoPublicKey = {
  xpub: string;
  node: HDNodeType;
};

// CardanoSignTxInit
export type CardanoSignTxInit = {
  signing_mode: CardanoTxSigningMode;
  protocol_magic: number;
  network_id: number;
  inputs_count: number;
  outputs_count: number;
  fee: UintType;
  ttl?: UintType;
  certificates_count: number;
  withdrawals_count: number;
  has_auxiliary_data: boolean;
  validity_interval_start?: UintType;
  witness_requests_count: number;
  minting_asset_groups_count: number;
  derivation_type: CardanoDerivationType;
  include_network_id?: boolean;
  script_data_hash?: string;
  collateral_inputs_count: number;
  required_signers_count: number;
  has_collateral_return?: boolean;
  total_collateral?: UintType;
  reference_inputs_count?: number;
  chunkify?: boolean;
  tag_cbor_sets?: boolean;
};

// CardanoTxInput
export type CardanoTxInput = {
  prev_hash: string;
  prev_index: number;
};

// CardanoTxOutput
export type CardanoTxOutput = {
  address?: string;
  address_parameters?: CardanoAddressParametersType;
  amount: UintType;
  asset_groups_count: number;
  datum_hash?: string;
  format?: CardanoTxOutputSerializationFormat;
  inline_datum_size?: number;
  reference_script_size?: number;
};

// CardanoAssetGroup
export type CardanoAssetGroup = {
  policy_id: string;
  tokens_count: number;
};

// CardanoToken
export type CardanoToken = {
  asset_name_bytes: string;
  amount?: UintType;
  mint_amount?: UintType;
};

// CardanoTxInlineDatumChunk
export type CardanoTxInlineDatumChunk = {
  data: string;
};

// CardanoTxReferenceScriptChunk
export type CardanoTxReferenceScriptChunk = {
  data: string;
};

// CardanoPoolOwner
export type CardanoPoolOwner = {
  staking_key_path?: number[];
  staking_key_hash?: string;
};

// CardanoPoolRelayParameters
export type CardanoPoolRelayParameters = {
  type: CardanoPoolRelayType;
  ipv4_address?: string;
  ipv6_address?: string;
  host_name?: string;
  port?: number;
};

// CardanoPoolMetadataType
export type CardanoPoolMetadataType = {
  url: string;
  hash: string;
};

// CardanoPoolParametersType
export type CardanoPoolParametersType = {
  pool_id: string;
  vrf_key_hash: string;
  pledge: UintType;
  cost: UintType;
  margin_numerator: UintType;
  margin_denominator: UintType;
  reward_account: string;
  metadata?: CardanoPoolMetadataType;
  owners_count: number;
  relays_count: number;
};

// CardanoDRep
export type CardanoDRep = {
  type: CardanoDRepType;
  key_hash?: string;
  script_hash?: string;
};

// CardanoTxCertificate
export type CardanoTxCertificate = {
  type: CardanoCertificateType;
  path?: number[];
  pool?: string;
  pool_parameters?: CardanoPoolParametersType;
  script_hash?: string;
  key_hash?: string;
  deposit?: UintType;
  drep?: CardanoDRep;
};

// CardanoTxWithdrawal
export type CardanoTxWithdrawal = {
  path?: number[];
  amount: UintType;
  script_hash?: string;
  key_hash?: string;
};

// CardanoCVoteRegistrationDelegation
export type CardanoCVoteRegistrationDelegation = {
  vote_public_key: string;
  weight: number;
};

// CardanoCVoteRegistrationParametersType
export type CardanoCVoteRegistrationParametersType = {
  vote_public_key?: string;
  staking_path: number[];
  payment_address_parameters?: CardanoAddressParametersType;
  nonce: number;
  format?: CardanoCVoteRegistrationFormat;
  delegations: CardanoCVoteRegistrationDelegation[];
  voting_purpose?: number;
  payment_address?: string;
};

// CardanoTxAuxiliaryData
export type CardanoTxAuxiliaryData = {
  cvote_registration_parameters?: CardanoCVoteRegistrationParametersType;
  hash?: string;
};

// CardanoTxMint
export type CardanoTxMint = {
  asset_groups_count: number;
};

// CardanoTxCollateralInput
export type CardanoTxCollateralInput = {
  prev_hash: string;
  prev_index: number;
};

// CardanoTxRequiredSigner
export type CardanoTxRequiredSigner = {
  key_hash?: string;
  key_path?: number[];
};

// CardanoTxReferenceInput
export type CardanoTxReferenceInput = {
  prev_hash: string;
  prev_index: number;
};

// CardanoTxItemAck
export type CardanoTxItemAck = {};

// CardanoTxAuxiliaryDataSupplement
export type CardanoTxAuxiliaryDataSupplement = {
  type: CardanoTxAuxiliaryDataSupplementType;
  auxiliary_data_hash?: string;
  cvote_registration_signature?: string;
};

// CardanoTxWitnessRequest
export type CardanoTxWitnessRequest = {
  path: number[];
};

// CardanoTxWitnessResponse
export type CardanoTxWitnessResponse = {
  type: CardanoTxWitnessType;
  pub_key: string;
  signature: string;
  chain_code?: string;
};

// CardanoTxHostAck
export type CardanoTxHostAck = {};

// CardanoTxBodyHash
export type CardanoTxBodyHash = {
  tx_hash: string;
};

// CardanoSignTxFinished
export type CardanoSignTxFinished = {};

// CardanoSignMessage
export type CardanoSignMessage = {
  address_n: number[];
  message: string;
  derivation_type: CardanoDerivationType;
  network_id: number;
  address_type?: CardanoAddressType;
};

// CardanoMessageSignature
export type CardanoMessageSignature = {
  signature: string;
  key: string;
};

// Success
export type Success = {
  message: string;
};

export enum FailureType {
  Failure_UnexpectedMessage = 1,
  Failure_ButtonExpected = 2,
  Failure_DataError = 3,
  Failure_ActionCancelled = 4,
  Failure_PinExpected = 5,
  Failure_PinCancelled = 6,
  Failure_PinInvalid = 7,
  Failure_InvalidSignature = 8,
  Failure_ProcessError = 9,
  Failure_NotEnoughFunds = 10,
  Failure_NotInitialized = 11,
  Failure_PinMismatch = 12,
  Failure_WipeCodeMismatch = 13,
  Failure_InvalidSession = 14,
  Failure_FirmwareError = 99,
}

// Failure
export type Failure = {
  code?: FailureType;
  message?: string;
};

export enum Enum_ButtonRequestType {
  ButtonRequest_Other = 1,
  ButtonRequest_FeeOverThreshold = 2,
  ButtonRequest_ConfirmOutput = 3,
  ButtonRequest_ResetDevice = 4,
  ButtonRequest_ConfirmWord = 5,
  ButtonRequest_WipeDevice = 6,
  ButtonRequest_ProtectCall = 7,
  ButtonRequest_SignTx = 8,
  ButtonRequest_FirmwareCheck = 9,
  ButtonRequest_Address = 10,
  ButtonRequest_PublicKey = 11,
  ButtonRequest_MnemonicWordCount = 12,
  ButtonRequest_MnemonicInput = 13,
  _Deprecated_ButtonRequest_PassphraseType = 14,
  ButtonRequest_UnknownDerivationPath = 15,
  ButtonRequest_RecoveryHomepage = 16,
  ButtonRequest_Success = 17,
  ButtonRequest_Warning = 18,
  ButtonRequest_PassphraseEntry = 19,
  ButtonRequest_PinEntry = 20,
  ButtonRequest_AttachPin = 8000,
}
export type ButtonRequestType = keyof typeof Enum_ButtonRequestType;

// ButtonRequest
export type ButtonRequest = {
  code?: ButtonRequestType;
  pages?: number;
};

// ButtonAck
export type ButtonAck = {};

export enum Enum_PinMatrixRequestType {
  PinMatrixRequestType_Current = 1,
  PinMatrixRequestType_NewFirst = 2,
  PinMatrixRequestType_NewSecond = 3,
  PinMatrixRequestType_WipeCodeFirst = 4,
  PinMatrixRequestType_WipeCodeSecond = 5,
  PinMatrixRequestType_BackupFirst = 6,
  PinMatrixRequestType_BackupSecond = 7,
  PinMatrixRequestType_AttachToPin = 8000,
}
export type PinMatrixRequestType = keyof typeof Enum_PinMatrixRequestType;

// PinMatrixRequest
export type PinMatrixRequest = {
  type?: PinMatrixRequestType;
};

// PinMatrixAck
export type PinMatrixAck = {
  pin: string;
  new_pin?: string;
};

// PassphraseRequest
export type PassphraseRequest = {
  _on_device?: boolean;
  exists_attach_pin_user?: boolean;
};

// PassphraseAck
export type PassphraseAck = {
  passphrase?: string;
  _state?: string;
  on_device?: boolean;
  on_device_attach_pin?: boolean;
};

// Deprecated_PassphraseStateRequest
export type Deprecated_PassphraseStateRequest = {
  state?: string;
};

// Deprecated_PassphraseStateAck
export type Deprecated_PassphraseStateAck = {};

// BixinPinInputOnDevice
export type BixinPinInputOnDevice = {};

// ConfluxGetAddress
export type ConfluxGetAddress = {
  address_n: number[];
  show_display?: boolean;
  chain_id?: number;
};

// ConfluxAddress
export type ConfluxAddress = {
  address?: string;
};

// ConfluxSignTx
export type ConfluxSignTx = {
  address_n: number[];
  nonce?: string;
  gas_price?: string;
  gas_limit?: string;
  to?: string;
  value?: string;
  epoch_height?: string;
  storage_limit?: string;
  data_initial_chunk?: string;
  data_length?: number;
  chain_id?: number;
};

// ConfluxTxRequest
export type ConfluxTxRequest = {
  data_length?: number;
  signature_v?: number;
  signature_r?: string;
  signature_s?: string;
};

// ConfluxTxAck
export type ConfluxTxAck = {
  data_chunk?: string;
};

// ConfluxSignMessage
export type ConfluxSignMessage = {
  address_n: number[];
  message?: string;
};

// ConfluxMessageSignature
export type ConfluxMessageSignature = {
  signature?: string;
  address?: string;
};

// ConfluxSignMessageCIP23
export type ConfluxSignMessageCIP23 = {
  address_n: number[];
  domain_hash?: string;
  message_hash?: string;
};

// CosmosGetAddress
export type CosmosGetAddress = {
  address_n: number[];
  hrp?: string;
  show_display?: boolean;
};

// CosmosAddress
export type CosmosAddress = {
  address?: string;
};

// CosmosSignTx
export type CosmosSignTx = {
  address_n: number[];
  raw_tx: string;
};

// CosmosSignedTx
export type CosmosSignedTx = {
  signature: string;
};

// CipherKeyValue
export type CipherKeyValue = {
  address_n: number[];
  key: string;
  value: string;
  encrypt?: boolean;
  ask_on_encrypt?: boolean;
  ask_on_decrypt?: boolean;
  iv?: string;
};

// CipheredKeyValue
export type CipheredKeyValue = {
  value: string;
};

// IdentityType
export type IdentityType = {
  proto?: string;
  user?: string;
  host?: string;
  port?: string;
  path?: string;
  index?: number;
};

// SignIdentity
export type SignIdentity = {
  identity: IdentityType;
  challenge_hidden?: string;
  challenge_visual?: string;
  ecdsa_curve_name?: string;
};

// SignedIdentity
export type SignedIdentity = {
  address: string;
  public_key: string;
  signature: string;
};

// GetECDHSessionKey
export type GetECDHSessionKey = {
  identity: IdentityType;
  peer_public_key: string;
  ecdsa_curve_name?: string;
};

// ECDHSessionKey
export type ECDHSessionKey = {
  session_key: string;
  public_key?: string;
};

export type Path = {
  address_n: number[];
};

// BatchGetPublickeys
export type BatchGetPublickeys = {
  ecdsa_curve_name?: string;
  paths: Path[];
  include_node?: boolean;
};

// EcdsaPublicKeys
export type EcdsaPublicKeys = {
  public_keys: string[];
  hd_nodes: HDNodeType[];
  root_fingerprint?: number;
};

// DnxGetAddress
export type DnxGetAddress = {
  address_n: number[];
  show_display?: boolean;
};

// DnxAddress
export type DnxAddress = {
  address?: string;
};

// DnxSignTx
export type DnxSignTx = {
  address_n: number[];
  inputs_count: number;
  to_address: string;
  amount: UintType;
  fee: UintType;
  payment_id?: string;
};

export type DnxTxKey = {
  ephemeral_tx_sec_key?: string;
  ephemeral_tx_pub_key?: string;
};

export type DnxComputedKeyImage = {
  key_image?: string;
};

// DnxInputRequest
export type DnxInputRequest = {
  request_index?: number;
  tx_key?: DnxTxKey;
  computed_key_image?: DnxComputedKeyImage;
};

// DnxInputAck
export type DnxInputAck = {
  prev_index: number;
  global_index: number;
  tx_pubkey: string;
  prev_out_pubkey: string;
  amount: UintType;
};

// DnxRTSigsRequest
export type DnxRTSigsRequest = {};

// DnxSignedTx
export type DnxSignedTx = {
  signatures: string[];
  output_keys: string[];
};

// EmmcFixPermission
export type EmmcFixPermission = {};

// EmmcPath
export type EmmcPath = {
  exist: boolean;
  size: number;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  readonly: boolean;
  hidden: boolean;
  system: boolean;
  archive: boolean;
  directory: boolean;
};

// EmmcPathInfo
export type EmmcPathInfo = {
  path: string;
};

// EmmcFile
export type EmmcFile = {
  path: string;
  offset: number;
  len: number;
  data?: string;
  data_hash?: number;
  processed_byte?: number;
};

// EmmcFileRead
export type EmmcFileRead = {
  file: EmmcFile;
  ui_percentage?: number;
};

// EmmcFileWrite
export type EmmcFileWrite = {
  file: EmmcFile;
  overwrite: boolean;
  append: boolean;
  ui_percentage?: number;
};

// EmmcFileDelete
export type EmmcFileDelete = {
  path: string;
};

// EmmcDir
export type EmmcDir = {
  path: string;
  child_dirs?: string;
  child_files?: string;
};

// EmmcDirList
export type EmmcDirList = {
  path: string;
};

// EmmcDirMake
export type EmmcDirMake = {
  path: string;
};

// EmmcDirRemove
export type EmmcDirRemove = {
  path: string;
};

// EosGetPublicKey
export type EosGetPublicKey = {
  address_n: number[];
  show_display?: boolean;
};

// EosPublicKey
export type EosPublicKey = {
  wif_public_key: string;
  raw_public_key: string;
};

export type EosTxHeader = {
  expiration: number;
  ref_block_num: number;
  ref_block_prefix: number;
  max_net_usage_words: number;
  max_cpu_usage_ms: number;
  delay_sec: number;
};

// EosSignTx
export type EosSignTx = {
  address_n: number[];
  chain_id?: string;
  header?: EosTxHeader;
  num_actions?: number;
};

// EosTxActionRequest
export type EosTxActionRequest = {
  data_size?: number;
};

export type EosAsset = {
  amount?: UintType;
  symbol?: string;
};

export type EosPermissionLevel = {
  actor?: string;
  permission?: string;
};

export type EosAuthorizationKey = {
  type?: number;
  key: string;
  address_n?: number[];
  weight: number;
};

export type EosAuthorizationAccount = {
  account?: EosPermissionLevel;
  weight?: number;
};

export type EosAuthorizationWait = {
  wait_sec?: number;
  weight?: number;
};

export type EosAuthorization = {
  threshold?: number;
  keys: EosAuthorizationKey[];
  accounts: EosAuthorizationAccount[];
  waits: EosAuthorizationWait[];
};

export type EosActionCommon = {
  account?: string;
  name?: string;
  authorization: EosPermissionLevel[];
};

export type EosActionTransfer = {
  sender?: string;
  receiver?: string;
  quantity?: EosAsset;
  memo?: string;
};

export type EosActionDelegate = {
  sender?: string;
  receiver?: string;
  net_quantity?: EosAsset;
  cpu_quantity?: EosAsset;
  transfer?: boolean;
};

export type EosActionUndelegate = {
  sender?: string;
  receiver?: string;
  net_quantity?: EosAsset;
  cpu_quantity?: EosAsset;
};

export type EosActionRefund = {
  owner?: string;
};

export type EosActionBuyRam = {
  payer?: string;
  receiver?: string;
  quantity?: EosAsset;
};

export type EosActionBuyRamBytes = {
  payer?: string;
  receiver?: string;
  bytes?: number;
};

export type EosActionSellRam = {
  account?: string;
  bytes?: number;
};

export type EosActionVoteProducer = {
  voter?: string;
  proxy?: string;
  producers: string[];
};

export type EosActionUpdateAuth = {
  account?: string;
  permission?: string;
  parent?: string;
  auth?: EosAuthorization;
};

export type EosActionDeleteAuth = {
  account?: string;
  permission?: string;
};

export type EosActionLinkAuth = {
  account?: string;
  code?: string;
  type?: string;
  requirement?: string;
};

export type EosActionUnlinkAuth = {
  account?: string;
  code?: string;
  type?: string;
};

export type EosActionNewAccount = {
  creator?: string;
  name?: string;
  owner?: EosAuthorization;
  active?: EosAuthorization;
};

export type EosActionUnknown = {
  data_size: number;
  data_chunk?: string;
};

// EosTxActionAck
export type EosTxActionAck = {
  common?: EosActionCommon;
  transfer?: EosActionTransfer;
  delegate?: EosActionDelegate;
  undelegate?: EosActionUndelegate;
  refund?: EosActionRefund;
  buy_ram?: EosActionBuyRam;
  buy_ram_bytes?: EosActionBuyRamBytes;
  sell_ram?: EosActionSellRam;
  vote_producer?: EosActionVoteProducer;
  update_auth?: EosActionUpdateAuth;
  delete_auth?: EosActionDeleteAuth;
  link_auth?: EosActionLinkAuth;
  unlink_auth?: EosActionUnlinkAuth;
  new_account?: EosActionNewAccount;
  unknown?: EosActionUnknown;
};

// EosSignedTx
export type EosSignedTx = {
  signature: string;
};

export enum EthereumDefinitionType {
  NETWORK = 0,
  TOKEN = 1,
}

// EthereumNetworkInfo
export type EthereumNetworkInfo = {
  chain_id: number;
  symbol: string;
  slip44: number;
  name: string;
  icon?: string;
  primary_color?: number;
};

// EthereumTokenInfo
export type EthereumTokenInfo = {
  address: string;
  chain_id: number;
  symbol: string;
  decimals: number;
  name: string;
};

// EthereumDefinitions
export type EthereumDefinitions = {
  encoded_network?: ArrayBuffer;
  encoded_token?: ArrayBuffer;
};

// EthereumSignTypedDataOneKey
export type EthereumSignTypedDataOneKey = {
  address_n: number[];
  primary_type: string;
  metamask_v4_compat?: boolean;
  chain_id?: number;
};

export enum EthereumGnosisSafeTxOperation {
  CALL = 0,
  DELEGATE_CALL = 1,
}

// EthereumGnosisSafeTxRequest
export type EthereumGnosisSafeTxRequest = {};

// EthereumGnosisSafeTxAck
export type EthereumGnosisSafeTxAck = {
  to: string;
  value: string;
  data?: string;
  operation: EthereumGnosisSafeTxOperation;
  safeTxGas: string;
  baseGas: string;
  gasPrice: string;
  gasToken: string;
  refundReceiver: string;
  nonce: string;
  chain_id: number;
  verifyingContract: string;
};

// EthereumTypedDataStructRequestOneKey
export type EthereumTypedDataStructRequestOneKey = {
  name: string;
};

export type EthereumStructMemberOneKey = {
  type: EthereumFieldTypeOneKey;
  name: string;
};

export type EthereumFieldTypeOneKey = {
  data_type: EthereumDataTypeOneKey;
  size?: number;
  entry_type?: EthereumFieldTypeOneKey;
  struct_name?: string;
};

export enum EthereumDataTypeOneKey {
  UINT = 1,
  INT = 2,
  BYTES = 3,
  STRING = 4,
  BOOL = 5,
  ADDRESS = 6,
  ARRAY = 7,
  STRUCT = 8,
}

// EthereumTypedDataStructAckOneKey
export type EthereumTypedDataStructAckOneKey = {
  members: EthereumStructMemberOneKey[];
};

// EthereumTypedDataValueRequestOneKey
export type EthereumTypedDataValueRequestOneKey = {
  member_path: number[];
};

// EthereumTypedDataValueAckOneKey
export type EthereumTypedDataValueAckOneKey = {
  value: string;
};

// EthereumSignTypedData
export type EthereumSignTypedData = {
  address_n: number[];
  primary_type: string;
  metamask_v4_compat?: boolean;
  definitions?: EthereumDefinitions;
};

// EthereumTypedDataStructRequest
export type EthereumTypedDataStructRequest = {
  name: string;
};

export enum EthereumDataType {
  UINT = 1,
  INT = 2,
  BYTES = 3,
  STRING = 4,
  BOOL = 5,
  ADDRESS = 6,
  ARRAY = 7,
  STRUCT = 8,
}

export type EthereumFieldType = {
  data_type: EthereumDataType;
  size?: number;
  entry_type?: EthereumFieldType;
  struct_name?: string;
};

export type EthereumStructMember = {
  type: EthereumFieldType;
  name: string;
};

// EthereumTypedDataStructAck
export type EthereumTypedDataStructAck = {
  members: EthereumStructMember[];
};

// EthereumTypedDataValueRequest
export type EthereumTypedDataValueRequest = {
  member_path: number[];
};

// EthereumTypedDataValueAck
export type EthereumTypedDataValueAck = {
  value: string;
};

// EthereumGetPublicKeyOneKey
export type EthereumGetPublicKeyOneKey = {
  address_n: number[];
  show_display?: boolean;
  chain_id?: number;
};

// EthereumPublicKeyOneKey
export type EthereumPublicKeyOneKey = {
  node: HDNodeType;
  xpub: string;
};

// EthereumGetAddressOneKey
export type EthereumGetAddressOneKey = {
  address_n: number[];
  show_display?: boolean;
  chain_id?: number;
};

// EthereumAddressOneKey
export type EthereumAddressOneKey = {
  _old_address?: string;
  address?: string;
};

// EthereumSignTxOneKey
export type EthereumSignTxOneKey = {
  address_n: number[];
  nonce?: string;
  gas_price: string;
  gas_limit: string;
  to?: string;
  value?: string;
  data_initial_chunk?: string;
  data_length?: number;
  chain_id: number;
  tx_type?: number;
};

// EthereumAccessListOneKey
export type EthereumAccessListOneKey = {
  address: string;
  storage_keys: string[];
};

// EthereumSignTxEIP1559OneKey
export type EthereumSignTxEIP1559OneKey = {
  address_n: number[];
  nonce: string;
  max_gas_fee: string;
  max_priority_fee: string;
  gas_limit: string;
  to?: string;
  value: string;
  data_initial_chunk?: string;
  data_length: number;
  chain_id: number;
  access_list: EthereumAccessListOneKey[];
};

// EthereumAuthorizationSignature
export type EthereumAuthorizationSignature = {
  y_parity: number;
  r: string;
  s: string;
};

export type EthereumAuthorizationOneKey = {
  address_n: number[];
  chain_id: number;
  address: string;
  nonce: string;
  signature?: EthereumAuthorizationSignature;
};

// EthereumSignTxEIP7702OneKey
export type EthereumSignTxEIP7702OneKey = {
  address_n: number[];
  nonce: string;
  max_gas_fee: string;
  max_priority_fee: string;
  gas_limit: string;
  to: string;
  value: string;
  data_initial_chunk?: string;
  data_length: number;
  chain_id: number;
  access_list: EthereumAccessListOneKey[];
  authorization_list: EthereumAuthorizationOneKey[];
};

// EthereumTxRequestOneKey
export type EthereumTxRequestOneKey = {
  data_length?: number;
  signature_v?: number;
  signature_r?: string;
  signature_s?: string;
  authorization_signatures: EthereumAuthorizationSignature[];
};

// EthereumTxAckOneKey
export type EthereumTxAckOneKey = {
  data_chunk: string;
};

// EthereumSignMessageOneKey
export type EthereumSignMessageOneKey = {
  address_n: number[];
  message: string;
  chain_id?: number;
};

// EthereumMessageSignatureOneKey
export type EthereumMessageSignatureOneKey = {
  signature: string;
  address: string;
};

// EthereumVerifyMessageOneKey
export type EthereumVerifyMessageOneKey = {
  signature: string;
  message: string;
  address: string;
  chain_id?: number;
};

// EthereumSignTypedHashOneKey
export type EthereumSignTypedHashOneKey = {
  address_n: number[];
  domain_separator_hash: string;
  message_hash?: string;
  chain_id?: number;
};

// EthereumTypedDataSignatureOneKey
export type EthereumTypedDataSignatureOneKey = {
  signature: string;
  address: string;
};

// EthereumSignMessageEIP712
export type EthereumSignMessageEIP712 = {
  address_n: number[];
  domain_hash?: string;
  message_hash?: string;
};

// EthereumGetPublicKey
export type EthereumGetPublicKey = {
  address_n: number[];
  show_display?: boolean;
};

// EthereumPublicKey
export type EthereumPublicKey = {
  node: HDNodeType;
  xpub: string;
};

// EthereumGetAddress
export type EthereumGetAddress = {
  address_n: number[];
  show_display?: boolean;
  encoded_network?: ArrayBuffer;
};

// EthereumAddress
export type EthereumAddress = {
  _old_address?: string;
  address: string;
};

// EthereumSignTx
export type EthereumSignTx = {
  address_n: number[];
  nonce?: string;
  gas_price: string;
  gas_limit: string;
  to?: string;
  value?: string;
  data_initial_chunk?: string;
  data_length?: number;
  chain_id: number;
  tx_type?: number;
  definitions?: EthereumDefinitions;
};

export type EthereumAccessList = {
  address: string;
  storage_keys: string[];
};

// EthereumSignTxEIP1559
export type EthereumSignTxEIP1559 = {
  address_n: number[];
  nonce: string;
  max_gas_fee: string;
  max_priority_fee: string;
  gas_limit: string;
  to?: string;
  value: string;
  data_initial_chunk?: string;
  data_length: number;
  chain_id: number;
  access_list: EthereumAccessList[];
  definitions?: EthereumDefinitions;
};

// EthereumTxRequest
export type EthereumTxRequest = {
  data_length?: number;
  signature_v?: number;
  signature_r?: string;
  signature_s?: string;
};

// EthereumTxAck
export type EthereumTxAck = {
  data_chunk: string;
};

// EthereumSignMessage
export type EthereumSignMessage = {
  address_n: number[];
  message: string;
  encoded_network?: ArrayBuffer;
};

// EthereumMessageSignature
export type EthereumMessageSignature = {
  signature: string;
  address: string;
};

// EthereumVerifyMessage
export type EthereumVerifyMessage = {
  signature: string;
  message: string;
  address: string;
};

// EthereumSignTypedHash
export type EthereumSignTypedHash = {
  address_n: number[];
  domain_separator_hash: string;
  message_hash?: string;
  encoded_network?: ArrayBuffer;
};

// EthereumTypedDataSignature
export type EthereumTypedDataSignature = {
  signature: string;
  address: string;
};

// FilecoinGetAddress
export type FilecoinGetAddress = {
  address_n: number[];
  show_display?: boolean;
  testnet?: boolean;
};

// FilecoinAddress
export type FilecoinAddress = {
  address?: string;
};

// FilecoinSignTx
export type FilecoinSignTx = {
  address_n: number[];
  raw_tx: string;
  testnet?: boolean;
};

// FilecoinSignedTx
export type FilecoinSignedTx = {
  signature: string;
};

// KaspaGetAddress
export type KaspaGetAddress = {
  address_n: number[];
  show_display?: boolean;
  prefix?: string;
  scheme?: string;
  use_tweak?: boolean;
};

// KaspaAddress
export type KaspaAddress = {
  address: string;
};

// KaspaSignTx
export type KaspaSignTx = {
  address_n: number[];
  raw_message: string;
  scheme?: string;
  prefix?: string;
  input_count?: number;
  use_tweak?: boolean;
};

// KaspaTxInputRequest
export type KaspaTxInputRequest = {
  request_index: number;
  signature?: string;
};

// KaspaTxInputAck
export type KaspaTxInputAck = {
  address_n: number[];
  raw_message: string;
};

// KaspaSignedTx
export type KaspaSignedTx = {
  signature: string;
};

// LnurlAuth
export type LnurlAuth = {
  domain: string;
  data: string;
};

// LnurlAuthResp
export type LnurlAuthResp = {
  publickey?: string;
  path?: string;
  signature?: string;
};

export enum Enum_BackupType {
  Bip39 = 0,
  Slip39_Basic = 1,
  Slip39_Advanced = 2,
}
export type BackupType = keyof typeof Enum_BackupType;

export enum Enum_SafetyCheckLevel {
  Strict = 0,
  PromptAlways = 1,
  PromptTemporarily = 2,
}
export type SafetyCheckLevel = keyof typeof Enum_SafetyCheckLevel;

// Initialize
export type Initialize = {
  session_id?: string;
  _skip_passphrase?: boolean;
  derive_cardano?: boolean;
  passphrase_state?: string;
  is_contains_attach?: boolean;
};

// GetFeatures
export type GetFeatures = {};

// OnekeyGetFeatures
export type OnekeyGetFeatures = {};

export enum OneKeyDeviceType {
  CLASSIC = 0,
  CLASSIC1S = 1,
  MINI = 2,
  TOUCH = 3,
  PRO = 5,
  PURE = 6,
}

export enum OneKeySeType {
  THD89 = 0,
  SE608A = 1,
}

export enum OneKeySEState {
  BOOT = 0,
  APP = 1,
}

export enum Enum_Capability {
  Capability_Bitcoin = 1,
  Capability_Bitcoin_like = 2,
  Capability_Binance = 3,
  Capability_Cardano = 4,
  Capability_Crypto = 5,
  Capability_EOS = 6,
  Capability_Ethereum = 7,
  Capability_Lisk = 8,
  Capability_Monero = 9,
  Capability_NEM = 10,
  Capability_Ripple = 11,
  Capability_Stellar = 12,
  Capability_Tezos = 13,
  Capability_U2F = 14,
  Capability_Shamir = 15,
  Capability_ShamirGroups = 16,
  Capability_PassphraseEntry = 17,
  Capability_EthereumTypedData = 1000,
  Capability_AttachToPin = 8000,
}
export type Capability = keyof typeof Enum_Capability;

// Features
export type Features = {
  vendor: string;
  major_version: number;
  minor_version: number;
  patch_version: number;
  bootloader_mode: boolean | null;
  device_id: string | null;
  pin_protection: boolean | null;
  passphrase_protection: boolean | null;
  language: string | null;
  label: string | null;
  initialized: boolean | null;
  revision: string | null;
  bootloader_hash: string | null;
  imported: boolean | null;
  unlocked: boolean | null;
  _passphrase_cached?: boolean;
  firmware_present: boolean | null;
  needs_backup: boolean | null;
  flags: number | null;
  model: string;
  fw_major: number | null;
  fw_minor: number | null;
  fw_patch: number | null;
  fw_vendor: string | null;
  unfinished_backup: boolean | null;
  no_backup: boolean | null;
  recovery_mode: boolean | null;
  capabilities: Capability[];
  backup_type: BackupType | null;
  sd_card_present: boolean | null;
  sd_protection: boolean | null;
  wipe_code_protection: boolean | null;
  session_id: string | null;
  passphrase_always_on_device: boolean | null;
  safety_checks: SafetyCheckLevel | null;
  auto_lock_delay_ms: number | null;
  display_rotation: number | null;
  experimental_features: boolean | null;
  busy?: boolean;
  offset?: number;
  ble_name?: string;
  ble_ver?: string;
  ble_enable?: boolean;
  se_enable?: boolean;
  se_ver?: string;
  backup_only?: boolean;
  onekey_version?: string;
  onekey_serial?: string;
  bootloader_version?: string;
  serial_no?: string;
  spi_flash?: string;
  initstates?: number;
  NFT_voucher?: string;
  cpu_info?: string;
  pre_firmware?: string;
  coin_switch?: number;
  build_id?: string;
  boardloader_version?: string;
  battery_level?: number;
  onekey_device_type?: string | null;
  onekey_se_type?: string | null;
  onekey_board_version?: string;
  onekey_board_hash?: string;
  onekey_boot_version?: string;
  onekey_boot_hash?: string;
  onekey_se01_version?: string;
  onekey_se01_hash?: string;
  onekey_se01_build_id?: string;
  onekey_firmware_version?: string;
  onekey_firmware_hash?: string;
  onekey_firmware_build_id?: string;
  onekey_serial_no?: string;
  onekey_boot_build_id?: string;
  onekey_ble_name?: string;
  onekey_ble_version?: string;
  onekey_ble_build_id?: string;
  onekey_ble_hash?: string;
  onekey_se02_version?: string;
  onekey_se03_version?: string;
  onekey_se04_version?: string;
  onekey_se01_state?: string | null;
  onekey_se02_state?: string | null;
  onekey_se03_state?: string | null;
  onekey_se04_state?: string | null;
  attach_to_pin_user?: boolean;
  unlocked_attach_pin?: boolean;
};

// OnekeyFeatures
export type OnekeyFeatures = {
  onekey_device_type?: OneKeyDeviceType;
  onekey_board_version?: string;
  onekey_boot_version?: string;
  onekey_firmware_version?: string;
  onekey_board_hash?: string;
  onekey_boot_hash?: string;
  onekey_firmware_hash?: string;
  onekey_board_build_id?: string;
  onekey_boot_build_id?: string;
  onekey_firmware_build_id?: string;
  onekey_serial_no?: string;
  onekey_ble_name?: string;
  onekey_ble_version?: string;
  onekey_ble_build_id?: string;
  onekey_ble_hash?: string;
  onekey_se_type?: OneKeySeType;
  onekey_se01_state?: OneKeySEState;
  onekey_se02_state?: OneKeySEState;
  onekey_se03_state?: OneKeySEState;
  onekey_se04_state?: OneKeySEState;
  onekey_se01_version?: string;
  onekey_se02_version?: string;
  onekey_se03_version?: string;
  onekey_se04_version?: string;
  onekey_se01_hash?: string;
  onekey_se02_hash?: string;
  onekey_se03_hash?: string;
  onekey_se04_hash?: string;
  onekey_se01_build_id?: string;
  onekey_se02_build_id?: string;
  onekey_se03_build_id?: string;
  onekey_se04_build_id?: string;
  onekey_se01_boot_version?: string;
  onekey_se02_boot_version?: string;
  onekey_se03_boot_version?: string;
  onekey_se04_boot_version?: string;
  onekey_se01_boot_hash?: string;
  onekey_se02_boot_hash?: string;
  onekey_se03_boot_hash?: string;
  onekey_se04_boot_hash?: string;
  onekey_se01_boot_build_id?: string;
  onekey_se02_boot_build_id?: string;
  onekey_se03_boot_build_id?: string;
  onekey_se04_boot_build_id?: string;
};

// LockDevice
export type LockDevice = {};

// EndSession
export type EndSession = {};

export enum ExportType {
  SeedEncExportType_NO = 0,
  SeedEncExportType_YES = 1,
  MnemonicPlainExportType_YES = 2,
}

// ApplySettings
export type ApplySettings = {
  language?: string;
  label?: string;
  use_passphrase?: boolean;
  homescreen?: string;
  _passphrase_source?: number;
  auto_lock_delay_ms?: number;
  display_rotation?: number;
  passphrase_always_on_device?: boolean;
  safety_checks?: SafetyCheckLevel;
  experimental_features?: boolean;
  use_ble?: boolean;
  use_se?: boolean;
  is_bixinapp?: boolean;
  fastpay_pin?: boolean;
  fastpay_confirm?: boolean;
  fastpay_money_limit?: number;
  fastpay_times?: number;
};

// ApplyFlags
export type ApplyFlags = {
  flags: number;
};

// ChangePin
export type ChangePin = {
  remove?: boolean;
};

// ChangeWipeCode
export type ChangeWipeCode = {
  remove?: boolean;
};

export enum SdProtectOperationType {
  DISABLE = 0,
  ENABLE = 1,
  REFRESH = 2,
}

// SdProtect
export type SdProtect = {
  operation: SdProtectOperationType;
};

// Ping
export type Ping = {
  message?: string;
  button_protection?: boolean;
};

// Cancel
export type Cancel = {};

// GetEntropy
export type GetEntropy = {
  size: number;
};

// Entropy
export type Entropy = {
  entropy: string;
};

// WipeDevice
export type WipeDevice = {};

// ResetDevice
export type ResetDevice = {
  display_random?: boolean;
  strength?: number;
  passphrase_protection?: boolean;
  pin_protection?: boolean;
  language?: string;
  label?: string;
  u2f_counter?: number;
  skip_backup?: boolean;
  no_backup?: boolean;
  backup_type?: string | number;
};

// BackupDevice
export type BackupDevice = {};

// EntropyRequest
export type EntropyRequest = {};

// EntropyAck
export type EntropyAck = {
  entropy: string;
};

export enum RecoveryDeviceType {
  RecoveryDeviceType_ScrambledWords = 0,
  RecoveryDeviceType_Matrix = 1,
}

// RecoveryDevice
export type RecoveryDevice = {
  word_count?: number;
  passphrase_protection?: boolean;
  pin_protection?: boolean;
  language?: string;
  label?: string;
  enforce_wordlist?: boolean;
  type?: RecoveryDeviceType;
  u2f_counter?: number;
  dry_run?: boolean;
};

export enum Enum_WordRequestType {
  WordRequestType_Plain = 0,
  WordRequestType_Matrix9 = 1,
  WordRequestType_Matrix6 = 2,
}
export type WordRequestType = keyof typeof Enum_WordRequestType;

// WordRequest
export type WordRequest = {
  type: WordRequestType;
};

// WordAck
export type WordAck = {
  word: string;
};

// SetU2FCounter
export type SetU2FCounter = {
  u2f_counter: number;
};

// GetNextU2FCounter
export type GetNextU2FCounter = {};

// NextU2FCounter
export type NextU2FCounter = {
  u2f_counter: number;
};

// DoPreauthorized
export type DoPreauthorized = {};

// PreauthorizedRequest
export type PreauthorizedRequest = {};

// CancelAuthorization
export type CancelAuthorization = {};

export enum SeedRequestType {
  SeedRequestType_Gen = 0,
  SeedRequestType_EncExport = 1,
  SeedRequestType_EncImport = 2,
}

// BixinSeedOperate
export type BixinSeedOperate = {
  type: SeedRequestType;
  seed_importData?: string;
};

// BixinMessageSE
export type BixinMessageSE = {
  inputmessage: string;
};

// BixinOutMessageSE
export type BixinOutMessageSE = {
  outmessage?: string;
};

// DeviceBackToBoot
export type DeviceBackToBoot = {};

// BixinBackupRequest
export type BixinBackupRequest = {};

// BixinBackupAck
export type BixinBackupAck = {
  data: string;
};

// BixinRestoreRequest
export type BixinRestoreRequest = {
  data: string;
  language?: string;
  label?: string;
  passphrase_protection?: boolean;
};

// BixinRestoreAck
export type BixinRestoreAck = {
  data: string;
};

// BixinVerifyDeviceRequest
export type BixinVerifyDeviceRequest = {
  data: string;
};

// BixinVerifyDeviceAck
export type BixinVerifyDeviceAck = {
  cert: string;
  signature: string;
};

export enum WL_OperationType {
  WL_OperationType_Add = 0,
  WL_OperationType_Delete = 1,
  WL_OperationType_Inquire = 2,
}

// BixinWhiteListRequest
export type BixinWhiteListRequest = {
  type: WL_OperationType;
  addr_in?: string;
};

// BixinWhiteListAck
export type BixinWhiteListAck = {
  address: string[];
};

// BixinLoadDevice
export type BixinLoadDevice = {
  mnemonics: string;
  language?: string;
  label?: string;
  skip_checksum?: boolean;
};

// BixinBackupDevice
export type BixinBackupDevice = {};

// BixinBackupDeviceAck
export type BixinBackupDeviceAck = {
  mnemonics: string;
};

// DeviceInfoSettings
export type DeviceInfoSettings = {
  serial_no?: string;
  cpu_info?: string;
  pre_firmware?: string;
};

// GetDeviceInfo
export type GetDeviceInfo = {};

// DeviceInfo
export type DeviceInfo = {
  serial_no?: string;
  spiFlash_info?: string;
  SE_info?: string;
  NFT_voucher?: string;
  cpu_info?: string;
  pre_firmware?: string;
};

// ReadSEPublicKey
export type ReadSEPublicKey = {};

// SEPublicKey
export type SEPublicKey = {
  public_key: string;
};

// WriteSEPublicCert
export type WriteSEPublicCert = {
  public_cert: string;
};

// ReadSEPublicCert
export type ReadSEPublicCert = {};

// SEPublicCert
export type SEPublicCert = {
  public_cert: string;
};

// SpiFlashWrite
export type SpiFlashWrite = {
  address: number;
  data: string;
};

// SpiFlashRead
export type SpiFlashRead = {
  address: number;
  len: number;
};

// SpiFlashData
export type SpiFlashData = {
  data: string;
};

// SESignMessage
export type SESignMessage = {
  message: string;
};

// SEMessageSignature
export type SEMessageSignature = {
  signature: string;
};

export enum ResourceType {
  WallPaper = 0,
  Nft = 1,
}

// ResourceUpload
export type ResourceUpload = {
  extension: string;
  data_length: number;
  res_type: ResourceType;
  nft_meta_data?: string;
  zoom_data_length: number;
  file_name_no_ext?: string;
};

// ZoomRequest
export type ZoomRequest = {
  offset?: number;
  data_length: number;
};

// ResourceRequest
export type ResourceRequest = {
  offset?: number;
  data_length: number;
};

// ResourceAck
export type ResourceAck = {
  data_chunk: string;
  hash?: string;
};

// ResourceUpdate
export type ResourceUpdate = {
  file_name: string;
  data_length: number;
  initial_data_chunk: string;
  hash?: string;
};

// NFTWriteInfo
export type NFTWriteInfo = {
  index: number;
  width: number;
  height: number;
  name_zh?: string;
  name_en?: string;
};

// NFTWriteData
export type NFTWriteData = {
  index: number;
  data: string;
  offset: number;
};

// RebootToBootloader
export type RebootToBootloader = {};

// RebootToBoardloader
export type RebootToBoardloader = {};

// ListResDir
export type ListResDir = {
  path: string;
};

export type FileInfo = {
  name: string;
  size: number;
};

// FileInfoList
export type FileInfoList = {
  files: FileInfo[];
};

// DeviceEraseSector
export type DeviceEraseSector = {
  sector: number;
};

// UnLockDevice
export type UnLockDevice = {};

// UnLockDeviceResponse
export type UnLockDeviceResponse = {
  unlocked?: boolean;
  unlocked_attach_pin?: boolean;
  passphrase_protection?: boolean;
};

// GetPassphraseState
export type GetPassphraseState = {
  passphrase_state?: string;
};

// PassphraseState
export type PassphraseState = {
  passphrase_state?: string;
  session_id?: string;
  unlocked_attach_pin?: boolean;
};

export type MoneroRctKeyPublic = {
  dest?: string;
  commitment?: string;
};

export type MoneroOutputEntry = {
  idx?: number;
  key?: MoneroRctKeyPublic;
};

export type MoneroMultisigKLRki = {
  K?: string;
  L?: string;
  R?: string;
  ki?: string;
};

// MoneroTransactionSourceEntry
export type MoneroTransactionSourceEntry = {
  outputs: MoneroOutputEntry[];
  real_output?: number;
  real_out_tx_key?: string;
  real_out_additional_tx_keys: string[];
  real_output_in_tx_index?: number;
  amount?: UintType;
  rct?: boolean;
  mask?: string;
  multisig_kLRki?: MoneroMultisigKLRki;
  subaddr_minor?: number;
};

export type MoneroAccountPublicAddress = {
  spend_public_key?: string;
  view_public_key?: string;
};

// MoneroTransactionDestinationEntry
export type MoneroTransactionDestinationEntry = {
  amount?: UintType;
  addr?: MoneroAccountPublicAddress;
  is_subaddress?: boolean;
  original?: string;
  is_integrated?: boolean;
};

// MoneroTransactionRsigData
export type MoneroTransactionRsigData = {
  rsig_type?: number;
  offload_type?: number;
  grouping: number[];
  mask?: string;
  rsig?: string;
  rsig_parts: string[];
  bp_version?: number;
};

// MoneroGetAddress
export type MoneroGetAddress = {
  address_n: number[];
  show_display?: boolean;
  network_type?: number;
  account?: number;
  minor?: number;
  payment_id?: string;
};

// MoneroAddress
export type MoneroAddress = {
  address?: string;
};

// MoneroGetWatchKey
export type MoneroGetWatchKey = {
  address_n: number[];
  network_type?: number;
};

// MoneroWatchKey
export type MoneroWatchKey = {
  watch_key?: string;
  address?: string;
};

export type MoneroTransactionData = {
  version?: number;
  payment_id?: string;
  unlock_time?: number;
  outputs: MoneroTransactionDestinationEntry[];
  change_dts?: MoneroTransactionDestinationEntry;
  num_inputs?: number;
  mixin?: number;
  fee?: UintType;
  account?: number;
  minor_indices: number[];
  rsig_data?: MoneroTransactionRsigData;
  integrated_indices: number[];
  client_version?: number;
  hard_fork?: number;
  monero_version?: string;
};

// MoneroTransactionInitRequest
export type MoneroTransactionInitRequest = {
  version?: number;
  address_n: number[];
  network_type?: number;
  tsx_data?: MoneroTransactionData;
};

// MoneroTransactionInitAck
export type MoneroTransactionInitAck = {
  hmacs: string[];
  rsig_data?: MoneroTransactionRsigData;
};

// MoneroTransactionSetInputRequest
export type MoneroTransactionSetInputRequest = {
  src_entr?: MoneroTransactionSourceEntry;
};

// MoneroTransactionSetInputAck
export type MoneroTransactionSetInputAck = {
  vini?: string;
  vini_hmac?: string;
  pseudo_out?: string;
  pseudo_out_hmac?: string;
  pseudo_out_alpha?: string;
  spend_key?: string;
};

// MoneroTransactionInputsPermutationRequest
export type MoneroTransactionInputsPermutationRequest = {
  perm: number[];
};

// MoneroTransactionInputsPermutationAck
export type MoneroTransactionInputsPermutationAck = {};

// MoneroTransactionInputViniRequest
export type MoneroTransactionInputViniRequest = {
  src_entr?: MoneroTransactionSourceEntry;
  vini?: string;
  vini_hmac?: string;
  pseudo_out?: string;
  pseudo_out_hmac?: string;
  orig_idx?: number;
};

// MoneroTransactionInputViniAck
export type MoneroTransactionInputViniAck = {};

// MoneroTransactionAllInputsSetRequest
export type MoneroTransactionAllInputsSetRequest = {};

// MoneroTransactionAllInputsSetAck
export type MoneroTransactionAllInputsSetAck = {
  rsig_data?: MoneroTransactionRsigData;
};

// MoneroTransactionSetOutputRequest
export type MoneroTransactionSetOutputRequest = {
  dst_entr?: MoneroTransactionDestinationEntry;
  dst_entr_hmac?: string;
  rsig_data?: MoneroTransactionRsigData;
  is_offloaded_bp?: boolean;
};

// MoneroTransactionSetOutputAck
export type MoneroTransactionSetOutputAck = {
  tx_out?: string;
  vouti_hmac?: string;
  rsig_data?: MoneroTransactionRsigData;
  out_pk?: string;
  ecdh_info?: string;
};

// MoneroTransactionAllOutSetRequest
export type MoneroTransactionAllOutSetRequest = {
  rsig_data?: MoneroTransactionRsigData;
};

export type MoneroRingCtSig = {
  txn_fee?: number;
  message?: string;
  rv_type?: number;
};

// MoneroTransactionAllOutSetAck
export type MoneroTransactionAllOutSetAck = {
  extra?: string;
  tx_prefix_hash?: string;
  rv?: MoneroRingCtSig;
  full_message_hash?: string;
};

// MoneroTransactionSignInputRequest
export type MoneroTransactionSignInputRequest = {
  src_entr?: MoneroTransactionSourceEntry;
  vini?: string;
  vini_hmac?: string;
  pseudo_out?: string;
  pseudo_out_hmac?: string;
  pseudo_out_alpha?: string;
  spend_key?: string;
  orig_idx?: number;
};

// MoneroTransactionSignInputAck
export type MoneroTransactionSignInputAck = {
  signature?: string;
  pseudo_out?: string;
};

// MoneroTransactionFinalRequest
export type MoneroTransactionFinalRequest = {};

// MoneroTransactionFinalAck
export type MoneroTransactionFinalAck = {
  cout_key?: string;
  salt?: string;
  rand_mult?: string;
  tx_enc_keys?: string;
  opening_key?: string;
};

export type MoneroSubAddressIndicesList = {
  account?: number;
  minor_indices: number[];
};

// MoneroKeyImageExportInitRequest
export type MoneroKeyImageExportInitRequest = {
  num?: number;
  hash?: string;
  address_n: number[];
  network_type?: number;
  subs: MoneroSubAddressIndicesList[];
};

// MoneroKeyImageExportInitAck
export type MoneroKeyImageExportInitAck = {};

export type MoneroTransferDetails = {
  out_key?: string;
  tx_pub_key?: string;
  additional_tx_pub_keys: string[];
  internal_output_index?: number;
  sub_addr_major?: number;
  sub_addr_minor?: number;
};

// MoneroKeyImageSyncStepRequest
export type MoneroKeyImageSyncStepRequest = {
  tdis: MoneroTransferDetails[];
};

export type MoneroExportedKeyImage = {
  iv?: string;
  blob?: string;
};

// MoneroKeyImageSyncStepAck
export type MoneroKeyImageSyncStepAck = {
  kis: MoneroExportedKeyImage[];
};

// MoneroKeyImageSyncFinalRequest
export type MoneroKeyImageSyncFinalRequest = {};

// MoneroKeyImageSyncFinalAck
export type MoneroKeyImageSyncFinalAck = {
  enc_key?: string;
};

// MoneroGetTxKeyRequest
export type MoneroGetTxKeyRequest = {
  address_n: number[];
  network_type?: number;
  salt1?: string;
  salt2?: string;
  tx_enc_keys?: string;
  tx_prefix_hash?: string;
  reason?: number;
  view_public_key?: string;
};

// MoneroGetTxKeyAck
export type MoneroGetTxKeyAck = {
  salt?: string;
  tx_keys?: string;
  tx_derivations?: string;
};

// MoneroLiveRefreshStartRequest
export type MoneroLiveRefreshStartRequest = {
  address_n: number[];
  network_type?: number;
};

// MoneroLiveRefreshStartAck
export type MoneroLiveRefreshStartAck = {};

// MoneroLiveRefreshStepRequest
export type MoneroLiveRefreshStepRequest = {
  out_key?: string;
  recv_deriv?: string;
  real_out_idx?: number;
  sub_addr_major?: number;
  sub_addr_minor?: number;
};

// MoneroLiveRefreshStepAck
export type MoneroLiveRefreshStepAck = {
  salt?: string;
  key_image?: string;
};

// MoneroLiveRefreshFinalRequest
export type MoneroLiveRefreshFinalRequest = {};

// MoneroLiveRefreshFinalAck
export type MoneroLiveRefreshFinalAck = {};

// NearGetAddress
export type NearGetAddress = {
  address_n: number[];
  show_display?: boolean;
};

// NearAddress
export type NearAddress = {
  address?: string;
};

// NearSignTx
export type NearSignTx = {
  address_n: number[];
  raw_tx: string;
};

// NearSignedTx
export type NearSignedTx = {
  signature: string;
};

// NEMGetAddress
export type NEMGetAddress = {
  address_n: number[];
  network?: number;
  show_display?: boolean;
};

// NEMAddress
export type NEMAddress = {
  address: string;
};

export type NEMTransactionCommon = {
  address_n?: number[];
  network?: number;
  timestamp?: number;
  fee?: UintType;
  deadline?: number;
  signer?: string;
};

export type NEMMosaic = {
  namespace?: string;
  mosaic?: string;
  quantity?: number;
};

export type NEMTransfer = {
  recipient?: string;
  amount?: UintType;
  payload?: string;
  public_key?: string;
  mosaics?: NEMMosaic[];
};

export type NEMProvisionNamespace = {
  namespace?: string;
  parent?: string;
  sink?: string;
  fee?: UintType;
};

export enum NEMMosaicLevy {
  MosaicLevy_Absolute = 1,
  MosaicLevy_Percentile = 2,
}

export type NEMMosaicDefinition = {
  name?: string;
  ticker?: string;
  namespace?: string;
  mosaic?: string;
  divisibility?: number;
  levy?: NEMMosaicLevy;
  fee?: UintType;
  levy_address?: string;
  levy_namespace?: string;
  levy_mosaic?: string;
  supply?: number;
  mutable_supply?: boolean;
  transferable?: boolean;
  description?: string;
  networks?: number[];
};

export type NEMMosaicCreation = {
  definition?: NEMMosaicDefinition;
  sink?: string;
  fee?: UintType;
};

export enum NEMSupplyChangeType {
  SupplyChange_Increase = 1,
  SupplyChange_Decrease = 2,
}

export type NEMMosaicSupplyChange = {
  namespace?: string;
  mosaic?: string;
  type?: NEMSupplyChangeType;
  delta?: number;
};

export enum NEMModificationType {
  CosignatoryModification_Add = 1,
  CosignatoryModification_Delete = 2,
}

export type NEMCosignatoryModification = {
  type?: NEMModificationType;
  public_key?: string;
};

export type NEMAggregateModification = {
  modifications?: NEMCosignatoryModification[];
  relative_change?: number;
};

export enum NEMImportanceTransferMode {
  ImportanceTransfer_Activate = 1,
  ImportanceTransfer_Deactivate = 2,
}

export type NEMImportanceTransfer = {
  mode?: NEMImportanceTransferMode;
  public_key?: string;
};

// NEMSignTx
export type NEMSignTx = {
  transaction?: NEMTransactionCommon;
  multisig?: NEMTransactionCommon;
  transfer?: NEMTransfer;
  cosigning?: boolean;
  provision_namespace?: NEMProvisionNamespace;
  mosaic_creation?: NEMMosaicCreation;
  supply_change?: NEMMosaicSupplyChange;
  aggregate_modification?: NEMAggregateModification;
  importance_transfer?: NEMImportanceTransfer;
};

// NEMSignedTx
export type NEMSignedTx = {
  data: string;
  signature: string;
};

// NEMDecryptMessage
export type NEMDecryptMessage = {
  address_n: number[];
  network?: number;
  public_key?: string;
  payload?: string;
};

// NEMDecryptedMessage
export type NEMDecryptedMessage = {
  payload: string;
};

// NeoGetAddress
export type NeoGetAddress = {
  address_n: number[];
  show_display?: boolean;
};

// NeoAddress
export type NeoAddress = {
  address?: string;
  public_key?: string;
};

// NeoSignTx
export type NeoSignTx = {
  address_n: number[];
  raw_tx: string;
  network_magic?: number;
};

// NeoSignedTx
export type NeoSignedTx = {
  public_key: string;
  signature: string;
};

// NervosGetAddress
export type NervosGetAddress = {
  address_n: number[];
  network: string;
  show_display?: boolean;
};

// NervosAddress
export type NervosAddress = {
  address: string;
};

// NervosSignTx
export type NervosSignTx = {
  address_n: number[];
  data_initial_chunk: string;
  witness_buffer: string;
  network: string;
  data_length?: number;
};

// NervosSignedTx
export type NervosSignedTx = {
  signature: string;
  address: string;
};

// NervosTxRequest
export type NervosTxRequest = {
  data_length?: number;
  public_key?: string;
  signature?: string;
};

// NervosTxAck
export type NervosTxAck = {
  data_chunk: string;
};

// NexaGetAddress
export type NexaGetAddress = {
  address_n: number[];
  show_display?: boolean;
  prefix?: string;
};

// NexaAddress
export type NexaAddress = {
  address: string;
  public_key: string;
};

// NexaSignTx
export type NexaSignTx = {
  address_n: number[];
  raw_message: string;
  prefix?: string;
  input_count?: number;
};

// NexaTxInputRequest
export type NexaTxInputRequest = {
  request_index: number;
  signature?: string;
};

// NexaTxInputAck
export type NexaTxInputAck = {
  address_n: number[];
  raw_message: string;
};

// NexaSignedTx
export type NexaSignedTx = {
  signature: string;
};

// NostrGetPublicKey
export type NostrGetPublicKey = {
  address_n: number[];
  show_display?: boolean;
};

// NostrPublicKey
export type NostrPublicKey = {
  publickey?: string;
  npub?: string;
};

// NostrSignEvent
export type NostrSignEvent = {
  address_n: number[];
  event: string;
};

// NostrSignedEvent
export type NostrSignedEvent = {
  event: string;
};

// NostrSignSchnorr
export type NostrSignSchnorr = {
  address_n: number[];
  hash: string;
};

// NostrSignedSchnorr
export type NostrSignedSchnorr = {
  signature: string;
};

// NostrEncryptMessage
export type NostrEncryptMessage = {
  address_n: number[];
  pubkey: string;
  msg: string;
  show_display?: boolean;
};

// NostrEncryptedMessage
export type NostrEncryptedMessage = {
  msg: string;
};

// NostrDecryptMessage
export type NostrDecryptMessage = {
  address_n: number[];
  pubkey: string;
  msg: string;
  show_display?: boolean;
};

// NostrDecryptedMessage
export type NostrDecryptedMessage = {
  msg: string;
};

// PolkadotGetAddress
export type PolkadotGetAddress = {
  address_n: number[];
  prefix: number;
  network: string;
  show_display?: boolean;
};

// PolkadotAddress
export type PolkadotAddress = {
  address?: string;
  public_key?: string;
};

// PolkadotSignTx
export type PolkadotSignTx = {
  address_n: number[];
  raw_tx: string;
  network: string;
};

// PolkadotSignedTx
export type PolkadotSignedTx = {
  signature: string;
};

// RippleGetAddress
export type RippleGetAddress = {
  address_n: number[];
  show_display?: boolean;
};

// RippleAddress
export type RippleAddress = {
  address: string;
};

export type RipplePayment = {
  amount: UintType;
  destination: string;
  destination_tag?: number;
};

// RippleSignTx
export type RippleSignTx = {
  address_n: number[];
  fee?: UintType;
  flags?: number;
  sequence?: number;
  last_ledger_sequence?: number;
  payment?: RipplePayment;
};

// RippleSignedTx
export type RippleSignedTx = {
  signature: string;
  serialized_tx: string;
};

// ScdoGetAddress
export type ScdoGetAddress = {
  address_n: number[];
  show_display?: boolean;
};

// ScdoAddress
export type ScdoAddress = {
  address: string;
};

// ScdoSignTx
export type ScdoSignTx = {
  address_n: number[];
  nonce: string;
  gas_price: string;
  gas_limit: string;
  to: string;
  value: string;
  timestamp?: string;
  data_initial_chunk?: string;
  data_length?: number;
  tx_type?: number;
};

// ScdoSignedTx
export type ScdoSignedTx = {
  data_length?: number;
  signature?: string;
};

// ScdoTxAck
export type ScdoTxAck = {
  data_chunk?: string;
};

// ScdoSignMessage
export type ScdoSignMessage = {
  address_n: number[];
  message?: string;
};

// ScdoSignedMessage
export type ScdoSignedMessage = {
  signature?: string;
  address?: string;
};

// SolanaGetAddress
export type SolanaGetAddress = {
  address_n: number[];
  show_display?: boolean;
};

// SolanaAddress
export type SolanaAddress = {
  address?: string;
};

// SolanaSignTx
export type SolanaSignTx = {
  address_n: number[];
  raw_tx: string;
};

// SolanaSignedTx
export type SolanaSignedTx = {
  signature?: string;
};

export enum SolanaOffChainMessageVersion {
  MESSAGE_VERSION_0 = 0,
}

export enum SolanaOffChainMessageFormat {
  V0_RESTRICTED_ASCII = 0,
  V0_LIMITED_UTF8 = 1,
}

// SolanaSignOffChainMessage
export type SolanaSignOffChainMessage = {
  address_n: number[];
  message: string;
  message_version?: SolanaOffChainMessageVersion;
  message_format?: SolanaOffChainMessageFormat;
  application_domain?: string;
};

// SolanaSignUnsafeMessage
export type SolanaSignUnsafeMessage = {
  address_n: number[];
  message: string;
};

// SolanaMessageSignature
export type SolanaMessageSignature = {
  signature: string;
  public_key?: string;
};

// StarcoinGetAddress
export type StarcoinGetAddress = {
  address_n: number[];
  show_display?: boolean;
};

// StarcoinAddress
export type StarcoinAddress = {
  address?: string;
};

// StarcoinGetPublicKey
export type StarcoinGetPublicKey = {
  address_n: number[];
  show_display?: boolean;
};

// StarcoinPublicKey
export type StarcoinPublicKey = {
  public_key: string;
};

// StarcoinSignTx
export type StarcoinSignTx = {
  address_n: number[];
  raw_tx?: string;
};

// StarcoinSignedTx
export type StarcoinSignedTx = {
  public_key: string;
  signature: string;
};

// StarcoinSignMessage
export type StarcoinSignMessage = {
  address_n: number[];
  message?: string;
};

// StarcoinMessageSignature
export type StarcoinMessageSignature = {
  public_key: string;
  signature: string;
};

// StarcoinVerifyMessage
export type StarcoinVerifyMessage = {
  public_key?: string;
  signature?: string;
  message?: string;
};

export enum StellarAssetType {
  NATIVE = 0,
  ALPHANUM4 = 1,
  ALPHANUM12 = 2,
}

// StellarAsset
export type StellarAsset = {
  type: StellarAssetType;
  code?: string;
  issuer?: string;
};

// StellarGetAddress
export type StellarGetAddress = {
  address_n: number[];
  show_display?: boolean;
};

// StellarAddress
export type StellarAddress = {
  address: string;
};

export enum StellarMemoType {
  NONE = 0,
  TEXT = 1,
  ID = 2,
  HASH = 3,
  RETURN = 4,
}

// StellarSignTx
export type StellarSignTx = {
  address_n: number[];
  network_passphrase: string;
  source_account: string;
  fee: UintType;
  sequence_number: UintType;
  timebounds_start: number;
  timebounds_end: number;
  memo_type: StellarMemoType;
  memo_text?: string;
  memo_id?: string;
  memo_hash?: Buffer | string;
  num_operations: number;
};

// StellarTxOpRequest
export type StellarTxOpRequest = {};

// StellarPaymentOp
export type StellarPaymentOp = {
  source_account?: string;
  destination_account: string;
  asset: StellarAsset;
  amount: UintType;
};

// StellarCreateAccountOp
export type StellarCreateAccountOp = {
  source_account?: string;
  new_account: string;
  starting_balance: UintType;
};

// StellarPathPaymentStrictReceiveOp
export type StellarPathPaymentStrictReceiveOp = {
  source_account?: string;
  send_asset: StellarAsset;
  send_max: UintType;
  destination_account: string;
  destination_asset: StellarAsset;
  destination_amount: UintType;
  paths?: StellarAsset[];
};

// StellarPathPaymentStrictSendOp
export type StellarPathPaymentStrictSendOp = {
  source_account?: string;
  send_asset: StellarAsset;
  send_amount: UintType;
  destination_account: string;
  destination_asset: StellarAsset;
  destination_min: UintType;
  paths?: StellarAsset[];
};

// StellarManageSellOfferOp
export type StellarManageSellOfferOp = {
  source_account?: string;
  selling_asset: StellarAsset;
  buying_asset: StellarAsset;
  amount: UintType;
  price_n: number;
  price_d: number;
  offer_id: UintType;
};

// StellarManageBuyOfferOp
export type StellarManageBuyOfferOp = {
  source_account?: string;
  selling_asset: StellarAsset;
  buying_asset: StellarAsset;
  amount: UintType;
  price_n: number;
  price_d: number;
  offer_id: UintType;
};

// StellarCreatePassiveSellOfferOp
export type StellarCreatePassiveSellOfferOp = {
  source_account?: string;
  selling_asset: StellarAsset;
  buying_asset: StellarAsset;
  amount: UintType;
  price_n: number;
  price_d: number;
};

export enum StellarSignerType {
  ACCOUNT = 0,
  PRE_AUTH = 1,
  HASH = 2,
}

// StellarSetOptionsOp
export type StellarSetOptionsOp = {
  source_account?: string;
  inflation_destination_account?: string;
  clear_flags?: number;
  set_flags?: number;
  master_weight?: UintType;
  low_threshold?: UintType;
  medium_threshold?: UintType;
  high_threshold?: UintType;
  home_domain?: string;
  signer_type?: StellarSignerType;
  signer_key?: Buffer | string;
  signer_weight?: number;
};

// StellarChangeTrustOp
export type StellarChangeTrustOp = {
  source_account?: string;
  asset: StellarAsset;
  limit: UintType;
};

// StellarAllowTrustOp
export type StellarAllowTrustOp = {
  source_account?: string;
  trusted_account: string;
  asset_type: StellarAssetType;
  asset_code?: string;
  is_authorized: boolean;
};

// StellarAccountMergeOp
export type StellarAccountMergeOp = {
  source_account?: string;
  destination_account: string;
};

// StellarManageDataOp
export type StellarManageDataOp = {
  source_account?: string;
  key: string;
  value?: Buffer | string;
};

// StellarBumpSequenceOp
export type StellarBumpSequenceOp = {
  source_account?: string;
  bump_to: UintType;
};

// StellarSignedTx
export type StellarSignedTx = {
  public_key: string;
  signature: string;
};

// SuiGetAddress
export type SuiGetAddress = {
  address_n: number[];
  show_display?: boolean;
};

// SuiAddress
export type SuiAddress = {
  address?: string;
};

// SuiSignTx
export type SuiSignTx = {
  address_n: number[];
  raw_tx: string;
  data_initial_chunk?: string;
  data_length?: number;
};

// SuiSignedTx
export type SuiSignedTx = {
  public_key: string;
  signature: string;
};

// SuiTxRequest
export type SuiTxRequest = {
  data_length?: number;
  public_key?: string;
  signature?: string;
};

// SuiTxAck
export type SuiTxAck = {
  data_chunk: string;
};

// SuiSignMessage
export type SuiSignMessage = {
  address_n: number[];
  message: string;
};

// SuiMessageSignature
export type SuiMessageSignature = {
  signature: string;
  address: string;
};

// TezosGetAddress
export type TezosGetAddress = {
  address_n: number[];
  show_display?: boolean;
};

// TezosAddress
export type TezosAddress = {
  address: string;
};

// TezosGetPublicKey
export type TezosGetPublicKey = {
  address_n: number[];
  show_display?: boolean;
};

// TezosPublicKey
export type TezosPublicKey = {
  public_key: string;
};

export enum TezosContractType {
  Implicit = 0,
  Originated = 1,
}

export type TezosContractID = {
  tag: number;
  hash: Uint8Array;
};

export type TezosRevealOp = {
  source: Uint8Array;
  fee: UintType;
  counter: number;
  gas_limit: number;
  storage_limit: number;
  public_key: Uint8Array;
};

export type TezosManagerTransfer = {
  destination?: TezosContractID;
  amount?: UintType;
};

export type TezosParametersManager = {
  set_delegate?: Uint8Array;
  cancel_delegate?: boolean;
  transfer?: TezosManagerTransfer;
};

export type TezosTransactionOp = {
  source: Uint8Array;
  fee: UintType;
  counter: number;
  gas_limit: number;
  storage_limit: number;
  amount: UintType;
  destination: TezosContractID;
  parameters?: number[];
  parameters_manager?: TezosParametersManager;
};

export type TezosOriginationOp = {
  source: Uint8Array;
  fee: UintType;
  counter: number;
  gas_limit: number;
  storage_limit: number;
  manager_pubkey?: string;
  balance: number;
  spendable?: boolean;
  delegatable?: boolean;
  delegate?: Uint8Array;
  script: string | number[];
};

export type TezosDelegationOp = {
  source: Uint8Array;
  fee: UintType;
  counter: number;
  gas_limit: number;
  storage_limit: number;
  delegate: Uint8Array;
};

export type TezosProposalOp = {
  source?: string;
  period?: number;
  proposals: string[];
};

export enum TezosBallotType {
  Yay = 0,
  Nay = 1,
  Pass = 2,
}

export type TezosBallotOp = {
  source?: string;
  period?: number;
  proposal?: string;
  ballot?: TezosBallotType;
};

// TezosSignTx
export type TezosSignTx = {
  address_n: number[];
  branch: Uint8Array;
  reveal?: TezosRevealOp;
  transaction?: TezosTransactionOp;
  origination?: TezosOriginationOp;
  delegation?: TezosDelegationOp;
  proposal?: TezosProposalOp;
  ballot?: TezosBallotOp;
};

// TezosSignedTx
export type TezosSignedTx = {
  signature: string;
  sig_op_contents: string;
  operation_hash: string;
};

export enum TonWalletVersion {
  V4R2 = 3,
}

export enum TonWorkChain {
  BASECHAIN = 0,
  MASTERCHAIN = 1,
}

// TonGetAddress
export type TonGetAddress = {
  address_n: number[];
  show_display?: boolean;
  wallet_version?: TonWalletVersion;
  is_bounceable?: boolean;
  is_testnet_only?: boolean;
  workchain?: TonWorkChain;
  wallet_id?: number;
};

// TonAddress
export type TonAddress = {
  public_key: string;
  address: string;
};

// TonSignMessage
export type TonSignMessage = {
  address_n: number[];
  destination: string;
  jetton_master_address?: string;
  jetton_wallet_address?: string;
  ton_amount: UintType;
  jetton_amount?: UintType;
  fwd_fee?: UintType;
  comment?: string;
  is_raw_data?: boolean;
  mode?: number;
  seqno: number;
  expire_at: UintType;
  wallet_version?: TonWalletVersion;
  wallet_id?: number;
  workchain?: TonWorkChain;
  is_bounceable?: boolean;
  is_testnet_only?: boolean;
  ext_destination: string[];
  ext_ton_amount: UintType[];
  ext_payload: string[];
  jetton_amount_bytes?: string;
  init_data_initial_chunk?: string;
  init_data_length?: number;
  signing_message_repr?: string;
};

// TonTxAck
export type TonTxAck = {
  init_data_chunk: string;
};

// TonSignedMessage
export type TonSignedMessage = {
  signature?: string;
  signning_message?: string;
  init_data_length?: number;
};

// TonSignProof
export type TonSignProof = {
  address_n: number[];
  appdomain: string;
  comment?: string;
  expire_at: UintType;
  wallet_version?: TonWalletVersion;
  wallet_id?: number;
  workchain?: TonWorkChain;
  is_bounceable?: boolean;
  is_testnet_only?: boolean;
};

// TonSignedProof
export type TonSignedProof = {
  signature?: string;
};

// TronGetAddress
export type TronGetAddress = {
  address_n: number[];
  show_display?: boolean;
};

// TronAddress
export type TronAddress = {
  address?: string;
};

export type TronTransferContract = {
  to_address?: string;
  amount?: UintType;
};

export type TronTriggerSmartContract = {
  contract_address?: string;
  call_value?: number;
  data?: string;
  call_token_value?: number;
  asset_id?: number;
};

export enum TronResourceCode {
  BANDWIDTH = 0,
  ENERGY = 1,
  TRON_POWER = 2,
}

export type TronFreezeBalanceContract = {
  frozen_balance?: number;
  frozen_duration?: number;
  resource?: TronResourceCode;
  receiver_address?: string;
};

export type TronUnfreezeBalanceContract = {
  resource?: TronResourceCode;
  receiver_address?: string;
};

export type TronWithdrawBalanceContract = {
  owner_address?: string;
};

export type TronFreezeBalanceV2Contract = {
  frozen_balance?: number;
  resource?: TronResourceCode;
};

export type TronUnfreezeBalanceV2Contract = {
  unfreeze_balance?: number;
  resource?: TronResourceCode;
};

export type TronWithdrawExpireUnfreezeContract = {};

export type TronDelegateResourceContract = {
  resource?: TronResourceCode;
  balance?: number;
  receiver_address?: string;
  lock?: boolean;
  lock_period?: number;
};

export type TronUnDelegateResourceContract = {
  resource?: TronResourceCode;
  balance?: number;
  receiver_address?: string;
};

export type Vote = {
  vote_address: string;
  vote_count: number;
};

export type TronVoteWitnessContract = {
  votes: Vote[];
  support?: boolean;
};

export type TronCancelAllUnfreezeV2Contract = {};

export type TronContract = {
  transfer_contract?: TronTransferContract;
  provider?: string;
  vote_witness_contract?: TronVoteWitnessContract;
  contract_name?: string;
  permission_id?: number;
  freeze_balance_contract?: TronFreezeBalanceContract;
  unfreeze_balance_contract?: TronUnfreezeBalanceContract;
  withdraw_balance_contract?: TronWithdrawBalanceContract;
  trigger_smart_contract?: TronTriggerSmartContract;
  freeze_balance_v2_contract?: TronFreezeBalanceV2Contract;
  unfreeze_balance_v2_contract?: TronUnfreezeBalanceV2Contract;
  withdraw_expire_unfreeze_contract?: TronWithdrawExpireUnfreezeContract;
  delegate_resource_contract?: TronDelegateResourceContract;
  undelegate_resource_contract?: TronUnDelegateResourceContract;
  cancel_all_unfreeze_v2_contract?: TronCancelAllUnfreezeV2Contract;
};

// TronSignTx
export type TronSignTx = {
  address_n: number[];
  ref_block_bytes: string;
  ref_block_hash: string;
  expiration: number;
  data?: string;
  contract: TronContract;
  timestamp: number;
  fee_limit?: number;
};

// TronSignedTx
export type TronSignedTx = {
  signature: string;
  serialized_tx?: string;
};

export enum TronMessageType {
  V1 = 1,
  V2 = 2,
}

// TronSignMessage
export type TronSignMessage = {
  address_n: number[];
  message: string;
  message_type?: TronMessageType;
};

// TronMessageSignature
export type TronMessageSignature = {
  address: string;
  signature: string;
};

// facotry
export type facotry = {};

export enum CommandFlags {
  Default = 0,
  Factory_Only = 1,
}

// custom connect definitions
export type MessageType = {
  AlephiumGetAddress: AlephiumGetAddress;
  AlephiumAddress: AlephiumAddress;
  AlephiumSignTx: AlephiumSignTx;
  AlephiumSignedTx: AlephiumSignedTx;
  AlephiumTxRequest: AlephiumTxRequest;
  AlephiumTxAck: AlephiumTxAck;
  AlephiumBytecodeRequest: AlephiumBytecodeRequest;
  AlephiumBytecodeAck: AlephiumBytecodeAck;
  AlephiumSignMessage: AlephiumSignMessage;
  AlephiumMessageSignature: AlephiumMessageSignature;
  AlgorandGetAddress: AlgorandGetAddress;
  AlgorandAddress: AlgorandAddress;
  AlgorandSignTx: AlgorandSignTx;
  AlgorandSignedTx: AlgorandSignedTx;
  AptosGetAddress: AptosGetAddress;
  AptosAddress: AptosAddress;
  AptosSignTx: AptosSignTx;
  AptosSignedTx: AptosSignedTx;
  AptosMessagePayload: AptosMessagePayload;
  AptosSignMessage: AptosSignMessage;
  AptosMessageSignature: AptosMessageSignature;
  AptosSignSIWAMessage: AptosSignSIWAMessage;
  BenfenGetAddress: BenfenGetAddress;
  BenfenAddress: BenfenAddress;
  BenfenSignTx: BenfenSignTx;
  BenfenSignedTx: BenfenSignedTx;
  BenfenTxRequest: BenfenTxRequest;
  BenfenTxAck: BenfenTxAck;
  BenfenSignMessage: BenfenSignMessage;
  BenfenMessageSignature: BenfenMessageSignature;
  BinanceGetAddress: BinanceGetAddress;
  BinanceAddress: BinanceAddress;
  BinanceGetPublicKey: BinanceGetPublicKey;
  BinancePublicKey: BinancePublicKey;
  BinanceSignTx: BinanceSignTx;
  BinanceTxRequest: BinanceTxRequest;
  BinanceCoin: BinanceCoin;
  BinanceInputOutput: BinanceInputOutput;
  BinanceTransferMsg: BinanceTransferMsg;
  BinanceOrderMsg: BinanceOrderMsg;
  BinanceCancelMsg: BinanceCancelMsg;
  BinanceSignedTx: BinanceSignedTx;
  HDNodeType: HDNodeType;
  HDNodePathType: HDNodePathType;
  MultisigRedeemScriptType: MultisigRedeemScriptType;
  GetPublicKey: GetPublicKey;
  PublicKey: PublicKey;
  GetAddress: GetAddress;
  Address: Address;
  GetOwnershipId: GetOwnershipId;
  OwnershipId: OwnershipId;
  SignMessage: SignMessage;
  MessageSignature: MessageSignature;
  VerifyMessage: VerifyMessage;
  SignTx: SignTx;
  TxRequestDetailsType: TxRequestDetailsType;
  TxRequestSerializedType: TxRequestSerializedType;
  TxRequest: TxRequest;
  TxInputType: TxInputType;
  TxOutputBinType: TxOutputBinType;
  TxOutputType: TxOutputType;
  PrevTx: PrevTx;
  PrevInput: PrevInput;
  PrevOutput: PrevOutput;
  TxAck: TxAck;
  TxAckInputWrapper: TxAckInputWrapper;
  TxAckInput: TxAckInput;
  TxAckOutputWrapper: TxAckOutputWrapper;
  TxAckOutput: TxAckOutput;
  TxAckPrevMeta: TxAckPrevMeta;
  TxAckPrevInputWrapper: TxAckPrevInputWrapper;
  TxAckPrevInput: TxAckPrevInput;
  TxAckPrevOutputWrapper: TxAckPrevOutputWrapper;
  TxAckPrevOutput: TxAckPrevOutput;
  TxAckPrevExtraDataWrapper: TxAckPrevExtraDataWrapper;
  TxAckPrevExtraData: TxAckPrevExtraData;
  GetOwnershipProof: GetOwnershipProof;
  OwnershipProof: OwnershipProof;
  AuthorizeCoinJoin: AuthorizeCoinJoin;
  BIP32Address: BIP32Address;
  GetPublicKeyMultiple: GetPublicKeyMultiple;
  PublicKeyMultiple: PublicKeyMultiple;
  SignPsbt: SignPsbt;
  SignedPsbt: SignedPsbt;
  FirmwareErase: FirmwareErase;
  FirmwareRequest: FirmwareRequest;
  FirmwareUpload: FirmwareUpload;
  SelfTest: SelfTest;
  FirmwareErase_ex: FirmwareErase_ex;
  Reboot: Reboot;
  FirmwareUpdateEmmc: FirmwareUpdateEmmc;
  CardanoBlockchainPointerType: CardanoBlockchainPointerType;
  CardanoNativeScript: CardanoNativeScript;
  CardanoGetNativeScriptHash: CardanoGetNativeScriptHash;
  CardanoNativeScriptHash: CardanoNativeScriptHash;
  CardanoAddressParametersType: CardanoAddressParametersType;
  CardanoGetAddress: CardanoGetAddress;
  CardanoAddress: CardanoAddress;
  CardanoGetPublicKey: CardanoGetPublicKey;
  CardanoPublicKey: CardanoPublicKey;
  CardanoSignTxInit: CardanoSignTxInit;
  CardanoTxInput: CardanoTxInput;
  CardanoTxOutput: CardanoTxOutput;
  CardanoAssetGroup: CardanoAssetGroup;
  CardanoToken: CardanoToken;
  CardanoTxInlineDatumChunk: CardanoTxInlineDatumChunk;
  CardanoTxReferenceScriptChunk: CardanoTxReferenceScriptChunk;
  CardanoPoolOwner: CardanoPoolOwner;
  CardanoPoolRelayParameters: CardanoPoolRelayParameters;
  CardanoPoolMetadataType: CardanoPoolMetadataType;
  CardanoPoolParametersType: CardanoPoolParametersType;
  CardanoDRep: CardanoDRep;
  CardanoTxCertificate: CardanoTxCertificate;
  CardanoTxWithdrawal: CardanoTxWithdrawal;
  CardanoCVoteRegistrationDelegation: CardanoCVoteRegistrationDelegation;
  CardanoCVoteRegistrationParametersType: CardanoCVoteRegistrationParametersType;
  CardanoTxAuxiliaryData: CardanoTxAuxiliaryData;
  CardanoTxMint: CardanoTxMint;
  CardanoTxCollateralInput: CardanoTxCollateralInput;
  CardanoTxRequiredSigner: CardanoTxRequiredSigner;
  CardanoTxReferenceInput: CardanoTxReferenceInput;
  CardanoTxItemAck: CardanoTxItemAck;
  CardanoTxAuxiliaryDataSupplement: CardanoTxAuxiliaryDataSupplement;
  CardanoTxWitnessRequest: CardanoTxWitnessRequest;
  CardanoTxWitnessResponse: CardanoTxWitnessResponse;
  CardanoTxHostAck: CardanoTxHostAck;
  CardanoTxBodyHash: CardanoTxBodyHash;
  CardanoSignTxFinished: CardanoSignTxFinished;
  CardanoSignMessage: CardanoSignMessage;
  CardanoMessageSignature: CardanoMessageSignature;
  Success: Success;
  Failure: Failure;
  ButtonRequest: ButtonRequest;
  ButtonAck: ButtonAck;
  PinMatrixRequest: PinMatrixRequest;
  PinMatrixAck: PinMatrixAck;
  PassphraseRequest: PassphraseRequest;
  PassphraseAck: PassphraseAck;
  Deprecated_PassphraseStateRequest: Deprecated_PassphraseStateRequest;
  Deprecated_PassphraseStateAck: Deprecated_PassphraseStateAck;
  BixinPinInputOnDevice: BixinPinInputOnDevice;
  ConfluxGetAddress: ConfluxGetAddress;
  ConfluxAddress: ConfluxAddress;
  ConfluxSignTx: ConfluxSignTx;
  ConfluxTxRequest: ConfluxTxRequest;
  ConfluxTxAck: ConfluxTxAck;
  ConfluxSignMessage: ConfluxSignMessage;
  ConfluxMessageSignature: ConfluxMessageSignature;
  ConfluxSignMessageCIP23: ConfluxSignMessageCIP23;
  CosmosGetAddress: CosmosGetAddress;
  CosmosAddress: CosmosAddress;
  CosmosSignTx: CosmosSignTx;
  CosmosSignedTx: CosmosSignedTx;
  CipherKeyValue: CipherKeyValue;
  CipheredKeyValue: CipheredKeyValue;
  IdentityType: IdentityType;
  SignIdentity: SignIdentity;
  SignedIdentity: SignedIdentity;
  GetECDHSessionKey: GetECDHSessionKey;
  ECDHSessionKey: ECDHSessionKey;
  Path: Path;
  BatchGetPublickeys: BatchGetPublickeys;
  EcdsaPublicKeys: EcdsaPublicKeys;
  DnxGetAddress: DnxGetAddress;
  DnxAddress: DnxAddress;
  DnxSignTx: DnxSignTx;
  DnxTxKey: DnxTxKey;
  DnxComputedKeyImage: DnxComputedKeyImage;
  DnxInputRequest: DnxInputRequest;
  DnxInputAck: DnxInputAck;
  DnxRTSigsRequest: DnxRTSigsRequest;
  DnxSignedTx: DnxSignedTx;
  EmmcFixPermission: EmmcFixPermission;
  EmmcPath: EmmcPath;
  EmmcPathInfo: EmmcPathInfo;
  EmmcFile: EmmcFile;
  EmmcFileRead: EmmcFileRead;
  EmmcFileWrite: EmmcFileWrite;
  EmmcFileDelete: EmmcFileDelete;
  EmmcDir: EmmcDir;
  EmmcDirList: EmmcDirList;
  EmmcDirMake: EmmcDirMake;
  EmmcDirRemove: EmmcDirRemove;
  EosGetPublicKey: EosGetPublicKey;
  EosPublicKey: EosPublicKey;
  EosTxHeader: EosTxHeader;
  EosSignTx: EosSignTx;
  EosTxActionRequest: EosTxActionRequest;
  EosAsset: EosAsset;
  EosPermissionLevel: EosPermissionLevel;
  EosAuthorizationKey: EosAuthorizationKey;
  EosAuthorizationAccount: EosAuthorizationAccount;
  EosAuthorizationWait: EosAuthorizationWait;
  EosAuthorization: EosAuthorization;
  EosActionCommon: EosActionCommon;
  EosActionTransfer: EosActionTransfer;
  EosActionDelegate: EosActionDelegate;
  EosActionUndelegate: EosActionUndelegate;
  EosActionRefund: EosActionRefund;
  EosActionBuyRam: EosActionBuyRam;
  EosActionBuyRamBytes: EosActionBuyRamBytes;
  EosActionSellRam: EosActionSellRam;
  EosActionVoteProducer: EosActionVoteProducer;
  EosActionUpdateAuth: EosActionUpdateAuth;
  EosActionDeleteAuth: EosActionDeleteAuth;
  EosActionLinkAuth: EosActionLinkAuth;
  EosActionUnlinkAuth: EosActionUnlinkAuth;
  EosActionNewAccount: EosActionNewAccount;
  EosActionUnknown: EosActionUnknown;
  EosTxActionAck: EosTxActionAck;
  EosSignedTx: EosSignedTx;
  EthereumNetworkInfo: EthereumNetworkInfo;
  EthereumTokenInfo: EthereumTokenInfo;
  EthereumDefinitions: EthereumDefinitions;
  EthereumSignTypedDataOneKey: EthereumSignTypedDataOneKey;
  EthereumGnosisSafeTxRequest: EthereumGnosisSafeTxRequest;
  EthereumGnosisSafeTxAck: EthereumGnosisSafeTxAck;
  EthereumTypedDataStructRequestOneKey: EthereumTypedDataStructRequestOneKey;
  EthereumStructMemberOneKey: EthereumStructMemberOneKey;
  EthereumFieldTypeOneKey: EthereumFieldTypeOneKey;
  EthereumTypedDataStructAckOneKey: EthereumTypedDataStructAckOneKey;
  EthereumTypedDataValueRequestOneKey: EthereumTypedDataValueRequestOneKey;
  EthereumTypedDataValueAckOneKey: EthereumTypedDataValueAckOneKey;
  EthereumSignTypedData: EthereumSignTypedData;
  EthereumTypedDataStructRequest: EthereumTypedDataStructRequest;
  EthereumFieldType: EthereumFieldType;
  EthereumStructMember: EthereumStructMember;
  EthereumTypedDataStructAck: EthereumTypedDataStructAck;
  EthereumTypedDataValueRequest: EthereumTypedDataValueRequest;
  EthereumTypedDataValueAck: EthereumTypedDataValueAck;
  EthereumGetPublicKeyOneKey: EthereumGetPublicKeyOneKey;
  EthereumPublicKeyOneKey: EthereumPublicKeyOneKey;
  EthereumGetAddressOneKey: EthereumGetAddressOneKey;
  EthereumAddressOneKey: EthereumAddressOneKey;
  EthereumSignTxOneKey: EthereumSignTxOneKey;
  EthereumAccessListOneKey: EthereumAccessListOneKey;
  EthereumSignTxEIP1559OneKey: EthereumSignTxEIP1559OneKey;
  EthereumAuthorizationSignature: EthereumAuthorizationSignature;
  EthereumAuthorizationOneKey: EthereumAuthorizationOneKey;
  EthereumSignTxEIP7702OneKey: EthereumSignTxEIP7702OneKey;
  EthereumTxRequestOneKey: EthereumTxRequestOneKey;
  EthereumTxAckOneKey: EthereumTxAckOneKey;
  EthereumSignMessageOneKey: EthereumSignMessageOneKey;
  EthereumMessageSignatureOneKey: EthereumMessageSignatureOneKey;
  EthereumVerifyMessageOneKey: EthereumVerifyMessageOneKey;
  EthereumSignTypedHashOneKey: EthereumSignTypedHashOneKey;
  EthereumTypedDataSignatureOneKey: EthereumTypedDataSignatureOneKey;
  EthereumSignMessageEIP712: EthereumSignMessageEIP712;
  EthereumGetPublicKey: EthereumGetPublicKey;
  EthereumPublicKey: EthereumPublicKey;
  EthereumGetAddress: EthereumGetAddress;
  EthereumAddress: EthereumAddress;
  EthereumSignTx: EthereumSignTx;
  EthereumAccessList: EthereumAccessList;
  EthereumSignTxEIP1559: EthereumSignTxEIP1559;
  EthereumTxRequest: EthereumTxRequest;
  EthereumTxAck: EthereumTxAck;
  EthereumSignMessage: EthereumSignMessage;
  EthereumMessageSignature: EthereumMessageSignature;
  EthereumVerifyMessage: EthereumVerifyMessage;
  EthereumSignTypedHash: EthereumSignTypedHash;
  EthereumTypedDataSignature: EthereumTypedDataSignature;
  FilecoinGetAddress: FilecoinGetAddress;
  FilecoinAddress: FilecoinAddress;
  FilecoinSignTx: FilecoinSignTx;
  FilecoinSignedTx: FilecoinSignedTx;
  KaspaGetAddress: KaspaGetAddress;
  KaspaAddress: KaspaAddress;
  KaspaSignTx: KaspaSignTx;
  KaspaTxInputRequest: KaspaTxInputRequest;
  KaspaTxInputAck: KaspaTxInputAck;
  KaspaSignedTx: KaspaSignedTx;
  LnurlAuth: LnurlAuth;
  LnurlAuthResp: LnurlAuthResp;
  Initialize: Initialize;
  GetFeatures: GetFeatures;
  OnekeyGetFeatures: OnekeyGetFeatures;
  Features: Features;
  OnekeyFeatures: OnekeyFeatures;
  LockDevice: LockDevice;
  EndSession: EndSession;
  ApplySettings: ApplySettings;
  ApplyFlags: ApplyFlags;
  ChangePin: ChangePin;
  ChangeWipeCode: ChangeWipeCode;
  SdProtect: SdProtect;
  Ping: Ping;
  Cancel: Cancel;
  GetEntropy: GetEntropy;
  Entropy: Entropy;
  WipeDevice: WipeDevice;
  ResetDevice: ResetDevice;
  BackupDevice: BackupDevice;
  EntropyRequest: EntropyRequest;
  EntropyAck: EntropyAck;
  RecoveryDevice: RecoveryDevice;
  WordRequest: WordRequest;
  WordAck: WordAck;
  SetU2FCounter: SetU2FCounter;
  GetNextU2FCounter: GetNextU2FCounter;
  NextU2FCounter: NextU2FCounter;
  DoPreauthorized: DoPreauthorized;
  PreauthorizedRequest: PreauthorizedRequest;
  CancelAuthorization: CancelAuthorization;
  BixinSeedOperate: BixinSeedOperate;
  BixinMessageSE: BixinMessageSE;
  BixinOutMessageSE: BixinOutMessageSE;
  DeviceBackToBoot: DeviceBackToBoot;
  BixinBackupRequest: BixinBackupRequest;
  BixinBackupAck: BixinBackupAck;
  BixinRestoreRequest: BixinRestoreRequest;
  BixinRestoreAck: BixinRestoreAck;
  BixinVerifyDeviceRequest: BixinVerifyDeviceRequest;
  BixinVerifyDeviceAck: BixinVerifyDeviceAck;
  BixinWhiteListRequest: BixinWhiteListRequest;
  BixinWhiteListAck: BixinWhiteListAck;
  BixinLoadDevice: BixinLoadDevice;
  BixinBackupDevice: BixinBackupDevice;
  BixinBackupDeviceAck: BixinBackupDeviceAck;
  DeviceInfoSettings: DeviceInfoSettings;
  GetDeviceInfo: GetDeviceInfo;
  DeviceInfo: DeviceInfo;
  ReadSEPublicKey: ReadSEPublicKey;
  SEPublicKey: SEPublicKey;
  WriteSEPublicCert: WriteSEPublicCert;
  ReadSEPublicCert: ReadSEPublicCert;
  SEPublicCert: SEPublicCert;
  SpiFlashWrite: SpiFlashWrite;
  SpiFlashRead: SpiFlashRead;
  SpiFlashData: SpiFlashData;
  SESignMessage: SESignMessage;
  SEMessageSignature: SEMessageSignature;
  ResourceUpload: ResourceUpload;
  ZoomRequest: ZoomRequest;
  ResourceRequest: ResourceRequest;
  ResourceAck: ResourceAck;
  ResourceUpdate: ResourceUpdate;
  NFTWriteInfo: NFTWriteInfo;
  NFTWriteData: NFTWriteData;
  RebootToBootloader: RebootToBootloader;
  RebootToBoardloader: RebootToBoardloader;
  ListResDir: ListResDir;
  FileInfo: FileInfo;
  FileInfoList: FileInfoList;
  DeviceEraseSector: DeviceEraseSector;
  UnLockDevice: UnLockDevice;
  UnLockDeviceResponse: UnLockDeviceResponse;
  GetPassphraseState: GetPassphraseState;
  PassphraseState: PassphraseState;
  MoneroRctKeyPublic: MoneroRctKeyPublic;
  MoneroOutputEntry: MoneroOutputEntry;
  MoneroMultisigKLRki: MoneroMultisigKLRki;
  MoneroTransactionSourceEntry: MoneroTransactionSourceEntry;
  MoneroAccountPublicAddress: MoneroAccountPublicAddress;
  MoneroTransactionDestinationEntry: MoneroTransactionDestinationEntry;
  MoneroTransactionRsigData: MoneroTransactionRsigData;
  MoneroGetAddress: MoneroGetAddress;
  MoneroAddress: MoneroAddress;
  MoneroGetWatchKey: MoneroGetWatchKey;
  MoneroWatchKey: MoneroWatchKey;
  MoneroTransactionData: MoneroTransactionData;
  MoneroTransactionInitRequest: MoneroTransactionInitRequest;
  MoneroTransactionInitAck: MoneroTransactionInitAck;
  MoneroTransactionSetInputRequest: MoneroTransactionSetInputRequest;
  MoneroTransactionSetInputAck: MoneroTransactionSetInputAck;
  MoneroTransactionInputsPermutationRequest: MoneroTransactionInputsPermutationRequest;
  MoneroTransactionInputsPermutationAck: MoneroTransactionInputsPermutationAck;
  MoneroTransactionInputViniRequest: MoneroTransactionInputViniRequest;
  MoneroTransactionInputViniAck: MoneroTransactionInputViniAck;
  MoneroTransactionAllInputsSetRequest: MoneroTransactionAllInputsSetRequest;
  MoneroTransactionAllInputsSetAck: MoneroTransactionAllInputsSetAck;
  MoneroTransactionSetOutputRequest: MoneroTransactionSetOutputRequest;
  MoneroTransactionSetOutputAck: MoneroTransactionSetOutputAck;
  MoneroTransactionAllOutSetRequest: MoneroTransactionAllOutSetRequest;
  MoneroRingCtSig: MoneroRingCtSig;
  MoneroTransactionAllOutSetAck: MoneroTransactionAllOutSetAck;
  MoneroTransactionSignInputRequest: MoneroTransactionSignInputRequest;
  MoneroTransactionSignInputAck: MoneroTransactionSignInputAck;
  MoneroTransactionFinalRequest: MoneroTransactionFinalRequest;
  MoneroTransactionFinalAck: MoneroTransactionFinalAck;
  MoneroSubAddressIndicesList: MoneroSubAddressIndicesList;
  MoneroKeyImageExportInitRequest: MoneroKeyImageExportInitRequest;
  MoneroKeyImageExportInitAck: MoneroKeyImageExportInitAck;
  MoneroTransferDetails: MoneroTransferDetails;
  MoneroKeyImageSyncStepRequest: MoneroKeyImageSyncStepRequest;
  MoneroExportedKeyImage: MoneroExportedKeyImage;
  MoneroKeyImageSyncStepAck: MoneroKeyImageSyncStepAck;
  MoneroKeyImageSyncFinalRequest: MoneroKeyImageSyncFinalRequest;
  MoneroKeyImageSyncFinalAck: MoneroKeyImageSyncFinalAck;
  MoneroGetTxKeyRequest: MoneroGetTxKeyRequest;
  MoneroGetTxKeyAck: MoneroGetTxKeyAck;
  MoneroLiveRefreshStartRequest: MoneroLiveRefreshStartRequest;
  MoneroLiveRefreshStartAck: MoneroLiveRefreshStartAck;
  MoneroLiveRefreshStepRequest: MoneroLiveRefreshStepRequest;
  MoneroLiveRefreshStepAck: MoneroLiveRefreshStepAck;
  MoneroLiveRefreshFinalRequest: MoneroLiveRefreshFinalRequest;
  MoneroLiveRefreshFinalAck: MoneroLiveRefreshFinalAck;
  NearGetAddress: NearGetAddress;
  NearAddress: NearAddress;
  NearSignTx: NearSignTx;
  NearSignedTx: NearSignedTx;
  NEMGetAddress: NEMGetAddress;
  NEMAddress: NEMAddress;
  NEMTransactionCommon: NEMTransactionCommon;
  NEMMosaic: NEMMosaic;
  NEMTransfer: NEMTransfer;
  NEMProvisionNamespace: NEMProvisionNamespace;
  NEMMosaicDefinition: NEMMosaicDefinition;
  NEMMosaicCreation: NEMMosaicCreation;
  NEMMosaicSupplyChange: NEMMosaicSupplyChange;
  NEMCosignatoryModification: NEMCosignatoryModification;
  NEMAggregateModification: NEMAggregateModification;
  NEMImportanceTransfer: NEMImportanceTransfer;
  NEMSignTx: NEMSignTx;
  NEMSignedTx: NEMSignedTx;
  NEMDecryptMessage: NEMDecryptMessage;
  NEMDecryptedMessage: NEMDecryptedMessage;
  NeoGetAddress: NeoGetAddress;
  NeoAddress: NeoAddress;
  NeoSignTx: NeoSignTx;
  NeoSignedTx: NeoSignedTx;
  NervosGetAddress: NervosGetAddress;
  NervosAddress: NervosAddress;
  NervosSignTx: NervosSignTx;
  NervosSignedTx: NervosSignedTx;
  NervosTxRequest: NervosTxRequest;
  NervosTxAck: NervosTxAck;
  NexaGetAddress: NexaGetAddress;
  NexaAddress: NexaAddress;
  NexaSignTx: NexaSignTx;
  NexaTxInputRequest: NexaTxInputRequest;
  NexaTxInputAck: NexaTxInputAck;
  NexaSignedTx: NexaSignedTx;
  NostrGetPublicKey: NostrGetPublicKey;
  NostrPublicKey: NostrPublicKey;
  NostrSignEvent: NostrSignEvent;
  NostrSignedEvent: NostrSignedEvent;
  NostrSignSchnorr: NostrSignSchnorr;
  NostrSignedSchnorr: NostrSignedSchnorr;
  NostrEncryptMessage: NostrEncryptMessage;
  NostrEncryptedMessage: NostrEncryptedMessage;
  NostrDecryptMessage: NostrDecryptMessage;
  NostrDecryptedMessage: NostrDecryptedMessage;
  PolkadotGetAddress: PolkadotGetAddress;
  PolkadotAddress: PolkadotAddress;
  PolkadotSignTx: PolkadotSignTx;
  PolkadotSignedTx: PolkadotSignedTx;
  RippleGetAddress: RippleGetAddress;
  RippleAddress: RippleAddress;
  RipplePayment: RipplePayment;
  RippleSignTx: RippleSignTx;
  RippleSignedTx: RippleSignedTx;
  ScdoGetAddress: ScdoGetAddress;
  ScdoAddress: ScdoAddress;
  ScdoSignTx: ScdoSignTx;
  ScdoSignedTx: ScdoSignedTx;
  ScdoTxAck: ScdoTxAck;
  ScdoSignMessage: ScdoSignMessage;
  ScdoSignedMessage: ScdoSignedMessage;
  SolanaGetAddress: SolanaGetAddress;
  SolanaAddress: SolanaAddress;
  SolanaSignTx: SolanaSignTx;
  SolanaSignedTx: SolanaSignedTx;
  SolanaSignOffChainMessage: SolanaSignOffChainMessage;
  SolanaSignUnsafeMessage: SolanaSignUnsafeMessage;
  SolanaMessageSignature: SolanaMessageSignature;
  StarcoinGetAddress: StarcoinGetAddress;
  StarcoinAddress: StarcoinAddress;
  StarcoinGetPublicKey: StarcoinGetPublicKey;
  StarcoinPublicKey: StarcoinPublicKey;
  StarcoinSignTx: StarcoinSignTx;
  StarcoinSignedTx: StarcoinSignedTx;
  StarcoinSignMessage: StarcoinSignMessage;
  StarcoinMessageSignature: StarcoinMessageSignature;
  StarcoinVerifyMessage: StarcoinVerifyMessage;
  StellarAsset: StellarAsset;
  StellarGetAddress: StellarGetAddress;
  StellarAddress: StellarAddress;
  StellarSignTx: StellarSignTx;
  StellarTxOpRequest: StellarTxOpRequest;
  StellarPaymentOp: StellarPaymentOp;
  StellarCreateAccountOp: StellarCreateAccountOp;
  StellarPathPaymentStrictReceiveOp: StellarPathPaymentStrictReceiveOp;
  StellarPathPaymentStrictSendOp: StellarPathPaymentStrictSendOp;
  StellarManageSellOfferOp: StellarManageSellOfferOp;
  StellarManageBuyOfferOp: StellarManageBuyOfferOp;
  StellarCreatePassiveSellOfferOp: StellarCreatePassiveSellOfferOp;
  StellarSetOptionsOp: StellarSetOptionsOp;
  StellarChangeTrustOp: StellarChangeTrustOp;
  StellarAllowTrustOp: StellarAllowTrustOp;
  StellarAccountMergeOp: StellarAccountMergeOp;
  StellarManageDataOp: StellarManageDataOp;
  StellarBumpSequenceOp: StellarBumpSequenceOp;
  StellarSignedTx: StellarSignedTx;
  SuiGetAddress: SuiGetAddress;
  SuiAddress: SuiAddress;
  SuiSignTx: SuiSignTx;
  SuiSignedTx: SuiSignedTx;
  SuiTxRequest: SuiTxRequest;
  SuiTxAck: SuiTxAck;
  SuiSignMessage: SuiSignMessage;
  SuiMessageSignature: SuiMessageSignature;
  TezosGetAddress: TezosGetAddress;
  TezosAddress: TezosAddress;
  TezosGetPublicKey: TezosGetPublicKey;
  TezosPublicKey: TezosPublicKey;
  TezosContractID: TezosContractID;
  TezosRevealOp: TezosRevealOp;
  TezosManagerTransfer: TezosManagerTransfer;
  TezosParametersManager: TezosParametersManager;
  TezosTransactionOp: TezosTransactionOp;
  TezosOriginationOp: TezosOriginationOp;
  TezosDelegationOp: TezosDelegationOp;
  TezosProposalOp: TezosProposalOp;
  TezosBallotOp: TezosBallotOp;
  TezosSignTx: TezosSignTx;
  TezosSignedTx: TezosSignedTx;
  TonGetAddress: TonGetAddress;
  TonAddress: TonAddress;
  TonSignMessage: TonSignMessage;
  TonTxAck: TonTxAck;
  TonSignedMessage: TonSignedMessage;
  TonSignProof: TonSignProof;
  TonSignedProof: TonSignedProof;
  TronGetAddress: TronGetAddress;
  TronAddress: TronAddress;
  TronTransferContract: TronTransferContract;
  TronTriggerSmartContract: TronTriggerSmartContract;
  TronFreezeBalanceContract: TronFreezeBalanceContract;
  TronUnfreezeBalanceContract: TronUnfreezeBalanceContract;
  TronWithdrawBalanceContract: TronWithdrawBalanceContract;
  TronFreezeBalanceV2Contract: TronFreezeBalanceV2Contract;
  TronUnfreezeBalanceV2Contract: TronUnfreezeBalanceV2Contract;
  TronWithdrawExpireUnfreezeContract: TronWithdrawExpireUnfreezeContract;
  TronDelegateResourceContract: TronDelegateResourceContract;
  TronUnDelegateResourceContract: TronUnDelegateResourceContract;
  Vote: Vote;
  TronVoteWitnessContract: TronVoteWitnessContract;
  TronCancelAllUnfreezeV2Contract: TronCancelAllUnfreezeV2Contract;
  TronContract: TronContract;
  TronSignTx: TronSignTx;
  TronSignedTx: TronSignedTx;
  TronSignMessage: TronSignMessage;
  TronMessageSignature: TronMessageSignature;
  facotry: facotry;
};

export type MessageKey = keyof MessageType;

export type MessageResponse<T extends MessageKey> = {
  type: T;
  message: MessageType[T];
};

export type TypedCall = <T extends MessageKey, R extends MessageKey>(
  type: T,
  resType: R,
  message?: MessageType[T]
) => Promise<MessageResponse<R>>;
