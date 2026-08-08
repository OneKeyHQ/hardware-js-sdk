import { describe, expect, test } from '@jest/globals';

import { verifyMultisigHardwareResult } from './hardwareVerification';

import type { MultisigTestCase } from './types';

function createCase(overrides: Partial<MultisigTestCase>): MultisigTestCase {
  return {
    id: 'safe-verification-case',
    title: 'Safe verification case',
    description: 'Uses public expected values only',
    chain: 'eth',
    source: 'regression',
    method: 'evmSignTypedData',
    parameters: {},
    expectedDeviceChecks: [],
    builtIn: false,
    ...overrides,
  };
}

describe('verifyMultisigHardwareResult', () => {
  test('校验 EIP-712 返回的公开地址和签名', () => {
    const testCase = createCase({
      hardwareExpectation: {
        signerIndex: 0,
        signerEnvKey: 'MULTISIG_MNEMONIC_1',
        signerAddress: '0x1234',
        expectedSignature: '0xabcd',
      },
    });

    expect(
      verifyMultisigHardwareResult(testCase, {
        success: true,
        data: { address: '0x1234', signature: '0xABCD' },
      })
    ).toMatchObject({ status: 'passed' });
  });

  test('校验 BTC 多签地址不一致', () => {
    const testCase = createCase({
      chain: 'btc',
      method: 'btcGetAddress',
      hardwareExpectation: {
        signerIndex: 0,
        signerEnvKey: 'MULTISIG_MNEMONIC_1',
        signerAddress: 'public-signer-address',
        expectedAddress: 'expected-public-address',
      },
    });

    expect(
      verifyMultisigHardwareResult(testCase, {
        success: true,
        data: { address: 'different-public-address' },
      })
    ).toMatchObject({ status: 'failed' });
  });

  test('缺少可公开验证的数据时返回 unavailable', () => {
    expect(verifyMultisigHardwareResult(createCase({}), { success: true, data: {} })).toMatchObject({
      status: 'unavailable',
    });
  });
});
