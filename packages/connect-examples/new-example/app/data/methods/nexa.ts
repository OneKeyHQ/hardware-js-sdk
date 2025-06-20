import type { UnifiedMethodConfig, ChainCategory } from '../types';

// 链元数据
export const chainMeta = {
  id: 'nexa',
  name: 'Nexa',
  description: 'Nexa blockchain operations',
  icon: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" fill="#6366F1"/><path d="M8 12l4 4 4-4-4-4-4 4z" fill="white"/></svg>`,
  color: '#6366F1',
  category: 'nexa' as ChainCategory,
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
export const chainConfig = {
  ...chainMeta,
  api,
};

export default api;
