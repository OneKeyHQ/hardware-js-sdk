import type { SLIP39TestCaseData } from '../types';

import { count20OneNormal } from './count20_one/normal';
import { count20OnePassphraseEmpty } from './count20_one/passphrase_empty';
import { count20OnePassphrase1 } from './count20_one/passphrase_1';
import { count20OnePassphrase2 } from './count20_one/passphrase_2';
import { count20TwoNormal } from './count20_two/normal';
import { count20TwoPassphraseEmpty } from './count20_two/passphrase_empty';
import { count20TwoPassphrase1 } from './count20_two/passphrase_1';
import { count20TwoPassphrase2 } from './count20_two/passphrase_2';
import { count20ThreeNormal } from './count20_three/normal';
import { count20ThreePassphraseEmpty } from './count20_three/passphrase_empty';
import { count20ThreePassphrase1 } from './count20_three/passphrase_1';
import { count20ThreePassphrase2 } from './count20_three/passphrase_2';
import { count33OneNormal } from './count33_one/normal';
import { count33OnePassphraseEmpty } from './count33_one/passphrase_empty';
import { count33OnePassphrase1 } from './count33_one/passphrase_1';
import { count33OnePassphrase2 } from './count33_one/passphrase_2';
import { count33TwoNormal } from './count33_two/normal';
import { count33TwoPassphraseEmpty } from './count33_two/passphrase_empty';
import { count33TwoPassphrase1 } from './count33_two/passphrase_1';
import { count33TwoPassphrase2 } from './count33_two/passphrase_2';

export const allPubkeyTestCases: SLIP39TestCaseData[] = [
  count20OneNormal,
  count20OnePassphraseEmpty,
  count20OnePassphrase1,
  count20OnePassphrase2,
  count20TwoNormal,
  count20TwoPassphraseEmpty,
  count20TwoPassphrase1,
  count20TwoPassphrase2,
  count20ThreeNormal,
  count20ThreePassphraseEmpty,
  count20ThreePassphrase1,
  count20ThreePassphrase2,
  count33OneNormal,
  count33OnePassphraseEmpty,
  count33OnePassphrase1,
  count33OnePassphrase2,
  count33TwoNormal,
  count33TwoPassphraseEmpty,
  count33TwoPassphrase1,
  count33TwoPassphrase2,
];
