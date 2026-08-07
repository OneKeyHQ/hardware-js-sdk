export type TestCaseDataType = {
  method: string;
  expected: Record<string, boolean>;
  params?: any;
  /**
   * Number of button presses needed before the final confirm gesture
   * when the expected result is `true` (native coinType signing).
   * Defaults to 1 if not specified.
   */
  confirmCount?: number;
  /**
   * If true, no slide-confirm gesture is needed after button presses.
   * Most signMessage methods fall into this category.
   */
  noSlide?: boolean;
};

export default [
  // ==== sign transaction ====
  {
    method: 'alephiumSignTransaction',
    confirmCount: 3,
    expected: {
      '1234': true,
      '60': false,
    },
  },
  {
    method: 'algoSignTransaction',
    confirmCount: 1,
    expected: {
      '283': true,
      '60': false,
    },
  },
  {
    method: 'aptosSignTransaction',
    confirmCount: 2,
    expected: {
      '637': true,
      '60': false,
    },
  },
  {
    method: 'confluxSignTransaction',
    confirmCount: 1,
    expected: {
      '503': true,
      '60': false,
    },
  },
  {
    method: 'cosmosSignTransaction',
    confirmCount: 1,
    expected: {
      '118': true,
      '60': false,
    },
  },
  {
    method: 'dnxSignTransaction',
    confirmCount: 0,
    expected: {
      '29538': true,
      '60': false,
    },
  },
  {
    method: 'filecoinSignTransaction',
    confirmCount: 1,
    expected: {
      '461': true,
      '60': false,
    },
  },
  {
    method: 'kaspaSignTransaction',
    confirmCount: 2,
    expected: {
      '111111': true,
      '60': false,
    },
  },
  {
    method: 'nearSignTransaction',
    confirmCount: 1,
    expected: {
      '397': true,
      '60': false,
    },
  },
  {
    method: 'neoSignTransaction',
    confirmCount: 1,
    expected: {
      '888': true,
      '60': false,
      '999': false,
    },
  },
  {
    method: 'nexaSignTransaction',
    confirmCount: 2,
    expected: {
      '29223': true,
      '999': false,
    },
  },
  {
    method: 'nemSignTransaction',
    confirmCount: 2,
    expected: {
      '1': true,
      '43': true,
      '60': false,
    },
  },
  {
    method: 'nostrSignSchnorr',
    confirmCount: 1,
    noSlide: true,
    expected: {
      '1237': true,
      '999': false,
      '60': false,
    },
  },
  {
    method: 'nervosSignTransaction',
    confirmCount: 2,
    expected: {
      '309': true,
      '60': false,
    },
  },
  {
    method: 'polkadotSignTransaction',
    confirmCount: 1,
    expected: {
      '354': true,
      '999': false,
      '60': false,
    },
  },
  {
    method: 'solSignTransaction',
    confirmCount: 1,
    expected: {
      '501': true,
      '999': false,
      '60': false,
    },
  },
  {
    method: 'scdoSignTransaction',
    confirmCount: 1,
    expected: {
      '541': true,
      '999': false,
      '60': false,
    },
  },
  {
    method: 'starcoinSignTransaction',
    confirmCount: 2,
    expected: {
      '101010': true,
      '60': false,
    },
  },
  {
    method: 'stellarSignTransaction',
    confirmCount: 7,
    expected: {
      '148': true,
      '60': false,
    },
  },
  {
    method: 'suiSignTransaction',
    confirmCount: 2,
    expected: {
      '784': true,
      '60': false,
    },
  },
  {
    method: 'xrpSignTransaction',
    confirmCount: 1,
    expected: {
      '144': true,
      '60': false,
    },
  },
  {
    method: 'tonSignMessage',
    confirmCount: 1,
    expected: {
      '607': true,
      '60': false,
    },
  },
  {
    method: 'tronSignTransaction',
    confirmCount: 2,
    expected: {
      '195': true,
      '60': false,
    },
  },

  // ==== sign message ====
  {
    method: 'alephiumSignMessage',
    confirmCount: 1,
    noSlide: true,
    expected: {
      '1234': true,
      '60': false,
    },
  },
  {
    method: 'aptosSignMessage',
    confirmCount: 1,
    noSlide: true,
    expected: {
      '637': true,
      '60': false,
    },
  },
  {
    method: 'confluxSignMessage',
    confirmCount: 1,
    noSlide: true,
    expected: {
      '503': true,
      '60': false,
    },
  },
  {
    method: 'confluxSignMessageCIP23',
    confirmCount: 1,
    expected: {
      '503': true,
      '60': false,
    },
  },
  {
    method: 'scdoSignMessage',
    confirmCount: 1,
    noSlide: true,
    expected: {
      '541': true,
      '999': false,
      '60': false,
    },
  },
  {
    method: 'starcoinSignMessage',
    confirmCount: 1,
    noSlide: true,
    expected: {
      '101010': true,
      '60': false,
    },
  },
  {
    method: 'suiSignMessage',
    confirmCount: 1,
    noSlide: true,
    expected: {
      '784': true,
      '60': false,
    },
  },
  {
    method: 'solSignMessage',
    confirmCount: 1,
    noSlide: true,
    expected: {
      '501': true,
      '60': false,
    },
  },
  {
    method: 'solSignOffchainMessage',
    confirmCount: 1,
    noSlide: true,
    expected: {
      '501': true,
      '60': false,
    },
  },
  {
    method: 'tronSignMessage',
    confirmCount: 1,
    noSlide: true,
    expected: {
      '195': true,
      '60': false,
    },
  },
  {
    method: 'tonSignProof',
    confirmCount: 1,
    noSlide: true,
    expected: {
      '607': true,
      '60': false,
    },
  },
] as TestCaseDataType[];
