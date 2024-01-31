import type { PubkeyTestCaseData } from '../../data/types';
import passphraseEmpty from './passphrase_empty';

export default {
  ...passphraseEmpty,
  name: 'two-normal-24',
  passphrase: undefined,
  passphraseState: '',
} as PubkeyTestCaseData;
