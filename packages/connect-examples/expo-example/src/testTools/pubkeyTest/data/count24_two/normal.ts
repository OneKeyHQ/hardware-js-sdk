import { PubkeyTestCaseData } from '../types';
import passphrase12Empty from './passphrase_empty';

export default {
  ...passphrase12Empty,
  name: 'two-normal-24',
  passphrase: undefined,
  passphraseState: '',
} as PubkeyTestCaseData;
