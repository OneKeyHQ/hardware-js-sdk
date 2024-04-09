export type TestCaseDataType = {
  method: string;
  expected: Record<string, boolean>;
  params?: any;
};

export default [
  {
    method: 'algoSignTransaction',
    expected: {
      '283': true,
      '999': false,
      '60': false,
    },
  },
  {
    method: 'cosmosSignTransaction',
    expected: {
      '118': true,
      '999': false,
      '60': false,
    },
  },
  {
    method: 'filecoinSignTransaction',
    expected: {
      '461': true,
      '999': false,
      '60': false,
    },
  },
  {
    method: 'kaspaSignTransaction',
    expected: {
      '111111': true,
      '999': false,
      '60': false,
    },
  },
  {
    method: 'nearSignTransaction',
    expected: {
      '397': true,
      '999': false,
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
    method: 'nostrSignSchnorr',
    expected: {
      '1237': true,
      '999': false,
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
    method: 'suiSignTransaction',
    expected: {
      '784': true,
      '999': false,
      '60': false,
    },
  },
] as TestCaseDataType[];
