import { singlePubkeyTestCount12One, batchPubkeyTestCount12One } from './count12_one/index';
import { singlePubkeyTestCount18One, batchPubkeyTestCount18One } from './count18_one/index';
import { singlePubkeyTestCount24One, batchPubkeyTestCount24One } from './count24_one/index';
import { singlePubkeyTestCount12Two, batchPubkeyTestCount12Two } from './count12_two/index';
import { singlePubkeyTestCount18Two, batchPubkeyTestCount18Two } from './count18_two/index';
import { singlePubkeyTestCount24Two, batchPubkeyTestCount24Two } from './count24_two/index';
import { singlePubkeyTestCount12Three, batchPubkeyTestCount12Three } from './count12_three/index';
import { singlePubkeyTestCount18Three, batchPubkeyTestCount18Three } from './count18_three/index';
import { singlePubkeyTestCount24Three, batchPubkeyTestCount24Three } from './count24_three/index';
import { PubkeyBatchTestCase, PubkeyTestCase } from '../types';

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
