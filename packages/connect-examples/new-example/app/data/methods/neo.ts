import type { UnifiedMethodConfig, ChainCategory } from '../types';

// 链元数据
export const chainMeta = {
  id: 'neo',
  name: 'NEO',
  description: 'NEO blockchain operations',
  category: 'neo' as ChainCategory,
};

const api: UnifiedMethodConfig[] = [
  {
    method: 'neoGetAddress',
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
            value: "m/44'/888'/0'/0/0",
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
            label: 'Bundle Configuration',
            description: 'JSON array of address configurations',
            value: JSON.stringify(
              [
                {
                  path: "m/44'/888'/0'/0/0",
                  showOnOneKey: false,
                },
                {
                  path: "m/44'/888'/0'/0/1",
                  showOnOneKey: false,
                },
                {
                  path: "m/44'/888'/0'/0/2",
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
    method: 'neoSignTransaction',
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
            value: "m/44'/888'/0'/0/0",
          },
          {
            name: 'rawTx',
            type: 'string',
            required: true,
            label: 'Raw Tx',
            value:
              '006108a1fd000000000000000070930000000000004d2169000120f4258023fc60fba495bcaa5d7148529734e93101005a0b02809698000c1420f4258023fc60fba495bcaa5d7148529734e9310c1420f4258023fc60fba495bcaa5d7148529734e93114c01f0c087472616e736665720c14cf76e28bd0062c4a478ee35561011319f3cfa4d241627d5b52',
          },
          {
            name: 'magicNumber',
            type: 'number',
            label: 'Magic Number',
            value: 860833102,
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
