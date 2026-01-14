import passphraseEmpty from './passphrase_empty';

import type { PubkeyTestCaseData } from '../types';

export default {
  ...passphraseEmpty,
  name: 'three-normal-18',
  passphrase: undefined,
  passphraseState: '',
} as PubkeyTestCaseData;
