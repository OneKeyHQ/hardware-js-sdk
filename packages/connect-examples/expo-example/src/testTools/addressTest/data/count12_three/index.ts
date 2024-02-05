import { convertTestBatchData, convertTestSingleData } from '../utils';
import normal12 from './normal12';
import passphrase12Empty from './passphrase12_empty';
import passphrase121 from './passphrase12_1';
import passphrase122 from './passphrase12_2';

export const singleAddressTestCount12Three = [
  convertTestSingleData(normal12),
  convertTestSingleData(passphrase12Empty),
  convertTestSingleData(passphrase121),
  convertTestSingleData(passphrase122),
];

export const batchAddressTestCount12Three = [
  convertTestBatchData(normal12),
  convertTestBatchData(passphrase12Empty),
  convertTestBatchData(passphrase121),
  convertTestBatchData(passphrase122),
];
