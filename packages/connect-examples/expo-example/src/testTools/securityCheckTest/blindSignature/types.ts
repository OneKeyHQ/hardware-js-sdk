import { ItemVerifyState } from '../../../components/BaseTestRunner/Context/TestRunnerVerifyProvider';
import { TestCase, TestCaseDataWithKey } from '../../../components/BaseTestRunner/types';

export type TestCaseDataType = {
  id: string;
  title: string;
  method: string;
  path?: string;
  params?: any;
  expect: boolean;
};

export type SecurityCheckTestCase = TestCase<TestCaseDataType[]>;

export type ResultViewProps = {
  item: TestCaseDataWithKey<TestCaseDataType>;
  itemVerifyState: ItemVerifyState;
};
