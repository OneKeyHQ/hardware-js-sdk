import type { AddressTestCaseData } from '../types';
import passphrase12Empty from './passphrase12_empty';

export default {
  ...passphrase12Empty,
  name: 'normal-12',
  passphrase: undefined,
  passphraseState: '',
} as AddressTestCaseData;
