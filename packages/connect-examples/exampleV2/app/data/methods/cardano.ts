import type { UnifiedMethodConfig, ChainCategory } from '../types';

const api: UnifiedMethodConfig[] = [
  {
    method: 'cardanoGetAddress',

    presets: [
      {
        title: 'Get address',
        parameters: [
          {
            name: 'addressParameters',
            type: 'textarea',
            required: true,
            label: 'Address Parameters',
            value: {
              addressType: 0,
              path: "m/1852'/1815'/0'/0/0",
              stakingPath: "m/1852'/1815'/0'/2/0",
              stakingKeyHash: undefined,
              paymentScriptHash: undefined,
              stakingScriptHash: undefined,
            },
          },
          {
            name: 'derivationType',
            type: 'number',
            required: false,
            label: 'Derivation Type',
            description: 'Derivation type (1 for Classic, 2 for Touch)',
            value: 1,
          },
          {
            name: 'protocolMagic',
            type: 'number',
            required: true,
            label: 'Protocol Magic',
            value: 764824073,
          },
          {
            name: 'networkId',
            type: 'number',
            required: true,
            label: 'Network ID',
            value: 1,
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
        title: 'Classic Batch Get Address',
        parameters: [
          {
            name: 'bundle',
            type: 'textarea',
            required: true,
            label: 'Bundle Configuration',
            description: 'Classic derivation batch address configuration',
            value: [
              {
                addressParameters: {
                  addressType: 0,
                  path: "m/1852'/1815'/0'/0/0",
                  stakingPath: "m/1852'/1815'/0'/2/0",
                },
                protocolMagic: 764824073,
                networkId: 1,
                derivationType: 1,
                address: '',
                showOnOneKey: false,
                isCheck: false,
              },
              {
                addressParameters: {
                  addressType: 0,
                  path: "m/1852'/1815'/0'/1/0",
                  stakingPath: "m/1852'/1815'/0'/2/0",
                },
                protocolMagic: 764824073,
                networkId: 1,
                derivationType: 1,
                address: '',
                showOnOneKey: false,
                isCheck: false,
              },
              {
                addressParameters: {
                  addressType: 0,
                  path: "m/1852'/1815'/0'/2/0",
                  stakingPath: "m/1852'/1815'/0'/2/0",
                },
                protocolMagic: 764824073,
                networkId: 1,
                derivationType: 1,
                address: '',
                showOnOneKey: false,
                isCheck: false,
              },
            ],
          },
        ],
      },
      {
        title: 'Touch Batch Get Address',
        parameters: [
          {
            name: 'bundle',
            type: 'textarea',
            required: true,
            label: 'Bundle Configuration',
            description: 'Touch derivation batch address configuration',
            value: [
              {
                addressParameters: {
                  addressType: 0,
                  path: "m/1852'/1815'/0'/0/0",
                  stakingPath: "m/1852'/1815'/0'/2/0",
                },
                protocolMagic: 764824073,
                networkId: 1,
                derivationType: 1,
                address: '',
                showOnOneKey: false,
                isCheck: false,
              },
              {
                addressParameters: {
                  addressType: 0,
                  path: "m/1852'/1815'/0'/1/0",
                  stakingPath: "m/1852'/1815'/0'/2/0",
                },
                protocolMagic: 764824073,
                networkId: 1,
                derivationType: 2,
                address: '',
                showOnOneKey: false,
                isCheck: false,
              },
              {
                addressParameters: {
                  addressType: 0,
                  path: "m/1852'/1815'/0'/2/0",
                  stakingPath: "m/1852'/1815'/0'/2/0",
                },
                protocolMagic: 764824073,
                networkId: 1,
                derivationType: 1,
                address: '',
                showOnOneKey: false,
                isCheck: false,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    method: 'cardanoGetPublicKey',

    presets: [
      {
        title: 'Get public key',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Derivation Path',
            value: "m/1852'/1815'/0'",
          },
          {
            name: 'showOnOneKey',
            type: 'boolean',
            required: false,
            label: 'Show on Device',
            value: false,
          },
          {
            name: 'derivationType',
            type: 'number',
            required: false,
            label: 'Derivation Type',
            description: 'Derivation type (1 for Classic, 2 for Touch)',
            value: 1,
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
                path: "m/1852'/1815'/0'",
                showOnOneKey: false,
              },
              {
                path: "m/1852'/1815'/1'",
                showOnOneKey: false,
              },
              {
                path: "m/1852'/1815'/2'",
                showOnOneKey: false,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    method: 'cardanoSignMessage',

    presets: [
      {
        title: 'Sign message',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Derivation Path',
            value: "m/1852'/1815'/0'/0/0",
          },
          {
            name: 'message',
            type: 'string',
            required: true,
            label: 'Message',
            value: 'Hello World',
          },
          {
            name: 'derivationType',
            type: 'number',
            required: false,
            label: 'Derivation Type',
            description: 'Derivation type (1 for Classic, 2 for Touch)',
            value: 1,
          },
          {
            name: 'networkId',
            type: 'number',
            required: true,
            label: 'Network ID',
            value: 1,
          },
        ],
      },
    ],
  },
  {
    method: 'cardanoSignTransaction',

    presets: [
      {
        title: 'Sign transaction',
        parameters: [
          {
            name: 'signingMode',
            type: 'number',
            required: false,
            label: 'Signing Mode',
            description: 'Transaction signing mode',
            value: 0,
          },
          {
            name: 'inputs',
            type: 'textarea',
            required: true,
            label: 'Inputs',
            value: [
              {
                path: "m/1852'/1815'/0'/0/0",
                prev_hash: '1af8fa0b754ff99253d983894e63a2b09cbb56c833ba18c3384210163f63dcfc',
                prev_index: 0,
              },
            ],
          },
          {
            name: 'outputs',
            type: 'textarea',
            required: true,
            label: 'Outputs',
            value: [
              {
                address:
                  'addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3n0d3vllmyqwsx5wktcd8cc3sq835lu7drv2xwl2wywfgse35a3x',
                amount: '3003112',
                tokenBundle: [
                  {
                    policyId: '95a292ffee938be03e9bae5657982a74e9014eb4960108c9c67a5b9b',
                    tokenAmounts: [
                      {
                        assetNameBytes: '74652474436f696e',
                        amount: '7878754',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            name: 'fee',
            type: 'string',
            required: true,
            label: 'Fee',
            value: '177197',
          },
          {
            name: 'ttl',
            type: 'string',
            required: false,
            label: 'TTL',
            value: '57456781',
          },
          {
            name: 'protocolMagic',
            type: 'number',
            required: true,
            label: 'Protocol Magic',
            value: 764824073,
          },
          {
            name: 'networkId',
            type: 'number',
            required: true,
            label: 'Network ID',
            value: 1,
          },
          {
            name: 'derivationType',
            type: 'number',
            required: false,
            label: 'Derivation Type',
            description: 'Derivation type (1 for Classic, 2 for Touch)',
            value: 1,
          },
        ],
      },
    ],
  },
];

// 导出链配置对象
export const cardano: {
  api: UnifiedMethodConfig[];
  id: ChainCategory;
} = {
  id: 'cardano',
  api,
};
