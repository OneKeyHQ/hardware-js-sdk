import type { UnifiedMethodConfig, ChainCategory } from '../types';

const api: UnifiedMethodConfig[] = [
  {
    method: 'nexaGetAddress',
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
            value: "m/44'/29223'/0'/0/0",
          },
          {
            name: 'prefix',
            type: 'string',
            required: false,
            label: 'Address Prefix',
            value: 'nexa',
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
                path: "m/44'/29223'/0'/0/0",
                prefix: "nexa",
                showOnOneKey: false
              },
              {
                path: "m/44'/29223'/0'/0/1",
                prefix: "nexa",
                showOnOneKey: false
              }
            ],
          },
        ],
      },
    ],
  },
  {
    method: 'nexaSignTransaction',
    description: 'Sign transaction',
    presets: [
      {
        title: 'Sign transaction',
        parameters: [
          {
            name: 'inputs',
            type: 'textarea',
            required: true,
            label: 'Inputs',
            value: [
              {
                path: "m/44'/29223'/0'/0/0",
                message: "c6a5e8e8c9f5f5e8e8c9f5f5e8e8c9f5f5e8e8c9f5f5e8e8c9f5f5e8e8c9f5",
                preimage: "01000000..."
              }
            ],
          },
          {
            name: 'prefix',
            type: 'string',
            required: false,
            label: 'Address Prefix',
            value: 'nexa',
          },
        ],
      },
    ],
  },
];

// 导出链配置对象
export const nexa: {
  api: UnifiedMethodConfig[];
  id: ChainCategory;
} = {
  id: 'nexa',
  api,
};
