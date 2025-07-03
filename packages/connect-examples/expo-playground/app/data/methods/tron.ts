import type { UnifiedMethodConfig, ChainCategory } from '../types';

const api: UnifiedMethodConfig[] = [
  {
    method: 'tronGetAddress',
    presets: [
      {
        title: 'Get address',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Derivation Path',
            value: "m/44'/195'/0'/0/0",
          },
          {
            name: 'showOnOneKey',
            type: 'boolean',
            required: false,
            label: 'Show on Device',
            value: false,
          },
        ],
      },
      {
        title: 'Batch Get Address',
        parameters: [
          {
            name: 'bundle',
            type: 'textarea',
            required: true,
            label: 'Bundle Configuration',
            value: [
              {
                path: "m/44'/195'/0'/0/0",
                showOnOneKey: false,
              },
              {
                path: "m/44'/195'/0'/0/1",
                showOnOneKey: false,
              },
              {
                path: "m/44'/195'/0'/0/2",
                showOnOneKey: false,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    method: 'tronSignTransaction',

    presets: [
      {
        title: 'Sign Transaction',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Derivation Path',
            value: "m/44'/195'/0'/0/0",
          },
          {
            name: 'transaction',
            type: 'textarea',
            required: true,
            label: 'Transaction',
            value: {
              refBlockBytes: 'ddf1',
              refBlockHash: 'd04764f22469a0b8',
              data: '0x0',
              feeLimit: 0,
              expiration: 1655692140000,
              timestamp: 1655692083406,
              contract: {
                transferContract: {
                  toAddress: 'TXrs7yxQLNzig7J9EbKhoEiUp6kWpdWKnD',
                  amount: 100,
                },
              },
            },
          },
        ],
      },
      {
        title: 'Sign Transaction TRC20',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Derivation Path',
            value: "m/44'/195'/0'/0/0",
          },
          {
            name: 'transaction',
            type: 'textarea',
            required: true,
            label: 'Transaction',
            value: {
              refBlockBytes: 'f37c',
              refBlockHash: 'aadfb347dabb84de',
              data: '0x0',
              feeLimit: 1000000,
              expiration: 1657770198000,
              timestamp: 1657770139291,
              contract: {
                triggerSmartContract: {
                  contractAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
                  data: 'a9059cbb000000000000000000000000f01fad0beb95a0a41cb1e68f384b33b846fe7d830000000000000000000000000000000000000000000000000000000000000001',
                },
              },
            },
          },
        ],
      },
      {
        title: 'Sign Transaction Stake',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Derivation Path',
            value: "m/44'/195'/0'/0/0",
          },
          {
            name: 'transaction',
            type: 'textarea',
            required: true,
            label: 'Transaction',
            value: {
              refBlockBytes: 'f37c',
              refBlockHash: 'aadfb347dabb84de',
              data: '0x0',
              feeLimit: 1000000,
              expiration: 1657770198000,
              timestamp: 1657770139291,
              contract: {
                freezeBalanceV2Contract: {
                  frozenBalance: 100,
                  resource: 0,
                },
              },
            },
          },
        ],
      },
      {
        title: 'Sign Transaction Unstake',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Derivation Path',
            value: "m/44'/195'/0'/0/0",
          },
          {
            name: 'transaction',
            type: 'textarea',
            required: true,
            label: 'Transaction',
            value: {
              refBlockBytes: 'f37c',
              refBlockHash: 'aadfb347dabb84de',
              data: '0x0',
              feeLimit: 1000000,
              expiration: 1657770198000,
              timestamp: 1657770139291,
              contract: {
                unfreezeBalanceV2Contract: {
                  unfreezeBalance: 100,
                  resource: 0,
                },
              },
            },
          },
        ],
      },
      {
        title: 'Sign Transaction Vote',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Derivation Path',
            value: "m/44'/195'/0'/0/0",
          },
          {
            name: 'transaction',
            type: 'textarea',
            required: true,
            label: 'Transaction',
            value: {
              refBlockBytes: 'f37c',
              refBlockHash: 'aadfb347dabb84de',
              feeLimit: 1000000,
              expiration: 1657770198000,
              timestamp: 1657770139291,
              contract: {
                voteWitnessContract: {
                  votes: [
                    {
                      voteAddress: 'TXrs7yxQLNzig7J9EbKhoEiUp6kWpdWKnD',
                      voteCount: 100,
                    },
                  ],
                },
              },
            },
          },
        ],
      },
      {
        title: 'Sign Transaction Cancel AllUnfreeze V2',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Derivation Path',
            value: "m/44'/195'/0'/0/0",
          },
          {
            name: 'transaction',
            type: 'textarea',
            required: true,
            label: 'Transaction',
            value: {
              refBlockBytes: 'f37c',
              refBlockHash: 'aadfb347dabb84de',
              feeLimit: 1000000,
              expiration: 1657770198000,
              timestamp: 1657770139291,
              contract: {
                cancelAllUnfreezeV2Contract: {},
              },
            },
          },
        ],
      },
    ],
  },
  {
    method: 'tronSignMessage',

    presets: [
      {
        title: 'Sign message',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Derivation Path',
            value: "m/44'/195'/0'/0/0",
          },
          {
            name: 'messageHex',
            type: 'string',
            required: true,
            label: 'Message (Hex)',
            value: '48656c6c6f20576f726c64',
          },
        ],
      },
    ],
  },
];

// 导出链配置对象
export const tron: {
  api: UnifiedMethodConfig[];
  id: ChainCategory;
} = {
  id: 'tron',
  api,
};
