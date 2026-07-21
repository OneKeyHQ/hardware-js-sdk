import { recoverAddress } from 'ethers';

import { generateEthFixtures } from '../generateEthFixtures';
import type { MultisigMnemonics } from '../readMnemonics';

const TEST_MNEMONICS: MultisigMnemonics = [
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
  'legal winner thank year wave sausage worth useful legal winner thank yellow',
  'letter advice cage absurd amount doctor acoustic avoid letter advice cage above',
];

describe('generateEthFixtures', () => {
  test('生成两个确定性的 Safe EIP-712 用例', async () => {
    const first = await generateEthFixtures(TEST_MNEMONICS);
    const second = await generateEthFixtures(TEST_MNEMONICS);

    expect(first).toEqual(second);
    expect(first.map(item => item.id)).toEqual(['standard', 'delegate-call']);
  });

  test('每个签名都能恢复到对应 owner', async () => {
    const [fixture] = await generateEthFixtures(TEST_MNEMONICS);
    const { digest, signerAddresses, expectedSignatures } = fixture.reference;

    expect(new Set(signerAddresses).size).toBe(3);
    expect(expectedSignatures).toHaveLength(3);
    expectedSignatures.forEach((signature, index) => {
      expect(recoverAddress(digest, signature).toLowerCase()).toBe(
        signerAddresses[index].toLowerCase()
      );
    });
  });

  test('Safe 聚合签名按照 owner 地址升序拼接', async () => {
    const [fixture] = await generateEthFixtures(TEST_MNEMONICS);
    const sorted = fixture.reference.signerAddresses
      .map((address, index) => ({ address: address.toLowerCase(), signature: fixture.reference.expectedSignatures[index] }))
      .sort((left, right) => left.address.localeCompare(right.address));

    expect(fixture.reference.aggregatedSignatures2Of3).toBe(
      `0x${sorted
        .slice(0, 2)
        .map(item => item.signature.slice(2))
        .join('')}`
    );
    expect(fixture.reference.aggregatedSignatures3Of3).toBe(
      `0x${sorted.map(item => item.signature.slice(2)).join('')}`
    );
  });

  test('页面参数不包含私钥材料', async () => {
    const fixtures = await generateEthFixtures(TEST_MNEMONICS);
    const serialized = JSON.stringify(fixtures);

    expect(serialized).not.toMatch(/mnemonic|privateKey|private_key|xprv|seed/i);
    expect(fixtures.every(item => item.reference.broadcastable === false)).toBe(true);
  });
});
