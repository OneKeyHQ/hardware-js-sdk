import { validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';

export const MULTISIG_MNEMONIC_ENV_KEYS = [
  'MULTISIG_MNEMONIC_1',
  'MULTISIG_MNEMONIC_2',
  'MULTISIG_MNEMONIC_3',
] as const;

export type MultisigMnemonics = [string, string, string];
type MultisigEnvironment = Record<string, string | undefined>;

export function mergeMultisigMnemonicEnv(
  content: string,
  env: MultisigEnvironment
): MultisigEnvironment {
  const merged: MultisigEnvironment = {};
  const allowedKeys = new Set<string>(MULTISIG_MNEMONIC_ENV_KEYS);

  content.split(/\r?\n/).forEach(line => {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || !allowedKeys.has(match[1])) return;

    let value = match[2].trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    merged[match[1]] = value;
  });

  Object.entries(env).forEach(([key, value]) => {
    if (value !== undefined) merged[key] = value;
  });
  return merged;
}

function normalizeMnemonic(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function readMultisigMnemonics(env: MultisigEnvironment): MultisigMnemonics {
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
