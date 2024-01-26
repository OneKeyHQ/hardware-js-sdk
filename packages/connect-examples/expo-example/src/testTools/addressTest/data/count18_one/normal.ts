import type { AddressTestCaseData } from '../types';
import passphraseEmpty from './passphrase_empty';

export default {
  ...passphraseEmpty,
  name: 'one-normal-18',
  passphrase: undefined,
  passphraseState: '',
} as AddressTestCaseData;
