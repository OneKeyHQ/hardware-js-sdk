import { verify } from '@noble/secp256k1';
import { describe, expect, test } from '@jest/globals';
import { Transaction } from 'bitcoinjs-lib';

import { generateBtcFixtures } from '../generateBtcFixtures';
import type { MultisigMnemonics } from '../readMnemonics';

const TEST_MNEMONICS: MultisigMnemonics = [
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
  'legal winner thank year wave sausage worth useful legal winner thank yellow',
  'letter advice cage absurd amount doctor acoustic avoid letter advice cage above',
];

describe('generateBtcFixtures', () => {
  test('生成三种确定性的 BIP48 2-of-3 fixture', async () => {
    const first = await generateBtcFixtures(TEST_MNEMONICS);
    const second = await generateBtcFixtures(TEST_MNEMONICS);

    expect(first).toEqual(second);
    expect(first.map(item => item.id)).toEqual(['p2sh', 'p2sh-p2wsh', 'p2wsh']);
    expect(first.map(item => item.scriptType)).toEqual([
      'SPENDMULTISIG',
      'SPENDP2SHWITNESS',
      'SPENDWITNESS',
    ]);
  });

  test('funding transaction 的 txid 和输出脚本与引用数据一致', async () => {
    const fixtures = await generateBtcFixtures(TEST_MNEMONICS);

    fixtures.forEach(fixture => {
      const fundingTx = Transaction.fromHex(fixture.reference.fundingTxHex);
      expect(fundingTx.getId()).toBe(fixture.reference.prevHash);
      expect(fundingTx.outs[0].script.toString('hex')).toBe(fixture.reference.scriptPubKey);
      expect(fundingTx.outs[0].value).toBe(200000);
      expect(fixture.signParameters.refTxs[0].hash).toBe(fixture.reference.prevHash);
    });
  });

  test('三个签名均可由对应子公钥验证', async () => {
    const fixtures = await generateBtcFixtures(TEST_MNEMONICS);

    fixtures.forEach(fixture => {
      fixture.reference.expectedSignatures.forEach((signature, index) => {
        const derSignature = signature.slice(0, -2);
        expect(
          verify(
            derSignature,
            fixture.reference.sighash,
            fixture.reference.childPublicKeys[index]
          )
        ).toBe(true);
      });
    });
  });

  test('签名槽位与三个 xpub 保持一致', async () => {
    const fixtures = await generateBtcFixtures(TEST_MNEMONICS);

    fixtures.forEach(fixture => {
      expect(fixture.addressParameters.multisig.pubkeys).toHaveLength(3);
      expect(fixture.addressParameters.multisig.signatures).toEqual(['', '', '']);
      expect(fixture.signParameters.inputs[0].multisig.signatures).toEqual(['', '', '']);
      expect(fixture.partialSignParameters.inputs[0].multisig.signatures).toEqual([
        fixture.reference.expectedSignatures[0],
        '',
        '',
      ]);
      expect(fixture.reference.doubleSignatures).toEqual([
        fixture.reference.expectedSignatures[0],
        fixture.reference.expectedSignatures[1],
        '',
      ]);
    });
  });

  test('公开 fixture 不包含扩展私钥或 seed', async () => {
    const serialized = JSON.stringify(await generateBtcFixtures(TEST_MNEMONICS));

    expect(serialized).not.toMatch(/mnemonic|privateKey|private_key|xprv|seed/i);
  });
});
