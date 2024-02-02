import type { AddressTestCaseData } from '../types';
import passphraseEmpty from './passphrase_empty';

export default {
  ...passphraseEmpty,
  name: 'three-normal-24',
  passphrase: undefined,
  passphraseState: '',
} as AddressTestCaseData;
