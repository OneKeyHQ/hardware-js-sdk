import { entropyToMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';

import type { MultisigMnemonics } from '../readMnemonics';

const SYNTHETIC_ENTROPIES = [
  Uint8Array.from({ length: 16 }, (_, index) => index),
  Uint8Array.from({ length: 16 }, (_, index) => index + 16),
  Uint8Array.from({ length: 16 }, (_, index) => 255 - index),
];

export const TEST_MNEMONICS: MultisigMnemonics = [
  entropyToMnemonic(SYNTHETIC_ENTROPIES[0], wordlist),
  entropyToMnemonic(SYNTHETIC_ENTROPIES[1], wordlist),
  entropyToMnemonic(SYNTHETIC_ENTROPIES[2], wordlist),
];
