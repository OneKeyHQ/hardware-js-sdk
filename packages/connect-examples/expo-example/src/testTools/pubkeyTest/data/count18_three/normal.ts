import { PubkeyTestCaseData } from '../types';
import passphraseEmpty from './passphrase_empty';

export default {
  ...passphraseEmpty,
  name: 'three-normal-18',
  passphrase: undefined,
  passphraseState: '',
} as PubkeyTestCaseData;
