import { TestCase } from '../../../components/BaseTestRunner/types';
import { TestExpect } from '../../../components/Playground';

export type ApiExportCaseData = {
  title: string;
  method: string;
  noConnIdReq?: boolean;
  noDeviceIdReq?: boolean;
  params?: any;
  result: TestExpect;
};

export type ApiExportTestCase = TestCase<ApiExportCaseData[]>;
