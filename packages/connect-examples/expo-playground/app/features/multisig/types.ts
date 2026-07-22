export type MultisigChain = 'eth' | 'btc';

export type MultisigCaseSource =
  | 'firmware-capability'
  | 'existing-example'
  | 'regression'
  | 'custom';

export type MultisigMethod =
  | 'evmSignTypedData'
  | 'evmSignTransaction'
  | 'btcGetAddress'
  | 'btcSignTransaction';

export type MultisigTestCase = {
  id: string;
  title: string;
  description: string;
  chain: MultisigChain;
  source: MultisigCaseSource;
  method: MultisigMethod;
  parameters: Record<string, unknown>;
  expectedDeviceChecks: string[];
  builtIn: boolean;
  localOnly?: boolean;
  testMnemonicOnly?: boolean;
  reference?: MultisigFixtureReference;
  hardwareExpectation?: MultisigHardwareExpectation;
};

export type MultisigHardwareExpectation = {
  signerIndex: 0 | 1 | 2;
  signerEnvKey: `MULTISIG_MNEMONIC_${1 | 2 | 3}`;
  signerAddress: string;
  expectedSignature?: string;
  expectedAddress?: string;
  prefilledSignerIndex?: 0 | 1 | 2;
};

export type MultisigVerificationCheck = {
  label: string;
  passed: boolean;
  expected?: string;
  actual?: string;
};

export type MultisigHardwareVerification =
  | {
      status: 'passed';
      checks: MultisigVerificationCheck[];
    }
  | {
      status: 'failed';
      checks: MultisigVerificationCheck[];
      message: string;
    }
  | {
      status: 'unavailable';
      checks: MultisigVerificationCheck[];
      message: string;
    };

export type ValidationIssue = {
  path: string;
  message: string;
};

export type ValidationResult = {
  valid: boolean;
  issues: ValidationIssue[];
};

export type ExecutionSummaryItem = {
  label: string;
  value: string;
};

export type MultisigFixtureReference = {
  broadcastable: false;
  signerAddresses: readonly string[];
  expectedSignatures: readonly string[];
  digest?: string;
  aggregatedSignatures2Of3?: string;
  aggregatedSignatures3Of3?: string;
  accountXpubs?: readonly string[];
  childPublicKeys?: readonly string[];
  sighash?: string;
  scriptPubKey?: string;
  redeemScript?: string;
  witnessScript?: string;
  fundingTxHex?: string;
  spendingTxHex?: string;
  prevHash?: string;
  doubleSignatures?: readonly string[];
};
