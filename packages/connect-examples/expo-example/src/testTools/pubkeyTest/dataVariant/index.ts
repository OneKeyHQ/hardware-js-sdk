import { batchPubkeyTestCount24Two, singlePubkeyTestCount24Two } from './count24_two/index';

import type { PubkeyBatchTestCase, PubkeyTestCase } from '../types';

export const testCases: PubkeyTestCase[] = [...singlePubkeyTestCount24Two];

export const batchTestCases: PubkeyBatchTestCase[] = [...batchPubkeyTestCount24Two];
