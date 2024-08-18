import { ItemVerifyState } from '../../../components/BaseTestRunner/Context/TestRunnerVerifyProvider';
import { TestCase, TestCaseDataWithKey } from '../../../components/BaseTestRunner/types';

export type TestCaseDataType = {
  id: string;
  title: string;
  method: string;
  params?: any;
  type: 'lock' | 'unlock' | 'passphraseOpened' | 'passphraseClosed' | 'reset';
  expect: boolean;
};

export type LockDeviceTestCase = TestCase<TestCaseDataType[]>;

export type ResultViewProps = {
  item: TestCaseDataWithKey<TestCaseDataType>;
  itemVerifyState: ItemVerifyState;
};
