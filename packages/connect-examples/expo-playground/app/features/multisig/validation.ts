import type {
  ExecutionSummaryItem,
  MultisigTestCase,
  ValidationIssue,
  ValidationResult,
} from './types';

const EVM_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const HEX_RE = /^0x[0-9a-fA-F]*$/;
const BIP32_PATH_RE = /^m(?:\/[0-9]+'?)+$/;

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function addIssue(issues: ValidationIssue[], path: string, message: string) {
  issues.push({ path, message });
}

function validatePath(issues: ValidationIssue[], path: unknown) {
  if (typeof path !== 'string' || !BIP32_PATH_RE.test(path)) {
    addIssue(issues, 'path', '派生路径格式无效');
  }
}

function validateMultisig(
  issues: ValidationIssue[],
  value: unknown,
  path: string
): void {
  const multisig = asRecord(value);
  if (!multisig) {
    addIssue(issues, path, '多签参数不能为空');
    return;
  }

  const pubkeys = asArray(multisig.pubkeys);
  const m = Number(multisig.m);
  if (!Number.isInteger(m) || m < 1 || m > pubkeys.length) {
    addIssue(issues, `${path}.m`, '签名阈值必须在 1 到公钥数量之间');
  }

  if (pubkeys.length < 2) {
    addIssue(issues, `${path}.pubkeys`, '多签至少需要两个公钥');
  }

  const signatures = asArray(multisig.signatures);
  if (signatures.length > pubkeys.length) {
    addIssue(issues, `${path}.signatures`, '签名槽位不能超过公钥数量');
  }
}

function validateEth(testCase: MultisigTestCase, issues: ValidationIssue[]) {
  const params = testCase.parameters;
  validatePath(issues, params.path);

  if (testCase.method === 'evmSignTypedData') {
    const data = asRecord(params.data);
    const domain = asRecord(data?.domain);
    const message = asRecord(data?.message);
    const types = asRecord(data?.types);
    if (!data || !domain || !message || !types || typeof data.primaryType !== 'string') {
      addIssue(issues, 'data', 'EIP-712 types、domain、primaryType 和 message 必须完整');
      return;
    }
    if (!EVM_ADDRESS_RE.test(String(domain.verifyingContract ?? ''))) {
      addIssue(issues, 'data.domain.verifyingContract', 'Safe 地址格式无效');
    }
    if (!EVM_ADDRESS_RE.test(String(message.to ?? ''))) {
      addIssue(issues, 'data.message.to', '目标地址格式无效');
    }
    if (domain.chainId === undefined || domain.chainId === '') {
      addIssue(issues, 'data.domain.chainId', 'chainId 不能为空');
    }
    return;
  }

  const transaction = asRecord(params.transaction);
  if (!transaction) {
    addIssue(issues, 'transaction', '交易参数不能为空');
    return;
  }
  if (!EVM_ADDRESS_RE.test(String(transaction.to ?? ''))) {
    addIssue(issues, 'transaction.to', '目标合约地址格式无效');
  }
  if (!HEX_RE.test(String(transaction.data ?? ''))) {
    addIssue(issues, 'transaction.data', 'calldata 必须是十六进制字符串');
  }
  if (transaction.chainId === undefined || transaction.chainId === '') {
    addIssue(issues, 'transaction.chainId', 'chainId 不能为空');
  }
}

function validateBtc(testCase: MultisigTestCase, issues: ValidationIssue[]) {
  const params = testCase.parameters;
  if (testCase.method === 'btcGetAddress') {
    validatePath(issues, params.path);
    if (!['SPENDMULTISIG', 'SPENDP2SHWITNESS', 'SPENDWITNESS'].includes(String(params.scriptType))) {
      addIssue(issues, 'scriptType', '不支持的 BTC 多签脚本类型');
    }
    validateMultisig(issues, params.multisig, 'multisig');
    return;
  }

  const inputs = asArray(params.inputs);
  const outputs = asArray(params.outputs);
  const refTxs = asArray(params.refTxs);
  if (inputs.length === 0) addIssue(issues, 'inputs', '至少需要一个输入');
  if (outputs.length === 0) addIssue(issues, 'outputs', '至少需要一个输出');
  if (refTxs.length === 0) addIssue(issues, 'refTxs', '至少需要一条引用交易');

  inputs.forEach((input, index) => {
    const record = asRecord(input);
    if (!record) {
      addIssue(issues, `inputs[${index}]`, '输入格式无效');
      return;
    }
    validatePath(issues, record.address_n);
    if (!['SPENDMULTISIG', 'SPENDP2SHWITNESS', 'SPENDWITNESS'].includes(String(record.script_type))) {
      addIssue(issues, `inputs[${index}].script_type`, '不支持的 BTC 多签脚本类型');
    }
    validateMultisig(issues, record.multisig, `inputs[${index}].multisig`);
  });

  const inputTotal = inputs.reduce<number>((total, input) => {
    const amount = Number(asRecord(input)?.amount ?? 0);
    return total + (Number.isFinite(amount) ? amount : 0);
  }, 0);
  const outputTotal = outputs.reduce<number>((total, output) => {
    const amount = Number(asRecord(output)?.amount ?? 0);
    return total + (Number.isFinite(amount) ? amount : 0);
  }, 0);
  if (inputTotal < outputTotal) {
    addIssue(issues, 'outputs', '输出总额不能超过输入总额');
  }
}

export function validateMultisigCase(testCase: MultisigTestCase): ValidationResult {
  const issues: ValidationIssue[] = [];
  if (testCase.chain === 'eth') validateEth(testCase, issues);
  else validateBtc(testCase, issues);
  return { valid: issues.length === 0, issues };
}

function truncate(value: unknown, length = 28): string {
  const text = String(value ?? '-');
  return text.length > length ? `${text.slice(0, length)}…` : text;
}

export function buildExecutionSummary(testCase: MultisigTestCase): ExecutionSummaryItem[] {
  const params = testCase.parameters;
  if (testCase.chain === 'eth') {
    if (testCase.method === 'evmSignTypedData') {
      const data = asRecord(params.data);
      const domain = asRecord(data?.domain);
      const message = asRecord(data?.message);
      return [
        { label: '方法', value: testCase.method },
        { label: 'Safe', value: truncate(domain?.verifyingContract) },
        { label: '目标', value: truncate(message?.to) },
        { label: '金额', value: String(message?.value ?? '0') },
      ];
    }
    const transaction = asRecord(params.transaction);
    return [
      { label: '方法', value: testCase.method },
      { label: '合约', value: truncate(transaction?.to) },
      { label: 'Chain ID', value: String(transaction?.chainId ?? '-') },
      { label: 'Calldata', value: truncate(transaction?.data) },
    ];
  }

  if (testCase.method === 'btcGetAddress') {
    const multisig = asRecord(params.multisig);
    return [
      { label: '方法', value: testCase.method },
      { label: '脚本', value: String(params.scriptType) },
      { label: '阈值', value: `${multisig?.m ?? '-'} / ${asArray(multisig?.pubkeys).length}` },
      { label: '路径', value: String(params.path ?? '-') },
    ];
  }

  const firstInput = asRecord(asArray(params.inputs)[0]);
  const multisig = asRecord(firstInput?.multisig);
  return [
    { label: '方法', value: testCase.method },
    { label: '脚本', value: String(firstInput?.script_type ?? '-') },
    { label: '阈值', value: `${multisig?.m ?? '-'} / ${asArray(multisig?.pubkeys).length}` },
    { label: '输入金额', value: String(firstInput?.amount ?? '-') },
  ];
}
