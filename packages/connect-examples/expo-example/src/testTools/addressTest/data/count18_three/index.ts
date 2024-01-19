import { convertTestBatchData, convertTestSingleData } from '../utils';
import normal from './normal';
import passphraseEmpty from './passphrase_empty';
import passphrase1 from './passphrase_1';
import passphrase2 from './passphrase_2';

export const singleAddressTestCount18Three = [
  convertTestSingleData(normal),
  convertTestSingleData(passphraseEmpty),
  convertTestSingleData(passphrase1),
  convertTestSingleData(passphrase2),
];

export const batchAddressTestCount18Three = [
  convertTestBatchData(normal),
  convertTestBatchData(passphraseEmpty),
  convertTestBatchData(passphrase1),
  convertTestBatchData(passphrase2),
];
