import { batchPubkeyTestCount12One, singlePubkeyTestCount12One } from './count12_one/index';
import { batchPubkeyTestCount18One, singlePubkeyTestCount18One } from './count18_one/index';
import { batchPubkeyTestCount24One, singlePubkeyTestCount24One } from './count24_one/index';
import { batchPubkeyTestCount12Two, singlePubkeyTestCount12Two } from './count12_two/index';
import { batchPubkeyTestCount18Two, singlePubkeyTestCount18Two } from './count18_two/index';
import { batchPubkeyTestCount24Two, singlePubkeyTestCount24Two } from './count24_two/index';
import { batchPubkeyTestCount12Three, singlePubkeyTestCount12Three } from './count12_three/index';
import { batchPubkeyTestCount18Three, singlePubkeyTestCount18Three } from './count18_three/index';
import { batchPubkeyTestCount24Three, singlePubkeyTestCount24Three } from './count24_three/index';

import type { PubkeyBatchTestCase, PubkeyTestCase } from '../types';

export const testCases: PubkeyTestCase[] = [
  ...singlePubkeyTestCount12One,
  ...singlePubkeyTestCount18One,
  ...singlePubkeyTestCount24One,
  ...singlePubkeyTestCount12Two,
  ...singlePubkeyTestCount18Two,
  ...singlePubkeyTestCount24Two,
  ...singlePubkeyTestCount12Three,
  ...singlePubkeyTestCount18Three,
  ...singlePubkeyTestCount24Three,
];

export const batchTestCases: PubkeyBatchTestCase[] = [
  ...batchPubkeyTestCount12One,
  ...batchPubkeyTestCount18One,
  ...batchPubkeyTestCount24One,
  ...batchPubkeyTestCount12Two,
  ...batchPubkeyTestCount18Two,
  ...batchPubkeyTestCount24Two,
  ...batchPubkeyTestCount12Three,
  ...batchPubkeyTestCount18Three,
  ...batchPubkeyTestCount24Three,
];

const filterByTitle = (item: PubkeyBatchTestCase) =>
  item.data.filter(item => item.title.includes('btcGetPublicKey-xpub'));

export const batchSoftTestCases: PubkeyBatchTestCase[] = [
  ...batchPubkeyTestCount12One.map(item => ({ ...item, data: filterByTitle(item) })),
  ...batchPubkeyTestCount18One.map(item => ({ ...item, data: filterByTitle(item) })),
  ...batchPubkeyTestCount24One.map(item => ({ ...item, data: filterByTitle(item) })),
  ...batchPubkeyTestCount12Two.map(item => ({ ...item, data: filterByTitle(item) })),
  ...batchPubkeyTestCount18Two.map(item => ({ ...item, data: filterByTitle(item) })),
  ...batchPubkeyTestCount24Two.map(item => ({ ...item, data: filterByTitle(item) })),
  ...batchPubkeyTestCount12Three.map(item => ({ ...item, data: filterByTitle(item) })),
  ...batchPubkeyTestCount18Three.map(item => ({ ...item, data: filterByTitle(item) })),
  ...batchPubkeyTestCount24Three.map(item => ({ ...item, data: filterByTitle(item) })),
];
