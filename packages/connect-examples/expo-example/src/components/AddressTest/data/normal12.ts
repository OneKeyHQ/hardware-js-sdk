import type { TestCase } from './types';
import passphrase12Empty from './passphrase12_empty';

export default {
  ...passphrase12Empty,
  name: 'normal-12',
  passphrase: '',
  passphraseState: '',
} as TestCase;
