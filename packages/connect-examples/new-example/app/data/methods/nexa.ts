import type { UnifiedMethodConfig } from '../types';

// 链元数据
const chainMeta = {
  id: 'nexa',
};

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
            value: JSON.stringify(
              [
                {
                  path: "m/44'/29223'/0'/0/0",
                  prefix: 'nexa',
                  showOnOneKey: false,
                },
                {
                  path: "m/44'/29223'/0'/0/1",
                  prefix: 'nexa',
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
            value: JSON.stringify(
              [
                {
                  path: "m/44'/29223'/0'/0/0",
                  message: 'c6a5e8e8c9f5f5e8e8c9f5f5e8e8c9f5f5e8e8c9f5f5e8e8c9f5f5e8e8c9f5',
                  preimage: '01000000...',
                },
              ],
              null,
              2
            ),
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
export const nexa = {
  ...chainMeta,
  api,
};
