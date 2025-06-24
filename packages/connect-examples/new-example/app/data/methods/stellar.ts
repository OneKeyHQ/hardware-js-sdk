import type { UnifiedMethodConfig, ChainCategory } from '../types';

const api: UnifiedMethodConfig[] = [
  {
    method: 'stellarGetAddress',

    presets: [
      {
        title: 'Get address',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Derivation Path',
            value: "m/44'/148'/0'",
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
                path: "m/44'/148'/0'",
                showOnOneKey: false,
              },
              {
                path: "m/44'/148'/1'",
                showOnOneKey: false,
              },
              {
                path: "m/44'/148'/2'",
                showOnOneKey: false,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    method: 'stellarSignTransaction',

    presets: [
      {
        title: 'Sign transaction',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Derivation Path',
            value: "m/44'/148'/0'",
          },
          {
            name: 'networkPassphrase',
            type: 'string',
            required: true,
            label: 'Network Passphrase',
            value: 'Public Global Stellar Network ; September 2015',
          },
          {
            name: 'transaction',
            type: 'textarea',
            required: true,
            label: 'Transaction',
            value: {
              source: 'GAXSFOOGF4ELO5HT5PTN23T5XE6D5QWL3YBHSVQ2HWOFEJNYYMRJENBV',
              fee: 100,
              sequence: '4294967297',
              memo: {
                type: 0,
              },
              operations: [
                {
                  type: 'payment',
                  source: 'GAXSFOOGF4ELO5HT5PTN23T5XE6D5QWL3YBHSVQ2HWOFEJNYYMRJENBV',
                  destination: 'GAXSFOOGF4ELO5HT5PTN23T5XE6D5QWL3YBHSVQ2HWOFEJNYYMRJENBV',
                  asset: {
                    type: 'native',
                  },
                  amount: '10000000',
                },
              ],
            },
          },
        ],
      },
      {
        title: 'Sign transaction with memo',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Derivation Path',
            value: "m/44'/148'/0'",
          },
          {
            name: 'networkPassphrase',
            type: 'string',
            required: true,
            label: 'Network Passphrase',
            value: 'Public Global Stellar Network ; September 2015',
          },
          {
            name: 'transaction',
            type: 'textarea',
            required: true,
            label: 'Transaction',
            value: {
              source: 'GAXSFOOGF4ELO5HT5PTN23T5XE6D5QWL3YBHSVQ2HWOFEJNYYMRJENBV',
              fee: 100,
              sequence: '4294967297',
              memo: {
                type: 1,
                text: 'test memo',
              },
              operations: [
                {
                  type: 'payment',
                  source: 'GAXSFOOGF4ELO5HT5PTN23T5XE6D5QWL3YBHSVQ2HWOFEJNYYMRJENBV',
                  destination: 'GAXSFOOGF4ELO5HT5PTN23T5XE6D5QWL3YBHSVQ2HWOFEJNYYMRJENBV',
                  asset: {
                    type: 'native',
                  },
                  amount: '10000000',
                },
              ],
            },
          },
        ],
      },
    ],
  },
];

// 导出链配置对象
export const stellar: {
  api: UnifiedMethodConfig[];
  id: ChainCategory;
} = {
  id: 'stellar',
  api,
};
