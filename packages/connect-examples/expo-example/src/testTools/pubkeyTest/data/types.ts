export type PubkeyTestCaseData = {
  name: string;
  description: string;
  passphraseState?: string;
  passphrase?: string;
  data: {
    method: string;
    result: Record<number, any>;
    name?: string;
    params?: any;
  }[];
};
