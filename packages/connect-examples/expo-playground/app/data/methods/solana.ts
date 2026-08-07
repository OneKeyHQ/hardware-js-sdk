import type { UnifiedMethodConfig, ChainCategory } from '../types';

const api: UnifiedMethodConfig[] = [
  {
    method: 'solGetAddress',

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
            value: "m/44'/501'/0'/0'",
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
                path: "m/44'/501'/0'/0'",
                showOnOneKey: false,
              },
              {
                path: "m/44'/501'/1'/0'",
                showOnOneKey: false,
              },
              {
                path: "m/44'/501'/2'/0'",
                showOnOneKey: false,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    method: 'solSignTransaction',

    presets: [
      {
        title: 'Sign Transaction',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Derivation Path',
            description: 'BIP32 derivation path',
            value: "m/44'/501'/0'/0'",
          },
          {
            name: 'rawTx',
            type: 'textarea',
            required: true,
            label: 'Raw Transaction',
            description: 'Hex-encoded raw transaction data',
            value:
              '0100010376655f5ed1653f0882195b265edd2149775b197f64a21a283337abb53ae80db2eb08fa3adfd0ff75382ba8cb3b08bb165addc780f6adc2937be8ee36a9f44adc00000000000000000000000000000000000000000000000000000000000000000cd9e955d5c0cdfba7f0ccf4c51000bc5e219adec51f4e0bc98f6d8649bc0cd801020200010c0200000040420f0000000000',
          },
        ],
      },
    ],
  },
  {
    method: 'solSignOffchainMessage',
    description: 'methodDescriptions.solSignOffchainMessage',
    presets: [
      {
        title: 'Sign Offchain Message',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Derivation Path',
            description: 'BIP32 derivation path',
            value: "m/44'/501'/0'/0'",
          },
          {
            name: 'messageHex',
            type: 'string',
            required: true,
            label: 'Message (Hex)',
            description: 'Message to sign in hexadecimal format',
            value: '48656c6c6f',
          },
        ],
      },
    ],
  },
  {
    method: 'solSignMessage',

    presets: [
      {
        title: 'Sign Message',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Derivation Path',
            description: 'BIP32 derivation path',
            value: "m/44'/501'/0'/0'",
          },
          {
            name: 'messageHex',
            type: 'string',
            required: true,
            label: 'Message (Hex)',
            description: 'Message to sign in hexadecimal format',
            value: '48656c6c6f',
          },
        ],
      },
    ],
  },
];

// 导出链配置对象
export const solana: {
  api: UnifiedMethodConfig[];
  id: ChainCategory;
} = {
  id: 'solana',
  api,
};
