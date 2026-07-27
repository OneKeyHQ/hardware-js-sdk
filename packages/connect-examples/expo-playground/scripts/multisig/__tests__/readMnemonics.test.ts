import { describe, expect, test } from '@jest/globals';

import {
  mergeMultisigMnemonicEnv,
  readMultisigMnemonics,
} from '../readMnemonics';

const MNEMONIC_1 = 'mnemonic removed use runtime generated test input';
const MNEMONIC_2 = 'mnemonic removed use runtime generated test input';
const MNEMONIC_3 = 'mnemonic removed use runtime generated test input';

function createEnv(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: 'development',
    MULTISIG_MNEMONIC_1: MNEMONIC_1,
    MULTISIG_MNEMONIC_2: MNEMONIC_2,
    MULTISIG_MNEMONIC_3: MNEMONIC_3,
    ...overrides,
  };
}

describe('readMultisigMnemonics', () => {
  test('读取 scripts/.env 的空格分隔助记词且不覆盖显式环境变量', () => {
    const merged = mergeMultisigMnemonicEnv(
      [
        `MULTISIG_MNEMONIC_1=${MNEMONIC_1}`,
        `MULTISIG_MNEMONIC_2=${MNEMONIC_2}`,
        `MULTISIG_MNEMONIC_3=${MNEMONIC_3}`,
      ].join('\n'),
      { MULTISIG_MNEMONIC_1: MNEMONIC_3 }
    );

    expect(merged).toMatchObject({
      MULTISIG_MNEMONIC_1: MNEMONIC_3,
      MULTISIG_MNEMONIC_2: MNEMONIC_2,
      MULTISIG_MNEMONIC_3: MNEMONIC_3,
    });
  });

  test('读取并规范化三个环境变量中的助记词', () => {
    const env = createEnv({
      MULTISIG_MNEMONIC_1: `  ${MNEMONIC_1.toUpperCase()}  `,
    });

    expect(readMultisigMnemonics(env)).toEqual([MNEMONIC_1, MNEMONIC_2, MNEMONIC_3]);
  });

  test('缺少环境变量时只报告变量名', () => {
    const env = createEnv({ MULTISIG_MNEMONIC_2: undefined });

    expect(() => readMultisigMnemonics(env)).toThrow('MULTISIG_MNEMONIC_2');
  });

  test('拒绝无效助记词且不回显原文', () => {
    const invalidMnemonic = 'not a valid secret mnemonic';
    const env = createEnv({ MULTISIG_MNEMONIC_3: invalidMnemonic });

    try {
      readMultisigMnemonics(env);
      throw new Error('预期读取失败');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).toContain('signer 3');
      expect(message).not.toContain(invalidMnemonic);
    }
  });

  test('拒绝重复助记词且不回显原文', () => {
    const env = createEnv({ MULTISIG_MNEMONIC_2: MNEMONIC_1 });

    try {
      readMultisigMnemonics(env);
      throw new Error('预期读取失败');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).toContain('signer 2');
      expect(message).not.toContain(MNEMONIC_1);
    }
  });
});
