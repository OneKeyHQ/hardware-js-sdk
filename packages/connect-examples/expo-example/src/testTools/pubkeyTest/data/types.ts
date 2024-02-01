export type PubkeyTestCaseData = {
  name: string;
  description: string;
  passphraseState?: string;
  passphrase?: string;
  data: {
    method: string;
    result: Record<string, any>;
    name?: string;
    params?: any;
  }[];
};
