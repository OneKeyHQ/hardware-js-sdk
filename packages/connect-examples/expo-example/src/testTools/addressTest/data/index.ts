import { singleAddressTestCount12, batchAddressTestCount12 } from './count12/index';
import { AddressBatchTestCase, AddressTestCase } from '../types';

export const testCases: AddressTestCase[] = [...singleAddressTestCount12];

export const batchTestCases: AddressBatchTestCase[] = [...batchAddressTestCount12];
