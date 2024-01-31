import { singlePubkeyTestCount24Two, batchPubkeyTestCount24Two } from './count24_two/index';
import { PubkeyBatchTestCase, PubkeyTestCase } from '../types';

export const testCases: PubkeyTestCase[] = [...singlePubkeyTestCount24Two];

export const batchTestCases: PubkeyBatchTestCase[] = [...batchPubkeyTestCount24Two];
