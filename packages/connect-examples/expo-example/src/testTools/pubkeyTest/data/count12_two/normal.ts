import passphrase12Empty from './passphrase_empty';

import type { PubkeyTestCaseData } from '../types';

export default {
  ...passphrase12Empty,
  name: 'two-normal-12',
  passphrase: undefined,
  passphraseState: '',
} as PubkeyTestCaseData;
