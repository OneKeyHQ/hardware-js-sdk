import type { UnifiedMethodConfig, ChainCategory } from '../types';

const api: UnifiedMethodConfig[] = [
  {
    method: 'algoGetAddress',

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
            value: "m/44'/283'/0'/0'/0'",
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
                path: "m/44'/283'/0'/0'/0'",
                showOnOneKey: false,
              },
              {
                path: "m/44'/283'/1'/0'/0'",
                showOnOneKey: false,
              },
              {
                path: "m/44'/283'/2'/0'/0'",
                showOnOneKey: false,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    method: 'algoSignTransaction',

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
            value: "m/44'/283'/0'/0'/0'",
          },
          {
            name: 'rawTx',
            type: 'textarea',
            required: true,
            label: 'Raw Transaction',
            description: 'Hex-encoded raw transaction data',
            value:
              '545889a3616d74cd03e8a3666565cd03e8a26676ce0241b3aea367656eac6d61696e6e65742d76312e30a26768c420c061c4d8fc1dbdded2d7604be4568e3f6d041987ac37bde4b620b5ab39248adfa26c76ce0241b796a3726376c4202c8ff1f3e02a31dae356ac1f5c450113d76323153bbb867ff88a3f8c1a3ae7cda3736e64c4208974657d5aa8b02503725d444c0bee69daf0f66d9d7ad14e9cf6d495aafe3467a474797065a3706179',
          },
        ],
      },
    ],
  },
];

// 导出链配置对象
export const algo: {
  api: UnifiedMethodConfig[];
  id: ChainCategory;
} = {
  id: 'algo',
  api,
};
