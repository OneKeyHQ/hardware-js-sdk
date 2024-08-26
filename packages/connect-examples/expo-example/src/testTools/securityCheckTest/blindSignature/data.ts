export type TestCaseDataType = {
  method: string;
  expected: Record<string, boolean>;
  params?: any;
};

export default [
  {
    method: 'alephiumSignTransaction',
    expected: {
      '1234': true,
      '60': false,
    },
  },
  {
    method: 'algoSignTransaction',
    expected: {
      '283': true,
      '60': false,
    },
  },
  {
    method: 'aptosSignTransaction',
    expected: {
      '637': true,
      '60': false,
    },
  },
  {
    method: 'confluxSignTransaction',
    expected: {
      '503': true,
      '60': false,
    },
  },
  {
    method: 'cosmosSignTransaction',
    expected: {
      '118': true,
      '60': false,
    },
  },
  {
    method: 'dnxSignTransaction',
    expected: {
      '29538': true,
      '60': false,
    },
  },
  {
    method: 'filecoinSignTransaction',
    expected: {
      '461': true,
      '60': false,
    },
  },
  {
    method: 'kaspaSignTransaction',
    expected: {
      '111111': true,
      '60': false,
    },
  },
  {
    method: 'nearSignTransaction',
    expected: {
      '397': true,
      '60': false,
    },
  },
  {
    method: 'nexaSignTransaction',
    expected: {
      '29223': true,
      '999': false,
    },
  },
  {
    method: 'nemSignTransaction',
    expected: {
      '1': true,
      '43': true,
      '60': false,
    },
  },
  {
    method: 'nostrSignSchnorr',
    expected: {
      '1237': true,
      '999': false,
      '60': false,
    },
  },
  {
    method: 'nervosSignTransaction',
    expected: {
      '309': true,
      '60': false,
    },
  },
  {
    method: 'polkadotSignTransaction',
    expected: {
      '354': true,
      '999': false,
      '60': false,
    },
  },
  {
    method: 'solSignTransaction',
    expected: {
      '501': true,
      '999': false,
      '60': false,
    },
  },
  {
    method: 'scdoSignTransaction',
    expected: {
      '541': true,
      '999': false,
      '60': false,
    },
  },
  {
    method: 'starcoinSignTransaction',
    expected: {
      '101010': true,
      '60': false,
    },
  },
  {
    method: 'stellarSignTransaction',
    expected: {
      '148': true,
      '60': false,
    },
  },
  {
    method: 'suiSignTransaction',
    expected: {
      '784': true,
      '60': false,
    },
  },
  {
    method: 'xrpSignTransaction',
    expected: {
      '144': true,
      '60': false,
    },
  },
  {
    method: 'tonSignMessage',
    expected: {
      '607': true,
      '60': false,
    },
  },
  {
    method: 'tronSignTransaction',
    expected: {
      '195': true,
      '60': false,
    },
  },

  // ==== sign message ====
  {
    method: 'alephiumSignMessage',
    expected: {
      '1234': true,
      '60': false,
    },
  },
  {
    method: 'aptosSignMessage',
    expected: {
      '637': true,
      '60': false,
    },
  },
  {
    method: 'confluxSignMessage',
    expected: {
      '503': true,
      '60': false,
    },
  },
  {
    method: 'confluxSignMessageCIP23',
    expected: {
      '503': true,
      '60': false,
    },
  },
  {
    method: 'scdoSignMessage',
    expected: {
      '541': true,
      '999': false,
      '60': false,
    },
  },
  {
    method: 'starcoinSignMessage',
    expected: {
      '101010': true,
      '60': false,
    },
  },
  {
    method: 'suiSignMessage',
    expected: {
      '784': true,
      '60': false,
    },
  },
  {
    method: 'tronSignMessage',
    expected: {
      '195': true,
      '60': false,
    },
  },
  {
    method: 'tonSignProof',
    expected: {
      '607': true,
      '60': false,
    },
  },
] as TestCaseDataType[];
