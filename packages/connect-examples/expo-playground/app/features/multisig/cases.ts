import type { MultisigTestCase } from './types';
import { GENERATED_MULTISIG_FIXTURES } from './generatedFixtures';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const SAFE_ADDRESS = '0x673f21761c5400531a37554a602fe0407addd0dd';
const SAFE_TARGET = '0x5618207d27d78f09f61a5d92190d58c453feb4b7';
const ETH_PATH = "m/44'/60'/0'/0/0";

const SAFE_TYPES = {
  SafeTx: [
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'data', type: 'bytes' },
    { name: 'operation', type: 'uint8' },
    { name: 'safeTxGas', type: 'uint256' },
    { name: 'baseGas', type: 'uint256' },
    { name: 'gasPrice', type: 'uint256' },
    { name: 'gasToken', type: 'address' },
    { name: 'refundReceiver', type: 'address' },
    { name: 'nonce', type: 'uint256' },
  ],
  EIP712Domain: [
    { name: 'chainId', type: 'uint256' },
    { name: 'verifyingContract', type: 'address' },
  ],
};

function safeTypedData(chainId: string, operation: string) {
  return {
    types: SAFE_TYPES,
    domain: { chainId, verifyingContract: SAFE_ADDRESS },
    primaryType: 'SafeTx',
    message: {
      to: SAFE_TARGET,
      value: '10000000000000',
      data: '0x',
      operation,
      safeTxGas: '0',
      baseGas: '0',
      gasPrice: '0',
      gasToken: ZERO_ADDRESS,
      refundReceiver: ZERO_ADDRESS,
      nonce: '0',
    },
  };
}

function word(value: string | number | bigint): string {
  const raw = typeof value === 'string' && value.startsWith('0x') ? value.slice(2) : BigInt(value).toString(16);
  return raw.padStart(64, '0');
}

function addressWord(address: string): string {
  return address.slice(2).padStart(64, '0');
}

function bytesSegment(data: string): string {
  const raw = data.replace(/^0x/, '');
  const padded = raw.padEnd(Math.ceil(raw.length / 64) * 64, '0');
  return `${word(raw.length / 2)}${padded}`;
}

function safeExecCalldata(innerData: string, operation: '0' | '1' = '0'): string {
  const dataSegment = bytesSegment(innerData);
  const signaturesSegment = bytesSegment('0x');
  const dataOffset = 10 * 32;
  const signaturesOffset = dataOffset + dataSegment.length / 2;
  const head = [
    addressWord(SAFE_TARGET),
    word(0),
    word(dataOffset),
    word(operation),
    word(0),
    word(0),
    word(0),
    addressWord(ZERO_ADDRESS),
    addressWord(ZERO_ADDRESS),
    word(signaturesOffset),
  ].join('');
  return `0x6a761202${head}${dataSegment}${signaturesSegment}`;
}

function ethCase(
  id: string,
  title: string,
  source: MultisigTestCase['source'],
  data: ReturnType<typeof safeTypedData>
): MultisigTestCase {
  return {
    id,
    title,
    description: '使用设备签署 Safe EIP-712 结构化交易。',
    chain: 'eth',
    source,
    method: 'evmSignTypedData',
    parameters: { path: ETH_PATH, data },
    expectedDeviceChecks: [
      'OneKey Pro',
      'Safe 地址',
      '目标地址',
      '金额与 Data',
      'Operation 与 Nonce',
      'Safe Tx Gas 与 Base Gas',
      'Gas Price、Gas Token 与 Refund Receiver',
    ],
    builtIn: true,
    protocolTarget: 'onekey-pro-v1',
  };
}

type GeneratedBtcFixture = (typeof GENERATED_MULTISIG_FIXTURES.btc)[number];
type GeneratedBtcScenario = GeneratedBtcFixture['signerScenarios'][number];

function cloneGenerated<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function evmTransactionCase(
  id: string,
  title: string,
  description: string,
  transaction: Record<string, unknown>,
  expectedDeviceChecks: string[]
): MultisigTestCase {
  const signerIndex = 0 as const;
  const signerAddress =
    GENERATED_MULTISIG_FIXTURES.eth[0].reference.signerAddresses[signerIndex];

  return {
    id,
    title: `${title} · Signer 1`,
    description,
    chain: 'eth',
    source: 'regression',
    method: 'evmSignTransaction',
    parameters: { path: ETH_PATH, transaction },
    expectedDeviceChecks: ['Signer 1', ...expectedDeviceChecks],
    builtIn: true,
    testMnemonicOnly: true,
    hardwareExpectation: {
      signerIndex,
      signerEnvKey: 'MULTISIG_MNEMONIC_1',
      signerAddress,
    },
  };
}

function generatedEthCases(
  fixture: (typeof GENERATED_MULTISIG_FIXTURES.eth)[number]
): MultisigTestCase[] {
  const signerIndex = 0 as const;
  return [{
    id: `eth-generated-${fixture.id}-signer-1`,
    title: `${fixture.title} · Signer 1`,
    description: fixture.description,
    chain: 'eth',
    source: 'regression',
    method: 'evmSignTypedData',
    parameters: cloneGenerated(fixture.parameters),
    expectedDeviceChecks: [
      'Signer 1',
      ...fixture.expectedDeviceChecks,
    ],
    builtIn: true,
    testMnemonicOnly: true,
    protocolTarget: 'onekey-pro-v1',
    reference: cloneGenerated(fixture.reference),
    hardwareExpectation: {
      signerIndex,
      signerEnvKey: 'MULTISIG_MNEMONIC_1',
      signerAddress: fixture.reference.signerAddresses[signerIndex],
      expectedSignature: fixture.reference.expectedSignatures[signerIndex],
    },
  }];
}

function btcAddressCase(
  fixture: GeneratedBtcFixture,
  scenario: GeneratedBtcScenario
): MultisigTestCase {
  const threshold =
    `${fixture.addressParameters.multisig.m}-of-` +
    fixture.addressParameters.multisig.pubkeys.length;
  return {
    id: `btc-generated-${fixture.id}-address-signer-${scenario.signerIndex + 1}`,
    title: `${fixture.title} ${threshold} 地址 · Signer ${scenario.signerIndex + 1}`,
    description: '由环境变量测试助记词生成的离线 BIP48 多签地址。',
    chain: 'btc',
    source: 'firmware-capability',
    method: 'btcGetAddress',
    parameters: cloneGenerated(fixture.addressParameters),
    expectedDeviceChecks: [
      `Signer ${scenario.signerIndex + 1}`,
      'Bitcoin 网络',
      fixture.title,
      `${fixture.addressParameters.multisig.m} / ${
        fixture.addressParameters.multisig.pubkeys.length
      } 阈值`,
      '设备显示地址',
    ],
    builtIn: true,
    testMnemonicOnly: true,
    reference: cloneGenerated(fixture.reference),
    hardwareExpectation: {
      signerIndex: scenario.signerIndex,
      signerEnvKey: scenario.signerEnvKey,
      signerAddress: scenario.signerAddress,
      expectedAddress: fixture.address,
    },
  };
}

function btcSignCase(
  fixture: GeneratedBtcFixture,
  scenario: GeneratedBtcScenario,
  mode: 'first' | 'continue'
): MultisigTestCase {
  const continuing = mode === 'continue';
  const multisig = scenario.firstSignParameters.inputs[0].multisig;
  const threshold = `${multisig.m}-of-${multisig.pubkeys.length}`;
  return {
    id: `btc-generated-${fixture.id}-${mode}-signer-${scenario.signerIndex + 1}`,
    title: `${fixture.title} ${threshold} ${continuing ? '继续签名' : '首次签名'} · Signer ${
      scenario.signerIndex + 1
    }`,
    description: continuing
      ? `携带 signer ${scenario.prefilledSignerIndex + 1} 的合法签名，由 signer ${
          scenario.signerIndex + 1
        } 设备继续签名；不可广播。`
      : '花费离线虚构 funding transaction 的确定性多签测试交易。',
    chain: 'btc',
    source: 'regression',
    method: 'btcSignTransaction',
    parameters: cloneGenerated(
      continuing ? scenario.continueSignParameters : scenario.firstSignParameters
    ),
    expectedDeviceChecks: [
      `Signer ${scenario.signerIndex + 1}`,
      'Bitcoin 网络',
      fixture.title,
      '发送 190000 sats',
      '手续费 10000 sats',
    ],
    builtIn: true,
    testMnemonicOnly: true,
    reference: cloneGenerated(fixture.reference),
    hardwareExpectation: {
      signerIndex: scenario.signerIndex,
      signerEnvKey: scenario.signerEnvKey,
      signerAddress: scenario.signerAddress,
      expectedSignature: scenario.expectedSignature,
      ...(continuing ? { prefilledSignerIndex: scenario.prefilledSignerIndex } : {}),
    },
  };
}

const erc20TransferData =
  '0xa9059cbb0000000000000000000000005618207d27d78f09f61a5d92190d58c453feb4b700000000000000000000000000000000000000000000000000000000000f4240';
const safeApproveHashData = `0xd4d9bdcd${'11'.repeat(32)}`;

const BUILT_IN_MULTISIG_BASE_CASES: MultisigTestCase[] = [
  ...GENERATED_MULTISIG_FIXTURES.eth.flatMap(generatedEthCases),
  ethCase('eth-safe-decimal-chain', 'Safe EIP-712 十进制 Chain ID', 'existing-example', safeTypedData('311', '0')),
  evmTransactionCase(
    'eth-safe-calldata',
    'Safe execTransaction Calldata',
    '使用标准 EVM 交易签署 Safe execTransaction calldata。',
    {
      to: SAFE_ADDRESS,
      value: '0x0',
      data: safeExecCalldata('0x'),
      chainId: 1,
      nonce: '0x0',
      gasLimit: '0x30d40',
      gasPrice: '0x3b9aca00',
    },
    ['Ethereum', 'Safe 合约地址', 'execTransaction calldata', '交易手续费']
  ),
  evmTransactionCase(
    'eth-safe-calldata-contract',
    'Safe Calldata 内部 ERC20 调用',
    'Safe execTransaction 内嵌 ERC20 transfer calldata。',
    {
      to: SAFE_ADDRESS,
      value: '0x0',
      data: safeExecCalldata(erc20TransferData),
      chainId: 1,
      nonce: '0x1',
      gasLimit: '0x493e0',
      gasPrice: '0x3b9aca00',
    },
    ['Ethereum', 'Safe 合约地址', '非空内部 calldata', '交易手续费']
  ),
  evmTransactionCase(
    'eth-safe-calldata-eip1559',
    'Safe execTransaction EIP-1559',
    '使用 EIP-1559 费用字段签署 Safe execTransaction calldata。',
    {
      to: SAFE_ADDRESS,
      value: '0x0',
      data: safeExecCalldata(erc20TransferData),
      chainId: 1,
      nonce: '0x2',
      gasLimit: '0x493e0',
      maxFeePerGas: '0x77359400',
      maxPriorityFeePerGas: '0x3b9aca00',
    },
    ['Ethereum', 'Safe 合约地址', 'EIP-1559 费用', '非空内部 calldata']
  ),
  evmTransactionCase(
    'eth-safe-approve-hash',
    'Safe approveHash',
    '签署 Safe approveHash(bytes32) calldata。',
    {
      to: SAFE_ADDRESS,
      value: '0x0',
      data: safeApproveHashData,
      chainId: 1,
      nonce: '0x3',
      gasLimit: '0x186a0',
      gasPrice: '0x3b9aca00',
    },
    ['Ethereum', 'Safe 合约地址', 'approveHash', '待批准哈希']
  ),
  evmTransactionCase(
    'eth-safe-calldata-delegate-call',
    'Safe execTransaction DelegateCall',
    '签署 operation=1 的 Safe execTransaction DelegateCall 风险用例。',
    {
      to: SAFE_ADDRESS,
      value: '0x0',
      data: safeExecCalldata('0x', '1'),
      chainId: 1,
      nonce: '0x4',
      gasLimit: '0x30d40',
      gasPrice: '0x3b9aca00',
    },
    ['Ethereum', 'Safe 合约地址', 'DelegateCall operation=1', '风险提示']
  ),
  ...GENERATED_MULTISIG_FIXTURES.btc.flatMap(fixture =>
    fixture.signerScenarios.map(scenario => btcAddressCase(fixture, scenario))
  ),
  ...GENERATED_MULTISIG_FIXTURES.btc.flatMap(fixture =>
    fixture.signerScenarios.map(scenario => btcSignCase(fixture, scenario, 'first'))
  ),
  ...GENERATED_MULTISIG_FIXTURES.btc.flatMap(fixture =>
    fixture.signerScenarios.map(scenario => btcSignCase(fixture, scenario, 'continue'))
  ),
  {
    ...btcAddressCase(
      GENERATED_MULTISIG_FIXTURES.btc[2],
      GENERATED_MULTISIG_FIXTURES.btc[2].signerScenarios[0]
    ),
    id: 'btc-invalid-threshold',
    title: 'BTC 无效 4-of-3 阈值',
    description: '本地校验负向用例，不发送到设备。',
    parameters: {
      ...cloneGenerated(GENERATED_MULTISIG_FIXTURES.btc[2].addressParameters),
      multisig: {
        ...cloneGenerated(GENERATED_MULTISIG_FIXTURES.btc[2].addressParameters.multisig),
        m: 4,
      },
    },
    source: 'regression',
    localOnly: true,
    hardwareExpectation: undefined,
  },
];

export const BUILT_IN_MULTISIG_CASES: MultisigTestCase[] =
  BUILT_IN_MULTISIG_BASE_CASES.map(testCase => ({
  ...testCase,
  parameters: {
    ...testCase.parameters,
    // 基准向量由测试助记词的标准钱包生成，避免误入隐藏钱包导致地址和签名变化。
    useEmptyPassphrase: true,
  },
}));
