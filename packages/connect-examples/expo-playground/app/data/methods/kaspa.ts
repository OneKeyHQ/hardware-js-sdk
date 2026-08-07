import type { UnifiedMethodConfig, ChainCategory } from '../types';

const api: UnifiedMethodConfig[] = [
  {
    method: 'kaspaGetAddress',

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
            value: [
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
              {
                path: "m/44'/111111'/0'/0/2",
                prefix: 'kaspa',
                scheme: 'schnorr',
                showOnOneKey: false,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    method: 'kaspaSignTransaction',

    presets: [
      {
        title: 'Sign transaction',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Derivation Path',
            value: "m/44'/461'/0'/0/0",
          },
          {
            name: 'subNetworkID',
            type: 'string',
            required: false,
            label: 'Sub Network ID',
            value: '00000000000000000000000000000000',
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
            name: 'version',
            type: 'number',
            required: false,
            label: 'Version',
            value: 0,
          },
          {
            name: 'lockTime',
            type: 'string',
            required: false,
            label: 'Lock Time',
            value: '0',
          },
          {
            name: 'sigHashType',
            type: 'number',
            required: false,
            label: 'Signature Hash Type',
            value: 0x1,
          },
          {
            name: 'sigOpCount',
            type: 'number',
            required: false,
            label: 'Signature Operation Count',
            value: 1,
          },
          {
            name: 'inputs',
            type: 'textarea',
            required: true,
            label: 'Inputs',
            value: [
              {
                outputIndex: 1,
                path: "m/44'/111111'/0'/0/0",
                prevTxId: '1f226507807ff7dc5a7f8f2dec353fffc9dacc2645d8aecd02e5046907e3e2b2',
                sequenceNumber: '0',
                sigOpCount: 1,
                output: {
                  satoshis: '990096458',
                  script: '207afdae557e69c0040fd4135adffc60f9486fb21f4cbae233fd6db3e84ba47c55ac',
                },
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
                satoshis: '100000000',
                script: '205ca3a7530284e5c5e472544edd6002c3afeb8c8f84d3a728fad255a4872753fbac',
                scriptVersion: 0,
              },
              {
                satoshis: '890094182',
                script: '207afdae557e69c0040fd4135adffc60f9486fb21f4cbae233fd6db3e84ba47c55ac',
                scriptVersion: 0,
              },
            ],
          },
        ],
      },
    ],
  },
];

// 导出链配置对象
export const kaspa: {
  api: UnifiedMethodConfig[];
  id: ChainCategory;
} = {
  id: 'kaspa',
  api,
};
