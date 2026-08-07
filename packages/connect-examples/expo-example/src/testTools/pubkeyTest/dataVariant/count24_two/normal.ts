import passphraseEmpty from './passphrase_empty';

import type { PubkeyTestCaseData } from '../../data/types';

export default {
  ...passphraseEmpty,
  name: 'two-normal-24',
  passphrase: undefined,
  passphraseState: '',
} as PubkeyTestCaseData;
