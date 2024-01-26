import { PubkeyTestCaseData } from '../types';
import passphraseEmpty from './passphrase_empty';

export default {
  ...passphraseEmpty,
  name: 'one-normal-24',
  passphrase: undefined,
  passphraseState: '',
} as PubkeyTestCaseData;
