import type { UnifiedMethodConfig, ChainCategory } from '../types';

// 链元数据
export const chainMeta = {
  id: 'kaspa',
  name: 'Kaspa',
  description: 'Kaspa blockchain operations',
  icon: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" fill="#70C7BA"/><path d="M8 12l4 4 4-4-4-4-4 4z" fill="white"/></svg>`,
  color: '#70C7BA',
  category: 'kaspa' as ChainCategory,
};

const api: UnifiedMethodConfig[] = [
  {
    method: 'kaspaGetAddress',
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
            value: "m/44'/111111'/0'/0/0",
          },
          {
            name: 'prefix',
            type: 'string',
            required: false,
            label: 'Address Prefix',
            value: 'kaspa',
          },
          {
            name: 'scheme',
            type: 'string',
            required: false,
            label: 'Address Scheme',
            value: 'schnorr',
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
                  path: "m/44'/111111'/0'/0/0",
                  prefix: 'kaspa',
                  scheme: 'schnorr',
                  showOnOneKey: false,
                },
                {
                  path: "m/44'/111111'/0'/0/1",
                  prefix: 'kaspa',
                  scheme: 'schnorr',
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
    method: 'kaspaSignTransaction',
    description: 'Sign transaction',
    presets: [
      {
        title: 'Sign transaction',
        parameters: [
          {
            name: 'inputs',
            type: 'textarea',
            required: true,
            label: 'Inputs',
            value: JSON.stringify(
              [
                {
                  path: "m/44'/111111'/0'/0/0",
                  prevTxId: '40b022362652a0b8e72fcbc2e4c8f8e8c9f5f5e8e8c9f5f5e8e8c9f5f5e8e8c9',
                  outputIndex: 0,
                  sequenceNumber: 0,
                  output: {
                    satoshis: 1000000,
                    script: '76a914...',
                  },
                },
              ],
              null,
              2
            ),
          },
          {
            name: 'outputs',
            type: 'textarea',
            required: true,
            label: 'Outputs',
            value: JSON.stringify(
              [
                {
                  satoshis: 500000,
                  script: '76a914...',
                  scriptPublicKey: {
                    scriptPublicKey: '76a914...',
                  },
                },
              ],
              null,
              2
            ),
          },
          {
            name: 'version',
            type: 'number',
            required: false,
            label: 'Version',
            value: 0,
          },
          {
            name: 'lockTime',
            type: 'number',
            required: false,
            label: 'Lock Time',
            value: 0,
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
