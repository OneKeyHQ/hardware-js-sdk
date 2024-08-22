export type TestCase<T, E = any> = {
  id: string;
  name: string;
  description: string;
  data: T;
  extra?: E;
};

export type TestCaseDataWithKey<T = any> = { $key: string } & T;
export type VerifyState = 'none' | 'pending' | 'skip' | 'success' | 'fail' | 'warning';
