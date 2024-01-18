import { singlePubkeyTestCount12, batchPubkeyTestCount12 } from './count12/index';
import { PubkeyBatchTestCase, PubkeyTestCase } from '../types';

export const testCases: PubkeyTestCase[] = [...singlePubkeyTestCount12];

export const batchTestCases: PubkeyBatchTestCase[] = [...batchPubkeyTestCount12];
