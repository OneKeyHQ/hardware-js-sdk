import type { UnifiedMethodConfig, ChainCategory } from '../types';

const api: UnifiedMethodConfig[] = [
  {
    method: 'dnxGetAddress',

    presets: [
      {
        title: 'Get address',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,

            value: "m/44'/29538'/0'/0'/0'",
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
                path: "m/44'/29538'/0'/0'/0'",
                showOnOneKey: false,
              },
              {
                path: "m/44'/29538'/0'/0'/1'",
                showOnOneKey: false,
              },
              {
                path: "m/44'/29538'/0'/0'/2'",
                showOnOneKey: false,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    method: 'dnxSignTransaction',

    presets: [
      {
        title: 'Normal Transaction',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,

            value: "m/44'/29538'/0'/0'/0'",
          },
          {
            name: 'inputs',
            type: 'textarea',
            required: true,
            label: 'Inputs',
            description: 'Transaction inputs',
            value: [
              {
                prev_hash: 'b902e34e3e4d4e4e4e4e4e4e4e4e4e4e4e4e4e4e4e4e4e4e4e4e4e4e4e4e4e4e',
                prev_index: 0,
                global_index: 1234567,
                amount: 13000000,
              },
            ],
          },
          {
            name: 'toAddress',
            type: 'string',
            required: true,
            label: 'To Address',
            value:
              'XwmxTF8FxAy2s5cvtS62oSGxY3fzvDcgo2CiJ6rrpz9te68sApSDs3LQihubFtpsfT5z6NYHZzMKUjavNpTkW46i2dYgHBULG',
          },
          {
            name: 'amount',
            type: 'string',
            required: true,
            label: 'Amount',
            value: '13000000',
          },
          {
            name: 'fee',
            type: 'string',
            required: true,
            label: 'Fee',
            value: '10000',
          },
        ],
      },
    ],
  },
];

// 导出链配置对象
export const dynex: {
  api: UnifiedMethodConfig[];
  id: ChainCategory;
} = {
  id: 'dynex',
  api,
};
