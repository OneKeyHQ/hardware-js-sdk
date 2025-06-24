import type { UnifiedMethodConfig, ChainCategory } from '../types';

const api: UnifiedMethodConfig[] = [
  {
    method: 'benfenGetAddress',
    description: 'Get address',
    presets: [
      {
        title: 'Get address',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Path',
            value: "m/44'/728'/0'/0'/0'",
          },
          {
            name: 'showOnOneKey',
            type: 'boolean',
            label: 'Show On One Key',
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
            label: 'Bundle Parameters',
            value: JSON.stringify(
              [
                {
                  path: "m/44'/728'/0'/0'/0'",
                  showOnOneKey: false,
                },
                {
                  path: "m/44'/728'/1'/0'/0'",
                  showOnOneKey: false,
                },
                {
                  path: "m/44'/728'/2'/0'/0'",
                  showOnOneKey: false,
                },
              ],
              null,
              2
            ),
          },
        ],
      },
    ],
  },
  {
    method: 'benfenGetPublicKey',
    description: 'Get PublicKey',
    presets: [
      {
        title: 'Get PublicKey',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Path',
            value: "m/44'/728'/0'/0'/0'",
          },
          {
            name: 'showOnOneKey',
            type: 'boolean',
            label: 'Show On One Key',
            value: false,
          },
        ],
      },
      {
        title: 'Batch Get PublicKey',
        parameters: [
          {
            name: 'bundle',
            type: 'textarea',
            required: true,
            label: 'Bundle Parameters',
            value: JSON.stringify(
              [
                {
                  path: "m/44'/728'/0'/0'/0'",
                  showOnOneKey: false,
                },
                {
                  path: "m/44'/728'/1'/0'/0'",
                  showOnOneKey: false,
                },
                {
                  path: "m/44'/728'/2'/0'/0'",
                  showOnOneKey: false,
                },
              ],
              null,
              2
            ),
          },
        ],
      },
    ],
  },
  {
    method: 'benfenSignMessage',
    description: 'Sign Message',
    presets: [
      {
        title: 'Sign Message',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Path',
            value: "m/44'/728'/0'/0'/0'",
          },
          {
            name: 'messageHex',
            type: 'string',
            label: 'Message Hex',
            value: '48656c6c6f2c20576f726c6421',
          },
        ],
      },
    ],
  },
  {
    method: 'benfenSignTransaction',
    description: 'Sign Transaction',
    presets: [
      {
        title: 'Sign Transaction',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Path',
            value: "m/44'/728'/0'/0'/0'",
          },
          {
            name: 'rawTx',
            type: 'string',
            required: true,
            label: 'Raw Tx',
            value:
              '0x00000000000200088096980000000000002017f3a9bd36da0639153d3c38032217ea298eb1991e0a62cc5924e2dd712937350202000101000001010300000000010100b4ced58018b75d7ba72a10fa97c09b7bf66533ff104bf9db1bfdb004b17d8eaa0183006eb3c5499c3cb4b022f20955f387312ed312389c552fa39e35d6423d0c74f785b7000000000020497f41fdfb22d2ae32111dcdc21c16d27f48f47b7ca7aba240b684db5ca74c0fb4ced58018b75d7ba72a10fa97c09b7bf66533ff104bf9db1bfdb004b17d8eaa640000000000000060ad38000000000000',
          },
          {
            name: 'coinType',
            type: 'string',
            label: 'Coin Type',
            value: '0x2::bfc::BFC',
          },
        ],
      },
      {
        title: 'Sign Transaction(Big 7K)',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Path',
            value: "m/44'/728'/0'/0'/0'",
          },
          {
            name: 'coinType',
            type: 'string',
            label: 'Coin Type',
            value: '0xc8::busd::BUSD',
          },
          {
            name: 'rawTx',
            type: 'string',
            required: true,
            label: 'Raw Tx',
            value: 'PLACEHOLDER_FOR_BIG_RAW_TX_DATA_7K',
          },
        ],
      },
    ],
  },
];

// 导出链配置对象
export const benfen: {
  api: UnifiedMethodConfig[];
  id: ChainCategory;
} = {
  id: 'benfen',
  api,
};
