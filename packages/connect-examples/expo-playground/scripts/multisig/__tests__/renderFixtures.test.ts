import { generateBtcFixtures } from '../generateBtcFixtures';
import { generateEthFixtures } from '../generateEthFixtures';
import type { MultisigMnemonics } from '../readMnemonics';
import { assertNoSensitiveMaterial, renderMultisigFixtures } from '../renderFixtures';

const TEST_MNEMONICS: MultisigMnemonics = [
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
  'legal winner thank year wave sausage worth useful legal winner thank yellow',
  'letter advice cage absurd amount doctor acoustic avoid letter advice cage above',
];

describe('renderMultisigFixtures', () => {
  test('把相同 fixture 稳定渲染为 TypeScript 常量', async () => {
    const fixtures = {
      version: 1 as const,
      eth: await generateEthFixtures(TEST_MNEMONICS),
      btc: await generateBtcFixtures(TEST_MNEMONICS),
    };

    const first = renderMultisigFixtures(fixtures, TEST_MNEMONICS);
    const second = renderMultisigFixtures(fixtures, TEST_MNEMONICS);

    expect(first).toBe(second);
    expect(first).toContain('export const GENERATED_MULTISIG_FIXTURES =');
    expect(first).toContain('此文件由 generate:multisig-fixtures 自动生成');
    TEST_MNEMONICS.forEach(mnemonic => expect(first).not.toContain(mnemonic));
  });

  test.each([
    ['助记词', TEST_MNEMONICS[0]],
    ['扩展私钥', 'xprv9s21ZrQH143K'],
    ['私钥字段', '"private_key":"1234"'],
  ])('拒绝包含%s的输出', (_label, content) => {
    expect(() => assertNoSensitiveMaterial(content, TEST_MNEMONICS)).toThrow('敏感');
  });
});
