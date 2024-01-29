import { TestCase } from '../../components/BaseTestRunner/types';

export type PubkeyCaseData = {
  title: string;
  method: string;
  result: any;
  name?: string;
  params?: any;
};

export type PubkeyTestCaseExtra = {
  passphraseState?: string;
  passphrase?: string;
};

export type PubkeyTestCase = TestCase<PubkeyCaseData[], PubkeyTestCaseExtra>;

export type PubkeyBatchCaseData = {
  title: string;
  method: string;
  result: Record<string, any>;
  name?: string;
  params?: any;
};

export type PubkeyBatchTestCase = TestCase<PubkeyBatchCaseData[], PubkeyTestCaseExtra>;
