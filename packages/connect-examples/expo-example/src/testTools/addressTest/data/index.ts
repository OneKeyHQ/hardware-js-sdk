import { batchAddressTestCount12One, singleAddressTestCount12One } from './count12_one/index';
import { batchAddressTestCount18One, singleAddressTestCount18One } from './count18_one/index';
import { batchAddressTestCount24One, singleAddressTestCount24One } from './count24_one/index';
import { batchAddressTestCount12Two, singleAddressTestCount12Two } from './count12_two/index';
import { batchAddressTestCount18Two, singleAddressTestCount18Two } from './count18_two/index';
import { batchAddressTestCount24Two, singleAddressTestCount24Two } from './count24_two/index';
import { batchAddressTestCount12Three, singleAddressTestCount12Three } from './count12_three/index';
import { batchAddressTestCount18Three, singleAddressTestCount18Three } from './count18_three/index';
import { batchAddressTestCount24Three, singleAddressTestCount24Three } from './count24_three/index';

import type { AddressBatchTestCase, AddressTestCase } from '../types';

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
