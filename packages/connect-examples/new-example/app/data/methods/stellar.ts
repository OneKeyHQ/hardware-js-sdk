import type { UnifiedMethodConfig, ChainCategory } from '../types';

// 链元数据
export const chainMeta = {
  id: 'stellar',
  name: 'Stellar',
  description: 'Stellar blockchain operations',
  icon: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" fill="#000000"/><path d="M8 12l4 4 4-4-4-4-4 4z" fill="white"/></svg>`,
  color: '#000000',
  category: 'stellar' as ChainCategory,
};

const api: UnifiedMethodConfig[] = [
  {
    method: 'stellarGetAddress',
    description: 'Get address',
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
            value: JSON.stringify(
              [
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
              null,
              2
            ),
          },
        ],
      },
    ],
  },
  {
    method: 'stellarSignTransaction',
    description: 'Sign transaction',
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
            value: JSON.stringify(
              {
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
              null,
              2
            ),
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
            value: JSON.stringify(
              {
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
              null,
              2
            ),
          },
        ],
      },
    ],
  },
];

// 导出链配置对象
export const chainConfig = {
  ...chainMeta,
  api,
};

export default api;
