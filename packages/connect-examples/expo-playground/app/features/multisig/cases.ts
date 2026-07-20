import type { MultisigTestCase } from './types';

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

type BtcFixture = {
  id: 'p2sh' | 'p2sh-p2wsh' | 'p2wsh';
  title: string;
  path: string;
  scriptType: 'SPENDMULTISIG' | 'SPENDP2SHWITNESS' | 'SPENDWITNESS';
  scriptPubKey: string;
  prevHash: string;
  xpubs: string[];
};

const BTC_FIXTURES: BtcFixture[] = [
  {
    id: 'p2sh',
    title: 'P2SH',
    path: "m/48'/0'/0'/0'/0/0",
    scriptType: 'SPENDMULTISIG',
    scriptPubKey: 'a91444b6aa53957920f5091d3a98b45edcce9a79b7d887',
    prevHash: 'bdf10a737e83800470b1582384e4fc5fcfbe0fe527c6e9b558c52d445c1341cb',
    xpubs: [
      'xpub6DkFAXWQ2dHxkZU4qtXWMUGXJ71JvpUUBua4KZsYe8gK7iVx8AKiiMYbdHaiSqjuTfJgnfegvcxFniuxBvLSTrGmaFCGQ2rD9bN4f246pcb',
      'xpub6DzhyrnFFYQ1BaHWwiUvirZuxhoMgxA2KuHHZBLdHYUCCWwJgXTFVPs78JY5MzhGpRzs4szytbkMtXa2ZqzCSw3r1oSketrwjLR6RPNuZD6',
      'xpub6EGx8sPr9FxPJ7pfwQeVZuwM2Jn8tSAX9QgqhfGAfQiLsZqWRj9yB3qrccWwn8dYMKDUndyB9jGmxUfEuPnV3s82Vp2BfAZVzoM4MkY6Wce',
    ],
  },
  {
    id: 'p2sh-p2wsh',
    title: 'P2SH-P2WSH',
    path: "m/48'/0'/0'/1'/0/0",
    scriptType: 'SPENDP2SHWITNESS',
    scriptPubKey: 'a9140f8862ea25cbcffc77adc3e2fd31b47d5d29d70a87',
    prevHash: 'e69a9df1e5ac2aeafd057cc970373c95f6e767021ad251fd20909fef22948bf8',
    xpubs: [
      'xpub6DzhyrnFFYQ1FPVG7FSe3uPjG26PgcHNx9ASgsctjPt1VVAufCtnKnMBvvHtvLTBPrdpMt3P86Lrr6NDRjoVMfw6JMocj5Jp4J99DGkmRTi',
      'xpub6EGx8sPr9FxPK4d4zzRp9ziKGuS7gjvdUUNcBjk9oXzYovZhJFgRcciM2m5uT8CGkDp2ffc45SwBFhm8P57rCqenoUvYt5MSpt7n9kVyNT1',
      'xpub6DkFAXWQ2dHxnMKoSBogHrw1rgNJKR4umdbnNVNTYeCGcduxWnNUHgGptqEQWPKRmeW4Zn4FHSbLMBKEWYaMDYu47Ytg6DdFnPNt8hwn5mE',
    ],
  },
  {
    id: 'p2wsh',
    title: 'P2WSH',
    path: "m/48'/0'/0'/2'/0/0",
    scriptType: 'SPENDWITNESS',
    scriptPubKey: '00205405a6339ab788542f1ab2509cbc3a35afb66dbfe17d9ce2562582db2d8183cf',
    prevHash: '0b8bac135a74b667f6108a9060fa62902723ac9bf37f33128ba10e68cbf6cd80',
    xpubs: [
      'xpub6EGx8sPr9FxPPE1rbZazhqWwpMXA3Hf5DYKtZbL7c4BSddzmQktp96UaTvecEkoCZysuaj79GMCFZYT1KKk7Ph2M3Kf5g8B82KZ8TZ9SKQR',
      'xpub6DzhyrnFFYQ1HimDiM388xHnDiRPNdZJFBmmxge3Y1WWcHLtMJLfRuhRHqnQCPbTj3fGKTuKFLHzzwpJkp5Dtc3UtLKZKaVZe1yqMBXd6Vk',
      'xpub6DkFAXWQ2dHxq2vatrt9qyA3bXYU4ToWQwCHbf5XB2mSTexcHZCeKS1VZYcPoBd5X8yVcbXFHJR9R8UCVpt82VX1VhR28mCyxUFL4r6KFrf',
    ],
  },
];

function btcMultisig(fixture: BtcFixture, signatures = ['', '', '']) {
  return {
    pubkeys: fixture.xpubs.map(node => ({ node, address_n: [0, 0] })),
    signatures,
    m: 2,
  };
}

function btcAddressCase(fixture: BtcFixture): MultisigTestCase {
  return {
    id: `btc-${fixture.id}-address`,
    title: `${fixture.title} 2-of-3 地址`,
    description: '根据固件 BIP48 多签能力整理，显示并核对测试地址。',
    chain: 'btc',
    source: 'firmware-capability',
    method: 'btcGetAddress',
    parameters: {
      path: fixture.path,
      coin: 'btc',
      showOnOneKey: true,
      scriptType: fixture.scriptType,
      multisig: btcMultisig(fixture),
    },
    expectedDeviceChecks: ['Bitcoin 网络', fixture.title, '2 / 3 阈值', '设备显示地址'],
    builtIn: true,
    testMnemonicOnly: true,
  };
}

function btcSignCase(fixture: BtcFixture, partial = false): MultisigTestCase {
  const partialSignature =
    '3044022011111111111111111111111111111111111111111111111111111111111111110220222222222222222222222222222222222222222222222222222222222222222201';
  const signatures = partial ? [partialSignature, '', ''] : ['', '', ''];
  return {
    id: `btc-${fixture.id}-${partial ? 'partial-' : ''}sign`,
    title: `${fixture.title} 2-of-3 ${partial ? '继续签名' : '交易签名'}`,
    description: partial
      ? '协议槽位回归：携带一个公开测试签名继续生成下一签名，不可广播。'
      : '花费固件默认测试助记词生成的确定性多签引用交易。',
    chain: 'btc',
    source: 'regression',
    method: 'btcSignTransaction',
    parameters: {
      coin: 'btc',
      inputs: [
        {
          address_n: fixture.path,
          prev_hash: fixture.prevHash,
          prev_index: 0,
          amount: '200000',
          script_type: fixture.scriptType,
          multisig: btcMultisig(fixture, signatures),
        },
      ],
      outputs: [
        {
          address: '1BitcoinEaterAddressDontSendf59kuE',
          amount: '190000',
          script_type: 'PAYTOADDRESS',
        },
      ],
      refTxs: [
        {
          hash: fixture.prevHash,
          version: 2,
          inputs: [
            {
              prev_hash: '0000000000000000000000000000000000000000000000000000000000000000',
              prev_index: 4294967295,
              script_sig: '00',
              sequence: 4294967295,
            },
          ],
          bin_outputs: [{ amount: 200000, script_pubkey: fixture.scriptPubKey }],
          lock_time: 0,
        },
      ],
    },
    expectedDeviceChecks: ['Bitcoin 网络', fixture.title, '发送 190000 sats', '手续费 10000 sats'],
    builtIn: true,
    testMnemonicOnly: true,
  };
}

const erc20TransferData =
  '0xa9059cbb0000000000000000000000005618207d27d78f09f61a5d92190d58c453feb4b700000000000000000000000000000000000000000000000000000000000f4240';

export const BUILT_IN_MULTISIG_CASES: MultisigTestCase[] = [
  ethCase('eth-safe-standard', 'Safe EIP-712 标准交易', 'existing-example', safeTypedData('0x1', '0')),
  ethCase('eth-safe-decimal-chain', 'Safe EIP-712 十进制 Chain ID', 'existing-example', safeTypedData('311', '0')),
  ethCase('eth-safe-danger', 'Safe EIP-712 DelegateCall 风险', 'existing-example', safeTypedData('0x1', '1')),
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
  ...BTC_FIXTURES.map(btcAddressCase),
  ...BTC_FIXTURES.map(fixture => btcSignCase(fixture)),
  btcSignCase(BTC_FIXTURES[2], true),
  {
    ...btcAddressCase(BTC_FIXTURES[2]),
    id: 'btc-invalid-threshold',
    title: 'BTC 无效 4-of-3 阈值',
    description: '本地校验负向用例，不发送到设备。',
    parameters: {
      ...btcAddressCase(BTC_FIXTURES[2]).parameters,
      multisig: { ...btcMultisig(BTC_FIXTURES[2]), m: 4 },
    },
    source: 'regression',
    localOnly: true,
  },
];
