import type { UnifiedMethodConfig, ChainCategory } from '../types';

const api: UnifiedMethodConfig[] = [
  {
    method: 'starcoinGetAddress',

    presets: [
      {
        title: 'Get address',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,

            value: "m/44'/101010'/0'/0'/0'",
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
                path: "m/44'/101010'/0'/0'/0'",
                showOnOneKey: false,
              },
              {
                path: "m/44'/101010'/1'/0'/0'",
                showOnOneKey: false,
              },
              {
                path: "m/44'/101010'/2'/0'/0'",
                showOnOneKey: false,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    method: 'starcoinGetPublicKey',

    presets: [
      {
        title: 'Get PublicKey',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,

            value: "m/44'/101010'/0'/0'/0'",
          },
          {
            name: 'showOnOneKey',
            type: 'boolean',

            value: false,
          },
        ],
      },
      {
        title: 'Batch Get PublicKey',
        parameters: [
          {
            name: 'bundle',
            type: 'textarea',
            required: true,
            label: 'Bundle Configuration',
            description: 'JSON array of public key configurations',
            value: [
              {
                path: "m/44'/101010'/0'/0'/0'",
                showOnOneKey: false,
              },
              {
                path: "m/44'/101010'/1'/0'/0'",
                showOnOneKey: false,
              },
              {
                path: "m/44'/101010'/2'/0'/0'",
                showOnOneKey: false,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    method: 'starcoinSignMessage',

    presets: [
      {
        title: 'Sign Message',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,

            value: "m/44'/101010'/0'/0'/0'",
          },
          {
            name: 'messageHex',
            type: 'string',
            label: 'Message Hex',
            value: '6578616d706c65206d657373616765',
          },
        ],
      },
    ],
  },
  {
    method: 'starcoinVerifyMessage',
    presets: [
      {
        title: 'Verify Message',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,

            value: "m/44'/101010'/0'/0'/0'",
          },
          {
            name: 'publicKey',
            type: 'string',
            label: 'Public Key',
            value: 'cf90aea8962229869bcba527f0cf0de73ad4c22fe27ad2875007e967db7056f5',
          },
          {
            name: 'messageHex',
            type: 'string',
            label: 'Message Hex',
            value: '0x6578616d706c65206d657373616765',
          },
          {
            name: 'signature',
            type: 'string',
            label: 'Signature',
            value:
              '447d2c3131c32d176106482d8fc780d933f13b37b0f06beee27de5e73a945e8c807f7764d269a196306f53383a26ab632913f4076457e3230b9defafe1c6ba0b',
          },
        ],
      },
    ],
  },
  {
    method: 'starcoinSignTransaction',

    presets: [
      {
        title: 'Sign Transaction',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,

            value: "m/44'/101010'/0'/0'/0'",
          },
          {
            name: 'rawTx',
            type: 'string',
            required: true,
            label: 'Raw Tx',
            value:
              '3b967f5ed62f0773d5f96ae5ceb55a2d780100000000000002000000000000000000000000000000010f5472616e73666572536372697074730f706565725f746f5f706565725f7632010700000000000000000000000000000001035354430353544300021068e843ca9b370dd84a8b567ed60afe691000e1f5050000000000000000000000004b9c01000000000001000000000000000d3078313a3a5354433a3a53544315bb48650000000001',
          },
        ],
      },
    ],
  },
];

// 导出链配置对象
export const starcoin: {
  api: UnifiedMethodConfig[];
  id: ChainCategory;
} = {
  id: 'starcoin',
  api,
};
