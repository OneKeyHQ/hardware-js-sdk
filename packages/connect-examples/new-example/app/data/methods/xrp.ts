import type { UnifiedMethodConfig } from '../types';

// 链元数据
const chainMeta = {
  id: 'xrp',
};

const api: UnifiedMethodConfig[] = [
  {
    method: 'xrpGetAddress',
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
            value: JSON.stringify(
              [
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
              null,
              2
            ),
          },
        ],
      },
    ],
  },
  {
    method: 'xrpSignTransaction',
    description: 'Sign transaction',
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
            value: JSON.stringify(
              {
                fee: '100000',
                flags: 0x80000000,
                sequence: 25,
                maxLedgerVersion: 8820051,
                payment: {
                  amount: '100000000',
                  destination: 'rBKz5MC2iXdoS3XgnNSYmF69K1Yo4NS3Ws',
                },
              },
              null,
              2
            ),
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
            value: JSON.stringify(
              {
                fee: '100000',
                flags: 0x80000000,
                sequence: 25,
                maxLedgerVersion: 8820051,
                payment: {
                  amount: '100000000',
                  destination: 'rBKz5MC2iXdoS3XgnNSYmF69K1Yo4NS3Ws',
                  destinationTag: 12345,
                },
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
export const xrp = {
  ...chainMeta,
  api,
};
