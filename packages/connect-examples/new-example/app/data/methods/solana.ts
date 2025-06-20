import type { UnifiedMethodConfig, ChainCategory } from '../types';

// 链元数据
export const chainMeta = {
  id: 'solana',
  name: 'Solana',
  description: 'Solana blockchain operations',
  icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.22 9.4a.77.77 0 0 1 .55-.23h16.27a.39.39 0 0 1 .28.67l-2.72 2.72a.77.77 0 0 1-.55.23H1.78a.39.39 0 0 1-.28-.67L4.22 9.4z" fill="url(#a)"/><path d="M4.22 2.13a.77.77 0 0 1 .55-.23h16.27a.39.39 0 0 1 .28.67L18.6 5.29a.77.77 0 0 1-.55.23H1.78a.39.39 0 0 1-.28-.67L4.22 2.13z" fill="url(#b)"/><path d="M18.6 16.87a.77.77 0 0 1-.55.23H1.78a.39.39 0 0 1-.28-.67l2.72-2.72a.77.77 0 0 1 .55-.23h16.27a.39.39 0 0 1 .28.67l-2.72 2.72z" fill="url(#c)"/><defs><linearGradient id="a" x1="21.84" y1="12.82" x2="6.34" y2="-2.68" gradientUnits="userSpaceOnUse"><stop stop-color="#00FFA3"/><stop offset="1" stop-color="#DC1FFF"/></linearGradient><linearGradient id="b" x1="21.84" y1="5.55" x2="6.34" y2="-9.95" gradientUnits="userSpaceOnUse"><stop stop-color="#00FFA3"/><stop offset="1" stop-color="#DC1FFF"/></linearGradient><linearGradient id="c" x1="21.84" y1="20.09" x2="6.34" y2="4.59" gradientUnits="userSpaceOnUse"><stop stop-color="#00FFA3"/><stop offset="1" stop-color="#DC1FFF"/></linearGradient></defs></svg>`,
  color: '#9945FF',
  category: 'solana' as ChainCategory,
};

const api: UnifiedMethodConfig[] = [
  {
    method: 'solGetAddress',
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
            description: 'BIP32 derivation path',
            value: "m/44'/501'/0'/0'",
          },
          {
            name: 'showOnOneKey',
            type: 'boolean',
            required: false,
            label: 'Show on Device',
            description: 'Display address on OneKey device for verification',
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
              null,
              2
            ),
          },
        ],
      },
    ],
  },
  {
    method: 'solSignTransaction',
    description: 'Sign Transaction',
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
    description: 'Sign Offchain Message',
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
    description: 'Sign Message',
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
export const chainConfig = {
  ...chainMeta,
  api,
};

export default api;
