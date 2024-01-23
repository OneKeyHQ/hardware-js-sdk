import { convertTestBatchData, convertTestSingleData } from '../utils';
import normal12 from './normal12';
import passphrase12Empty from './passphrase12_empty';
import passphrase121 from './passphrase12_1';
import passphrase122 from './passphrase12_2';
import passphrase123 from './passphrase12_3';

export const singleAddressTestCount12 = [
  {
    ...convertTestSingleData(normal12, {
      getOnlyOne: true,
    }),
    name: 'normal-12-only-one',
  },
  convertTestSingleData(normal12),
  convertTestSingleData(passphrase12Empty),
  convertTestSingleData(passphrase121),
  convertTestSingleData(passphrase122),
  convertTestSingleData(passphrase123),
];

export const batchAddressTestCount12 = [
  convertTestBatchData(normal12),
  convertTestBatchData(passphrase12Empty),
  convertTestBatchData(passphrase121),
  convertTestBatchData(passphrase122),
  convertTestBatchData(passphrase123),
];
