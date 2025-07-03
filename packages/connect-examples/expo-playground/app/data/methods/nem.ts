import type { UnifiedMethodConfig, ChainCategory } from '../types';

const api: UnifiedMethodConfig[] = [
  {
    method: 'nemGetAddress',

    presets: [
      {
        title: 'Get address',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,

            value: "m/44'/43'/0'",
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
                path: "m/44'/43'/0'",
                showOnOneKey: false,
              },
              {
                path: "m/44'/43'/1'",
                showOnOneKey: false,
              },
              {
                path: "m/44'/43'/2'",
                showOnOneKey: false,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    method: 'nemSignTransaction',

    presets: [
      {
        title: 'Sign Transaction',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,

            value: "m/44'/43'/0'",
          },
          {
            name: 'transaction',
            type: 'textarea',
            required: true,
            label: 'Transaction',
            description: 'NEM transaction object',
            value: {
              timeStamp: 74649215,
              amount: 2000000,
              fee: 2000000,
              recipient: 'TALICE2GMA34CXHD7XLJQ536NM5UNKQF23HF6YK',
              type: 257,
              deadline: 74735615,
              message: {
                payload: '746573745f6e656d5f7472616e73616374696f6e5f7472616e73666572',
                type: 1,
              },
              version: 1744830465,
              signer: 'be6e84f957e4bce4c5a8a8a2c88f8e5ea2b5d0a4b1e4d1e4b1e4d1e4b1e4d1e4',
            },
          },
        ],
      },
    ],
  },
];

// 导出链配置对象
export const nem: {
  api: UnifiedMethodConfig[];
  id: ChainCategory;
} = {
  id: 'nem',
  api,
};
