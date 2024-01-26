import { singleAddressTestCount12One, batchAddressTestCount12One } from './count12_one/index';
import { singleAddressTestCount18One, batchAddressTestCount18One } from './count18_one/index';
import { singleAddressTestCount24One, batchAddressTestCount24One } from './count24_one/index';
import { singleAddressTestCount12Two, batchAddressTestCount12Two } from './count12_two/index';
import { singleAddressTestCount18Two, batchAddressTestCount18Two } from './count18_two/index';
import { singleAddressTestCount24Two, batchAddressTestCount24Two } from './count24_two/index';
import { singleAddressTestCount12Three, batchAddressTestCount12Three } from './count12_three/index';
import { singleAddressTestCount18Three, batchAddressTestCount18Three } from './count18_three/index';
import { singleAddressTestCount24Three, batchAddressTestCount24Three } from './count24_three/index';
import { AddressBatchTestCase, AddressTestCase } from '../types';

export const testCases: AddressTestCase[] = [
  ...singleAddressTestCount12One,
  ...singleAddressTestCount18One,
  ...singleAddressTestCount24One,
  ...singleAddressTestCount12Two,
  ...singleAddressTestCount18Two,
  ...singleAddressTestCount24Two,
  ...singleAddressTestCount12Three,
  ...singleAddressTestCount18Three,
  ...singleAddressTestCount24Three,
];

export const batchTestCases: AddressBatchTestCase[] = [
  ...batchAddressTestCount12One,
  ...batchAddressTestCount18One,
  ...batchAddressTestCount24One,
  ...batchAddressTestCount12Two,
  ...batchAddressTestCount18Two,
  ...batchAddressTestCount24Two,
  ...batchAddressTestCount12Three,
  ...batchAddressTestCount18Three,
  ...batchAddressTestCount24Three,
];
