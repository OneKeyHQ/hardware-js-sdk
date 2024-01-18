export type AddressTestCaseData = {
  name: string;
  description: string;
  passphraseState?: string;
  passphrase?: string;
  data: {
    method: string;
    expectedAddress: Record<number, string>;
    name?: string;
    params?: any;
  }[];
};
