import { TestCase } from '../../components/BaseTestRunner/types';

export type AddressCaseData = {
  title: string;
  method: string;
  result: {
    address: string;
  };
  name?: string;
  params?: any;
};

export type AddressTestCaseExtra = {
  passphraseState?: string;
  passphrase?: string;
};

export type AddressTestCase = TestCase<AddressCaseData[], AddressTestCaseExtra>;

export type AddressBatchCaseData = {
  title: string;
  method: string;
  result: Record<
    string,
    {
      address: string;
    }
  >;
  name?: string;
  params?: any;
};

export type AddressBatchTestCase = TestCase<AddressBatchCaseData[], AddressTestCaseExtra>;
