import type { UnifiedMethodConfig, ChainCategory } from '../types';

const api: UnifiedMethodConfig[] = [
  {
    method: 'confluxGetAddress',

    presets: [
      {
        title: 'Get address',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,

            value: "m/44'/503'/0'/0/0",
          },
          {
            name: 'chainId',
            type: 'number',
            label: 'Chain Id',
            value: 1029,
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
                path: "m/44'/503'/0'/0/0",
                chainId: 1029,
                showOnOneKey: false,
              },
              {
                path: "m/44'/503'/0'/0/1",
                chainId: 1029,
                showOnOneKey: false,
              },
              {
                path: "m/44'/503'/0'/0/2",
                chainId: 1029,
                showOnOneKey: false,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    method: 'confluxSignMessage',

    presets: [
      {
        title: 'Sign Message',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,

            value: "m/44'/503'/0'/0/0",
          },
          {
            name: 'messageHex',
            type: 'string',
            label: 'Message Hex',
            value: '0x6578616d706c65206d657373616765',
          },
        ],
      },
    ],
  },
  {
    method: 'confluxSignMessageCIP23',
    description: 'methodDescriptions.confluxSignMessageCIP23',
    presets: [
      {
        title: 'Sign Message',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,

            value: "m/44'/503'/0'/0/0",
          },
          {
            name: 'domainHash',
            type: 'string',
            label: 'Domain Hash',
            value: '7c872d109a4e735dc1886c72af47e9b4888a1507557e0f49c85b570019163373',
          },
          {
            name: 'messageHash',
            type: 'string',
            label: 'Message Hash',
            value: '0x07bc1c4f3268fc74b60587e9bb7e01e38a7d8a9a3f51202bf25332aa2c75c644',
          },
        ],
      },
    ],
  },
  {
    method: 'confluxSignTransaction',

    presets: [
      {
        title: 'Sign Transaction',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,

            value: "m/44'/503'/0'/0/0",
          },
          {
            name: 'transaction',
            type: 'textarea',
            required: true,
            label: 'Transaction',
            description: 'Transaction object to sign',
            value: {
              to: 'cfx:aak2rra2njvd77ezwjvx04kkds9fzagfe6ku8scz91',
              value: '0x0',
              data: '0x',
              chainId: 1,
              nonce: '0x00',
              epochHeight: '0x00',
              gasLimit: '0x5208',
              storageLimit: '0x5208',
              gasPrice: '0xbebc200',
            },
          },
        ],
      },
      {
        title: 'Sign Transaction (Big Data)',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,

            value: "m/44'/503'/0'/0/0",
          },
          {
            name: 'transaction',
            type: 'textarea',
            required: true,
            label: 'Transaction',
            description: 'Transaction object with large data payload',
            value: {
              to: 'cfx:aak2rra2njvd77ezwjvx04kkds9fzagfe6ku8scz91',
              value: '0x0',
              data: '0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
              chainId: 1,
              nonce: '0x00',
              epochHeight: '0x00',
              gasLimit: '0x5208',
              storageLimit: '0x5208',
              gasPrice: '0xbebc200',
            },
          },
        ],
      },
    ],
  },
];

// 导出链配置对象
export const conflux: {
  api: UnifiedMethodConfig[];
  id: ChainCategory;
} = {
  id: 'conflux',
  api,
};
