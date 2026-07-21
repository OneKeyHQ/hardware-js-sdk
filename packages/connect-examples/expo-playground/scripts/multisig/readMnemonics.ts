import { validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';

export const MULTISIG_MNEMONIC_ENV_KEYS = [
  'MULTISIG_MNEMONIC_1',
  'MULTISIG_MNEMONIC_2',
  'MULTISIG_MNEMONIC_3',
] as const;

export type MultisigMnemonics = [string, string, string];

function normalizeMnemonic(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function readMultisigMnemonics(env: NodeJS.ProcessEnv): MultisigMnemonics {
  const mnemonics = MULTISIG_MNEMONIC_ENV_KEYS.map((key, index) => {
    const value = env[key];
    if (!value?.trim()) {
      throw new Error(`缺少环境变量 ${key}`);
    }

    const normalized = normalizeMnemonic(value);
    if (!validateMnemonic(normalized, wordlist)) {
      throw new Error(`signer ${index + 1} 的助记词无效`);
    }
    return normalized;
  }) as MultisigMnemonics;

  const firstSeenAt = new Map<string, number>();
  mnemonics.forEach((mnemonic, index) => {
    const previousIndex = firstSeenAt.get(mnemonic);
    if (previousIndex !== undefined) {
      throw new Error(`signer ${index + 1} 与 signer ${previousIndex + 1} 的助记词重复`);
    }
    firstSeenAt.set(mnemonic, index);
  });

  return mnemonics;
}
