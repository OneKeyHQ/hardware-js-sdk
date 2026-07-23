import { TypedDataEncoder } from 'ethers';

import { deriveEthSigners, ETH_DERIVATION_PATH } from './deriveSigners';
import type { MultisigMnemonics } from './readMnemonics';
import type { EthMultisigFixture } from './types';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const SAFE_ADDRESS = '0x673f21761c5400531a37554a602fe0407addd0dd';
const SAFE_TARGET = '0x5618207d27d78f09f61a5d92190d58c453feb4b7';
const SAFE_TOKEN = '0xdac17f958d2ee523a2206206994597c13d831ec7';
const ERC20_TRANSFER_DATA =
  '0xa9059cbb0000000000000000000000005618207d27d78f09f61a5d92190d58c453feb4b700000000000000000000000000000000000000000000000000000000000f4240';

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

function buildSafeData(
  operation: '0' | '1',
  overrides: Partial<{ to: string; value: string; data: string; nonce: string }> = {}
) {
  return {
    types: SAFE_TYPES,
    domain: { chainId: '0x1', verifyingContract: SAFE_ADDRESS },
    primaryType: 'SafeTx',
    message: {
      to: overrides.to ?? SAFE_TARGET,
      value: overrides.value ?? '10000000000000',
      data: overrides.data ?? '0x',
      operation,
      safeTxGas: '0',
      baseGas: '0',
      gasPrice: '0',
      gasToken: ZERO_ADDRESS,
      refundReceiver: ZERO_ADDRESS,
      nonce: overrides.nonce ?? '0',
    },
  };
}

function aggregateSignatures(signatures: string[]): string {
  return `0x${signatures.map(signature => signature.slice(2)).join('')}`;
}

async function createFixture(
  mnemonics: MultisigMnemonics,
  id: EthMultisigFixture['id'],
  operation: '0' | '1',
  overrides?: Partial<{ to: string; value: string; data: string; nonce: string }>
): Promise<EthMultisigFixture> {
  const signers = deriveEthSigners(mnemonics);
  const data = buildSafeData(operation, overrides);
  const messageTypes = { SafeTx: SAFE_TYPES.SafeTx };
  const digest = TypedDataEncoder.hash(data.domain, messageTypes, data.message);
  const expectedSignatures = await Promise.all(
    signers.map(({ wallet }) => wallet.signTypedData(data.domain, messageTypes, data.message))
  );
  const sortedSignatures = signers
    .map(({ address }, index) => ({ address: address.toLowerCase(), signature: expectedSignatures[index] }))
    .sort((left, right) => left.address.localeCompare(right.address))
    .map(item => item.signature);

  return {
    id,
    title:
      id === 'standard'
        ? 'Safe EIP-712 三签标准交易'
        : id === 'delegate-call'
          ? 'Safe EIP-712 三签 DelegateCall 风险'
          : 'Safe EIP-712 ERC20 Transfer',
    description:
      id === 'standard'
        ? '由三个环境变量助记词生成的离线 Safe EIP-712 测试向量。'
        : id === 'delegate-call'
          ? '由三个环境变量助记词生成的离线 DelegateCall 风险测试向量。'
          : '由三个环境变量助记词生成的离线 Safe ERC20 transfer 测试向量。',
    parameters: { path: ETH_DERIVATION_PATH, data },
    expectedDeviceChecks: [
      'OneKey Pro',
      'Safe 地址',
      '目标地址',
      '金额与 Data',
      'Operation 与 Nonce',
      'Safe Tx Gas 与 Base Gas',
      'Gas Price、Gas Token 与 Refund Receiver',
    ],
    reference: {
      broadcastable: false,
      safeThreshold: 2,
      digest,
      signerAddresses: signers.map(item => item.address),
      expectedSignatures,
      aggregatedSignatures2Of3: aggregateSignatures(sortedSignatures.slice(0, 2)),
      aggregatedSignatures3Of3: aggregateSignatures(sortedSignatures),
    },
  };
}

export async function generateEthFixtures(
  mnemonics: MultisigMnemonics
): Promise<EthMultisigFixture[]> {
  return Promise.all([
    createFixture(mnemonics, 'standard', '0'),
    createFixture(mnemonics, 'delegate-call', '1'),
    createFixture(mnemonics, 'erc20-transfer', '0', {
      to: SAFE_TOKEN,
      value: '0',
      data: ERC20_TRANSFER_DATA,
      nonce: '1',
    }),
  ]);
}
