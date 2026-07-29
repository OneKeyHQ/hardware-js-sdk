import type { UnifiedMethodConfig, ChainCategory } from '../types';

const api: UnifiedMethodConfig[] = [
  {
    method: 'aptosGetAddress',

    presets: [
      {
        title: 'Get address',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Derivation Path',
            description: 'BIP32 derivation path',
            value: "m/44'/637'/0'/0'/0'",
          },
          {
            name: 'showOnOneKey',
            type: 'boolean',
            required: false,
            label: 'Show on Device',
            description: '',
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
                path: "m/44'/637'/0'/0'/0'",
                showOnOneKey: false,
              },
              {
                path: "m/44'/637'/1'/0'/0'",
                showOnOneKey: false,
              },
              {
                path: "m/44'/637'/2'/0'/0'",
                showOnOneKey: false,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    method: 'aptosGetPublicKey',

    presets: [
      {
        title: 'Get public key',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Derivation Path',
            description: 'BIP32 derivation path',
            value: "m/44'/637'/0'/0'/0'",
          },
          {
            name: 'showOnOneKey',
            type: 'boolean',
            required: false,
            label: 'Show on Device',
            description: '',
            value: false,
          },
        ],
      },
      {
        title: 'Batch Get public key',
        parameters: [
          {
            name: 'bundle',
            type: 'textarea',
            required: true,
            label: 'Bundle Configuration',
            description: 'JSON array of public key configurations',
            value: [
              {
                path: "m/44'/637'/0'/0'/0'",
                showOnOneKey: false,
              },
              {
                path: "m/44'/637'/1'/0'/0'",
                showOnOneKey: false,
              },
              {
                path: "m/44'/637'/2'/0'/0'",
                showOnOneKey: false,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    method: 'aptosSignMessage',

    presets: [
      {
        title: 'Sign message',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Derivation Path',
            description: 'BIP32 derivation path',
            value: "m/44'/637'/0'/0'/0'",
          },
          {
            name: 'payload',
            type: 'textarea',
            required: true,
            label: 'Payload',
            description: 'Message payload to sign',
            value: {
              address: '0x1234',
              chainId: '0x1',
              application: 'OneKey Apps',
              nonce: '12345',
              message: 'hello',
            },
          },
        ],
      },
    ],
  },
  {
    method: 'aptosSignTransaction',

    presets: [
      {
        title: 'Sign transaction',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Derivation Path',
            description: 'BIP32 derivation path',
            value: "m/44'/637'/0'/0'/0'",
          },
          {
            name: 'rawTx',
            type: 'textarea',
            required: true,
            label: 'Raw Transaction',
            description: 'Hex-encoded raw transaction data',
            value:
              '4301355cc18d85809872bcbd63cb6ea5ac3c2814a1bacf2e50d8ec62367211917b79ecd1f1a98fa0d793d7cb92ebd9a479dc6aba0ae8570253aa87c0da32db5ed2bd401f3bbee52c2bc55761fd8486fae2e28f46499282f4267b8b90fc8c1cc97bb659b6cc927f2ec1701ef2928ddb84759ba5c557f549db',
          },
        ],
      },
      {
        title: 'Sign transaction with transaction type',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Derivation Path',
            description: 'BIP32 derivation path',
            value: "m/44'/637'/0'/0'/0'",
          },
          {
            name: 'transactionType',
            type: 'number',
            required: false,
            label: 'Transaction Type',
            description: 'Type of transaction',
            value: 1,
          },
          {
            name: 'rawTx',
            type: 'textarea',
            required: true,
            label: 'Raw Transaction',
            description: 'Hex-encoded raw transaction data',
            value:
              '4301355cc18d85809872bcbd63cb6ea5ac3c2814a1bacf2e50d8ec62367211917b79ecd1f1a98fa0d793d7cb92ebd9a479dc6aba0ae8570253aa87c0da32db5ed2bd401f3bbee52c2bc55761fd8486fae2e28f46499282f4267b8b90fc8c1cc97bb659b6cc927f2ec1701ef2928ddb84759ba5c557f549db',
          },
        ],
      },
    ],
  },
];

// 导出链配置对象
export const aptos: {
  api: UnifiedMethodConfig[];
  id: ChainCategory;
} = {
  id: 'aptos',
  api,
};
