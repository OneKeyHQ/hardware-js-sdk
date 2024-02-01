import { convertTestBatchData, convertTestSingleData } from '../../data/utils';
import normal from './normal';
import passphraseEmpty from './passphrase_empty';

export const singleAddressTestCount24Two = [
  convertTestSingleData(normal),
  convertTestSingleData(passphraseEmpty),
];

export const batchAddressTestCount24Two = [
  convertTestBatchData(normal),
  convertTestBatchData(passphraseEmpty),
];
