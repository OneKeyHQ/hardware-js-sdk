import passphraseEmpty from './passphrase_empty';

import type { PubkeyTestCaseData } from '../types';

export default {
  ...passphraseEmpty,
  name: 'one-normal-24',
  passphrase: undefined,
  passphraseState: '',
} as PubkeyTestCaseData;
