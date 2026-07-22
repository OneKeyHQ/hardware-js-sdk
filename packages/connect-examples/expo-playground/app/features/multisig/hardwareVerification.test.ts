import { getPublicKey, sign } from '@noble/secp256k1';
import { describe, expect, test } from '@jest/globals';

import { BUILT_IN_MULTISIG_CASES } from './cases';
import { verifyMultisigHardwareResult } from './hardwareVerification';

function getCase(id: string) {
  const testCase = BUILT_IN_MULTISIG_CASES.find(item => item.id === id);
  if (!testCase) throw new Error(`缺少测试用例 ${id}`);
  return testCase;
}

describe('verifyMultisigHardwareResult', () => {
  test('校验 ETH signer 地址和 EIP-712 签名', () => {
    const testCase = getCase('eth-generated-standard-signer-1');
    const expectation = testCase.hardwareExpectation!;

    const result = verifyMultisigHardwareResult(testCase, {
      success: true,
      data: {
        address: expectation.signerAddress.toLowerCase(),
        signature: expectation.expectedSignature?.toUpperCase().replace(/^0X/, ''),
      },
    });

    expect(result.status).toBe('passed');
    expect(result.checks).toHaveLength(2);
  });

  test('校验 BTC 多签地址', () => {
    const testCase = getCase('btc-generated-p2wsh-address-signer-1');

    expect(
      verifyMultisigHardwareResult(testCase, {
        success: true,
        data: { address: testCase.hardwareExpectation?.expectedAddress },
      }).status
    ).toBe('passed');
  });

  test('六个 BTC 签名用例均兼容 SDK 省略 SIGHASH_ALL 后缀', () => {
    const testCases = BUILT_IN_MULTISIG_CASES.filter(
      testCase =>
        testCase.id.startsWith('btc-generated-') && testCase.method === 'btcSignTransaction'
    );

    expect(testCases).toHaveLength(6);
    testCases.forEach(testCase => {
      const expected = testCase.hardwareExpectation?.expectedSignature ?? '';
      expect(
        verifyMultisigHardwareResult(testCase, {
          success: true,
          data: { signatures: [expected.slice(0, -2)] },
        }).status
      ).toBe('passed');
    });
  });

  test('BTC 接受字节不同但可由当前 signer 公钥验证的签名', async () => {
    const privateKey = '01'.padStart(64, '0');
    const sighash = '11'.repeat(32);
    const [offlineSignature, hardwareSignature] = await Promise.all([
      sign(sighash, privateKey, { canonical: true, der: true }),
      sign(sighash, privateKey, {
        canonical: true,
        der: true,
        extraEntropy: '22'.repeat(32),
      }),
    ]);
    const offlineSignatureHex = Buffer.from(offlineSignature).toString('hex');
    const hardwareSignatureHex = Buffer.from(hardwareSignature).toString('hex');
    const baseCase = getCase('btc-generated-p2sh-first-signer-1');

    expect(hardwareSignatureHex).not.toBe(offlineSignatureHex);
    expect(
      verifyMultisigHardwareResult(
        {
          ...baseCase,
          reference: {
            ...baseCase.reference!,
            sighash,
            childPublicKeys: [Buffer.from(getPublicKey(privateKey, true)).toString('hex')],
          },
          hardwareExpectation: {
            ...baseCase.hardwareExpectation!,
            expectedSignature: `${offlineSignatureHex}01`,
          },
        },
        {
          success: true,
          data: { signatures: [`${hardwareSignatureHex}01`] },
        }
      ).status
    ).toBe('passed');
  });

  test('SDK 成功但签名不匹配时返回硬件校验失败', () => {
    const testCase = getCase('btc-generated-p2sh-continue-signer-1');
    const result = verifyMultisigHardwareResult(testCase, {
      success: true,
      data: { signatures: ['304402200001'] },
    });

    expect(result.status).toBe('failed');
    if (result.status !== 'failed') throw new Error('预期硬件校验失败');
    expect(result.message).toContain('不一致');
  });

  test('缺少可校验字段或 expectation 时返回 unavailable', () => {
    expect(
      verifyMultisigHardwareResult(getCase('btc-generated-p2sh-first-signer-1'), {
        success: true,
        data: {},
      }).status
    ).toBe('unavailable');
    expect(
      verifyMultisigHardwareResult(getCase('eth-safe-calldata'), {
        success: true,
        data: {},
      }).status
    ).toBe('unavailable');
  });
});
