export type TestCaseData = {
  method: string;
  params?: any;
  expectedAddress: string;
};

export type TestCase = {
  name: string;
  description: string;
  passphraseState?: string;
  passphrase?: string;
  data: TestCaseData[];
};
