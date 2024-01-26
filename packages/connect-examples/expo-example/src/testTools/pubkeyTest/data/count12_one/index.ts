import { convertTestBatchData, convertTestSingleData } from '../utils';
import normal from './normal';
import passphraseEmpty from './passphrase_empty';
import passphrase1 from './passphrase_1';
import passphrase2 from './passphrase_2';

export const singlePubkeyTestCount12One = [
  {
    ...convertTestSingleData(normal, {
      getOnlyOne: true,
    }),
    name: 'one-normal-12-only-one',
  },
  convertTestSingleData(normal),
  convertTestSingleData(passphraseEmpty),
  convertTestSingleData(passphrase1),
  convertTestSingleData(passphrase2),
];

export const batchPubkeyTestCount12One = [
  convertTestBatchData(normal),
  convertTestBatchData(passphraseEmpty),
  convertTestBatchData(passphrase1),
  convertTestBatchData(passphrase2),
];
