export type PublicFixtureReference = {
  broadcastable: false;
  signerAddresses: string[];
  expectedSignatures: string[];
};

export type EthFixtureReference = PublicFixtureReference & {
  digest: string;
  aggregatedSignatures2Of3: string;
  aggregatedSignatures3Of3: string;
};

export type EthMultisigFixture = {
  id: 'standard' | 'delegate-call';
  title: string;
  description: string;
  parameters: {
    path: string;
    data: {
      types: Record<string, Array<{ name: string; type: string }>>;
      domain: Record<string, string>;
      primaryType: string;
      message: Record<string, string>;
    };
  };
  expectedDeviceChecks: string[];
  reference: EthFixtureReference;
};

