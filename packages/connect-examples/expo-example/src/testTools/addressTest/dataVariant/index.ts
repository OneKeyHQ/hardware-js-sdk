import { singleAddressTestCount24Two, batchAddressTestCount24Two } from './count24_two/index';
import { AddressBatchTestCase, AddressTestCase } from '../types';

export const testCases: AddressTestCase[] = [...singleAddressTestCount24Two];

export const batchTestCases: AddressBatchTestCase[] = [...batchAddressTestCount24Two];
