export type PublicFixtureReference = {
  broadcastable: false;
  signerAddresses: string[];
  expectedSignatures: string[];
};

export type EthFixtureReference = PublicFixtureReference & {
  digest: string;
  aggregatedSignatures2Of3: string;
  aggregatedSignatures3Of3: string;
};

export type EthMultisigFixture = {
  id: 'standard' | 'delegate-call';
  title: string;
  description: string;
  parameters: {
    path: string;
    data: {
      types: Record<string, Array<{ name: string; type: string }>>;
      domain: Record<string, string>;
      primaryType: string;
      message: Record<string, string>;
    };
  };
  expectedDeviceChecks: string[];
  reference: EthFixtureReference;
};

export type BtcScriptType = 'SPENDMULTISIG' | 'SPENDP2SHWITNESS' | 'SPENDWITNESS';

export type BtcHdNode = {
  depth: number;
  fingerprint: number;
  child_num: number;
  chain_code: string;
  public_key: string;
};

export type BtcMultisigDescriptor = {
  pubkeys: Array<{ node: BtcHdNode; address_n: number[] }>;
  signatures: string[];
  m: number;
};

export type BtcAddressParameters = {
  path: string;
  coin: 'btc';
  showOnOneKey: true;
  scriptType: BtcScriptType;
  multisig: BtcMultisigDescriptor;
};

export type BtcSignParameters = {
  coin: 'btc';
  version: number;
  locktime: number;
  inputs: Array<{
    address_n: number[];
    prev_hash: string;
    prev_index: number;
    sequence: number;
    amount: string;
    script_type: BtcScriptType;
    multisig: BtcMultisigDescriptor;
  }>;
  outputs: Array<{
    address: string;
    amount: string;
    script_type: 'PAYTOADDRESS';
  }>;
  refTxs: Array<{
    hash: string;
    version: number;
    inputs: Array<{
      prev_hash: string;
      prev_index: number;
      script_sig: string;
      sequence: number;
    }>;
    bin_outputs: Array<{ amount: number; script_pubkey: string }>;
    lock_time: number;
  }>;
};

export type BtcFixtureReference = PublicFixtureReference & {
  accountXpubs: string[];
  childPublicKeys: string[];
  sighash: string;
  scriptPubKey: string;
  redeemScript: string;
  witnessScript?: string;
  fundingTxHex: string;
  spendingTxHex: string;
  prevHash: string;
  doubleSignatures: string[];
};

export type BtcMultisigFixture = {
  id: 'p2sh' | 'p2sh-p2wsh' | 'p2wsh' | 'p2wsh-2of2-index2';
  title: string;
  path: string;
  scriptType: BtcScriptType;
  address: string;
  addressParameters: BtcAddressParameters;
  signParameters: BtcSignParameters;
  partialSignParameters: BtcSignParameters;
  signerScenarios: BtcSignerScenario[];
  expectedDeviceChecks: string[];
  reference: BtcFixtureReference;
};

export type BtcSignerScenario = {
  signerIndex: 0 | 1 | 2;
  signerEnvKey: `MULTISIG_MNEMONIC_${1 | 2 | 3}`;
  signerAddress: string;
  expectedSignature: string;
  prefilledSignerIndex: 0 | 1 | 2;
  firstSignParameters: BtcSignParameters;
  continueSignParameters: BtcSignParameters;
};
