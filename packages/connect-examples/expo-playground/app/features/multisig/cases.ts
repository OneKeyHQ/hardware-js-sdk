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

function safeExecCalldata(innerData: string): string {
  const dataSegment = bytesSegment(innerData);
  const signaturesSegment = bytesSegment('0x');
  const dataOffset = 10 * 32;
  const signaturesOffset = dataOffset + dataSegment.length / 2;
  const head = [
    addressWord(SAFE_TARGET),
    word(0),
    word(dataOffset),
    word(0),
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
    expectedDeviceChecks: ['Safe 地址', '目标地址', '金额', 'operation 与 nonce'],
    builtIn: true,
  };
}

type GeneratedBtcFixture = (typeof GENERATED_MULTISIG_FIXTURES.btc)[number];
type GeneratedBtcScenario = GeneratedBtcFixture['signerScenarios'][number];

function cloneGenerated<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function generatedEthCases(
  fixture: (typeof GENERATED_MULTISIG_FIXTURES.eth)[number]
): MultisigTestCase[] {
  return fixture.reference.signerAddresses.map((signerAddress, signerIndex) => ({
    id: `eth-generated-${fixture.id}-signer-${signerIndex + 1}`,
    title: `${fixture.title} · Signer ${signerIndex + 1}`,
    description: fixture.description,
    chain: 'eth',
    source: 'regression',
    method: 'evmSignTypedData',
    parameters: cloneGenerated(fixture.parameters),
    expectedDeviceChecks: [
      `Signer ${signerIndex + 1}`,
      ...fixture.expectedDeviceChecks,
    ],
    builtIn: true,
    testMnemonicOnly: true,
    reference: cloneGenerated(fixture.reference),
    hardwareExpectation: {
      signerIndex: signerIndex as 0 | 1 | 2,
      signerEnvKey: `MULTISIG_MNEMONIC_${signerIndex + 1}` as
        | 'MULTISIG_MNEMONIC_1'
        | 'MULTISIG_MNEMONIC_2'
        | 'MULTISIG_MNEMONIC_3',
      signerAddress,
      expectedSignature: fixture.reference.expectedSignatures[signerIndex],
    },
  }));
}

function btcAddressCase(
  fixture: GeneratedBtcFixture,
  scenario: GeneratedBtcScenario
): MultisigTestCase {
  return {
    id: `btc-generated-${fixture.id}-address-signer-${scenario.signerIndex + 1}`,
    title: `${fixture.title} 2-of-3 地址 · Signer ${scenario.signerIndex + 1}`,
    description: '由三个环境变量助记词生成的离线 BIP48 多签地址。',
    chain: 'btc',
    source: 'firmware-capability',
    method: 'btcGetAddress',
    parameters: cloneGenerated(fixture.addressParameters),
    expectedDeviceChecks: [
      `Signer ${scenario.signerIndex + 1}`,
      'Bitcoin 网络',
      fixture.title,
      '2 / 3 阈值',
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
  return {
    id: `btc-generated-${fixture.id}-${mode}-signer-${scenario.signerIndex + 1}`,
    title: `${fixture.title} 2-of-3 ${continuing ? '继续签名' : '首次签名'} · Signer ${
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

export const BUILT_IN_MULTISIG_CASES: MultisigTestCase[] = [
  ...GENERATED_MULTISIG_FIXTURES.eth.flatMap(generatedEthCases),
  ethCase('eth-safe-decimal-chain', 'Safe EIP-712 十进制 Chain ID', 'existing-example', safeTypedData('311', '0')),
  {
    id: 'eth-safe-calldata',
    title: 'Safe execTransaction Calldata',
    description: '使用标准 EVM 交易签署 Safe execTransaction calldata。',
    chain: 'eth',
    source: 'regression',
    method: 'evmSignTransaction',
    parameters: {
      path: ETH_PATH,
      transaction: {
        to: SAFE_ADDRESS,
        value: '0x0',
        data: safeExecCalldata('0x'),
        chainId: 1,
        nonce: '0x0',
        gasLimit: '0x30d40',
        gasPrice: '0x3b9aca00',
      },
    },
    expectedDeviceChecks: ['Ethereum', 'Safe 合约地址', 'execTransaction calldata', '交易手续费'],
    builtIn: true,
  },
  {
    id: 'eth-safe-calldata-contract',
    title: 'Safe Calldata 内部 ERC20 调用',
    description: 'Safe execTransaction 内嵌 ERC20 transfer calldata。',
    chain: 'eth',
    source: 'regression',
    method: 'evmSignTransaction',
    parameters: {
      path: ETH_PATH,
      transaction: {
        to: SAFE_ADDRESS,
        value: '0x0',
        data: safeExecCalldata(erc20TransferData),
        chainId: 1,
        nonce: '0x1',
        gasLimit: '0x493e0',
        gasPrice: '0x3b9aca00',
      },
    },
    expectedDeviceChecks: ['Ethereum', 'Safe 合约地址', '非空内部 calldata', '交易手续费'],
    builtIn: true,
  },
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
