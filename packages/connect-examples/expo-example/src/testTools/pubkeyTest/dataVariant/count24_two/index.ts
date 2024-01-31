import { convertTestBatchData, convertTestSingleData } from '../../data/utils';
import normal from './normal';
import passphraseEmpty from './passphrase_empty';

export const singlePubkeyTestCount24Two = [
  convertTestSingleData(normal),
  convertTestSingleData(passphraseEmpty),
];

export const batchPubkeyTestCount24Two = [
  convertTestBatchData(normal),
  convertTestBatchData(passphraseEmpty),
];
