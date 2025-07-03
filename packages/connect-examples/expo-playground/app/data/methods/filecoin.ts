import type { UnifiedMethodConfig, ChainCategory } from '../types';

const api: UnifiedMethodConfig[] = [
  {
    method: 'filecoinGetAddress',

    presets: [
      {
        title: 'Get address',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,

            value: "m/44'/461'/0'/0/0",
          },
          {
            name: 'showOnOneKey',
            type: 'boolean',

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
            description: 'JSON array of address configurations',
            value: [
              {
                path: "m/44'/461'/0'/0/0",
                showOnOneKey: false,
              },
              {
                path: "m/44'/461'/0'/0/1",
                showOnOneKey: false,
              },
              {
                path: "m/44'/461'/0'/0/2",
                showOnOneKey: false,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    method: 'filecoinSignTransaction',

    presets: [
      {
        title: 'Sign Transaction',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,

            value: "m/44'/461'/0'/0/0",
          },
          {
            name: 'showOnOneKey',
            type: 'boolean',

            value: false,
          },
          {
            name: 'rawTx',
            type: 'string',
            required: true,
            label: 'Raw Tx',
            value:
              '8a0055015a2fd22d821d5855e401118fef6ea0373dadbde355018ae51a9d6c9fe1872fd31b10c96df89106790297004900016345785d8a00001a0009354445001730ee6e440001865e0040',
          },
        ],
      },
    ],
  },
];

// 导出链配置对象
export const filecoin: {
  api: UnifiedMethodConfig[];
  id: ChainCategory;
} = {
  id: 'filecoin',
  api,
};
