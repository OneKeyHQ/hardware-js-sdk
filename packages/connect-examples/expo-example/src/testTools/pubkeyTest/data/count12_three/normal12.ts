import passphrase12Empty from './passphrase12_empty';

import type { PubkeyTestCaseData } from '../types';

export default {
  ...passphrase12Empty,
  name: 'three-normal-12',
  passphrase: undefined,
  passphraseState: '',
} as PubkeyTestCaseData;
