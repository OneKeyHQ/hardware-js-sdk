import type { UnifiedMethodConfig, ChainCategory } from '../types';

const api: UnifiedMethodConfig[] = [
  {
    method: 'nexaGetAddress',

    presets: [
      {
        title: 'Get address',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Derivation Path',
            value: "m/44'/29223'/0'/0/0",
          },
          {
            name: 'prefix',
            type: 'string',
            required: false,
            label: 'Address Prefix',
            value: 'nexa',
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
                path: "m/44'/29223'/0'/0/0",
                showOnOneKey: false,
              },
              {
                path: "m/44'/29223'/0'/0/1",
                showOnOneKey: false,
              },
              {
                path: "m/44'/29223'/0'/0/2",
                showOnOneKey: false,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    method: 'nexaSignTransaction',

    presets: [
      {
        title: 'Sign transaction',
        parameters: [
          {
            name: 'inputs',
            type: 'textarea',
            required: true,
            label: 'Inputs',
            value: [
              {
                path: "m/44'/29223'/0'/0/0",
                message:
                  '000578c6c76f10156fbc7ee4a8faa7a4e92b6adadc978abf66ae70f13a03b75d36cd7a6acc0967cc9f2f632f585cb7b4297873858c23233792767fd4ae662ec1093bb13029ce7b1f559ef5e747fcac439f1455a2ec7c5f09b72290795e70665044026cad0dba749a112e0d2ea420fa68e0218453db6bb0744e44eb51edc76af8bb6871190000000000',
                prefix: 'nexa',
              },
            ],
          },
        ],
      },
    ],
  },
];

// 导出链配置对象
export const nexa: {
  api: UnifiedMethodConfig[];
  id: ChainCategory;
} = {
  id: 'nexa',
  api,
};
