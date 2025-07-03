import type { UnifiedMethodConfig, ChainCategory } from '../types';

const api: UnifiedMethodConfig[] = [
  {
    method: 'cosmosGetAddress',

    presets: [
      {
        title: 'Get address',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Derivation Path',
            value: "m/44'/118'/0'/0/0",
          },
          {
            name: 'hrp',
            type: 'string',
            required: true,
            label: 'HRP',
            value: 'cosmos',
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
                path: "m/44'/118'/0'/0/0",
                hrp: 'cosmos',
                showOnOneKey: false,
              },
              {
                path: "m/44'/118'/0'/0/1",
                hrp: 'cosmos',
                showOnOneKey: false,
              },
              {
                path: "m/44'/118'/0'/0/2",
                hrp: 'cosmos',
                showOnOneKey: false,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    method: 'cosmosGetPublicKey',

    presets: [
      {
        title: 'Get public key',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Derivation Path',
            value: "m/44'/118'/0'/0/0",
          },
          {
            name: 'curve',
            type: 'string',
            required: false,
            label: 'Curve',
            value: 'secp256k1',
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
        title: 'Batch Get Public Key',
        parameters: [
          {
            name: 'bundle',
            type: 'textarea',
            required: true,
            label: 'Bundle Configuration',
            value: [
              {
                path: "m/44'/118'/0'/0/0",
                curve: 'secp256k1',
                showOnOneKey: false,
              },
              {
                path: "m/44'/118'/0'/0/1",
                curve: 'secp256k1',
                showOnOneKey: false,
              },
              {
                path: "m/44'/118'/0'/0/2",
                curve: 'secp256k1',
                showOnOneKey: false,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    method: 'cosmosSignTransaction',

    presets: [
      {
        title: 'Sign transaction',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Derivation Path',
            value: "m/44'/118'/0'/0/0",
          },
          {
            name: 'rawTx',
            type: 'textarea',
            required: true,
            label: 'Raw Transaction',
            value:
              '7b226163636f756e745f6e756d626572223a2230222c22636861696e5f6964223a22636f736d6f736875622d34222c22666565223a7b22616d6f756e74223a5b7b22616d6f756e74223a2235303030222c2264656e6f6d223a227561746f6d227d5d2c22676173223a22323030303030227d2c226d656d6f223a22222c226d736773223a5b7b2274797065223a22636f736d6f732d73646b2f4d736753656e64222c2276616c7565223a7b22616d6f756e74223a5b7b22616d6f756e74223a223130303030303030222c2264656e6f6d223a227561746f6d227d5d2c2266726f6d5f61646472657373223a22636f736d6f73316d7536647636673561326e6e756b3679656b6a6d6d6b6a6633636d377a6c6e66357133656e6a222c22746f5f61646472657373223a22636f736d6f73316d7536647636673561326e6e756b3679656b6a6d6d6b6a6633636d377a6c6e66357133656e6a227d7d5d2c2273657175656e6365223a2230227d',
          },
        ],
      },
    ],
  },
];

// 导出链配置对象
export const cosmos: {
  api: UnifiedMethodConfig[];
  id: ChainCategory;
} = {
  id: 'cosmos',
  api,
};
