import type { UnifiedMethodConfig, ChainCategory } from '../types';

const api: UnifiedMethodConfig[] = [
  {
    method: 'xrpGetAddress',

    presets: [
      {
        title: 'Get address',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Derivation Path',
            value: "m/44'/144'/0'/0/0",
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
                path: "m/44'/144'/0'/0/0",
                showOnOneKey: false,
              },
              {
                path: "m/44'/144'/0'/0/1",
                showOnOneKey: false,
              },
              {
                path: "m/44'/144'/0'/0/2",
                showOnOneKey: false,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    method: 'xrpSignTransaction',

    presets: [
      {
        title: 'Payment transaction',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Derivation Path',
            value: "m/44'/144'/0'/0/0",
          },
          {
            name: 'transaction',
            type: 'textarea',
            required: true,
            label: 'Transaction',
            value: {
              fee: '100000',
              flags: 2147483648,
              sequence: 25,
              maxLedgerVersion: 8820051,
              payment: {
                amount: '100000000',
                destination: 'rBKz5MC2iXdoS3XgnNSYmF69K1Yo4NS3Ws',
              },
            },
          },
        ],
      },
      {
        title: 'Payment with destination tag',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Derivation Path',
            value: "m/44'/144'/0'/0/0",
          },
          {
            name: 'transaction',
            type: 'textarea',
            required: true,
            label: 'Transaction',
            value: {
              fee: '100000',
              flags: 2147483648,
              sequence: 25,
              maxLedgerVersion: 8820051,
              payment: {
                amount: '100000000',
                destination: 'rBKz5MC2iXdoS3XgnNSYmF69K1Yo4NS3Ws',
                destinationTag: 12345,
              },
            },
          },
        ],
      },
    ],
  },
];

// 导出链配置对象
export const ripple: {
  api: UnifiedMethodConfig[];
  id: ChainCategory;
} = {
  id: 'ripple',
  api,
};
