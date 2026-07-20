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
