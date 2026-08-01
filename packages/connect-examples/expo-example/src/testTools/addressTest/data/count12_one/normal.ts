import passphrase12Empty from './passphrase_empty';

import type { AddressTestCaseData } from '../types';

export default {
  ...passphrase12Empty,
  name: 'one-normal-12',
  passphrase: undefined,
  passphraseState: '',
} as AddressTestCaseData;
