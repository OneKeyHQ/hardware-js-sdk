import { convertTestBatchData, convertTestSingleData } from '../../data/utils';
import normal from './normal';
import passphraseEmpty from './passphrase_empty';
import passphrase1 from './passphrase_1';
import passphrase2 from './passphrase_2';

export const singleAddressTestCount24One = [
  convertTestSingleData(normal),
  convertTestSingleData(passphraseEmpty),
  convertTestSingleData(passphrase1),
  convertTestSingleData(passphrase2),
];

export const batchAddressTestCount24One = [
  convertTestBatchData(normal),
  convertTestBatchData(passphraseEmpty),
  convertTestSingleData(passphrase1),
  convertTestSingleData(passphrase2),
];
