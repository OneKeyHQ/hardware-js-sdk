import passphraseEmpty from './passphrase_empty';

import type { AddressTestCaseData } from '../types';

export default {
  ...passphraseEmpty,
  name: 'two-normal-12',
  passphrase: undefined,
  passphraseState: '',
} as AddressTestCaseData;
