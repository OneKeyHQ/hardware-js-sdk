import type { MultisigMnemonics } from './readMnemonics';
import type { BtcMultisigFixture, EthMultisigFixture } from './types';

export type GeneratedMultisigFixtures = {
  version: 1;
  eth: EthMultisigFixture[];
  btc: BtcMultisigFixture[];
};

const SENSITIVE_PATTERNS = [
  /xprv[1-9A-HJ-NP-Za-km-z]+/,
  /"private_key"\s*:/i,
  /"privateKey"\s*:/,
];

export function assertNoSensitiveMaterial(
  content: string,
  mnemonics: MultisigMnemonics
): void {
  if (
    mnemonics.some(mnemonic => content.includes(mnemonic)) ||
    SENSITIVE_PATTERNS.some(pattern => pattern.test(content))
  ) {
    throw new Error('生成内容包含敏感密钥材料，已拒绝写入');
  }
}

export function renderMultisigFixtures(
  fixtures: GeneratedMultisigFixtures,
  mnemonics: MultisigMnemonics
): string {
  const content = `// 此文件由 generate:multisig-fixtures 自动生成，请勿手工修改。\n` +
    `// 仅包含公开、离线且不可广播的测试数据。\n\n` +
    `export const GENERATED_MULTISIG_FIXTURES = ${JSON.stringify(fixtures, null, 2)} as const;\n`;

  assertNoSensitiveMaterial(content, mnemonics);
  return content;
}

