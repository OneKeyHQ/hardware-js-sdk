import type { UnifiedMethodConfig, ChainCategory } from '../types';

const api: UnifiedMethodConfig[] = [
  {
    method: 'scdoGetAddress',

    presets: [
      {
        title: 'Get address',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,

            value: "m/44'/541'/0'/0/0",
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
                path: "m/44'/541'/0'/0/0",
                showOnOneKey: false,
              },
              {
                path: "m/44'/541'/1'/0/0",
                showOnOneKey: false,
              },
              {
                path: "m/44'/541'/2'/0/0",
                showOnOneKey: false,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    method: 'scdoSignMessage',

    presets: [
      {
        title: 'Sign Message',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,

            value: "m/44'/541'/0'/0/0",
          },
          {
            name: 'messageHex',
            type: 'string',
            label: 'Message Hex',
            value: '68656c6c6f',
          },
        ],
      },
    ],
  },
  {
    method: 'scdoSignTransaction',

    presets: [
      {
        title: 'Sign Transaction',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,

            value: "m/44'/541'/0'/0/0",
          },
          {
            name: 'nonce',
            type: 'string',
            label: 'Nonce',
            value: '0x0',
          },
          {
            name: 'gasPrice',
            type: 'string',
            label: 'Gas Price',
            value: '0xbebc200',
          },
          {
            name: 'gasLimit',
            type: 'string',
            label: 'Gas Limit',
            value: '0x5208',
          },
          {
            name: 'to',
            type: 'string',
            label: 'To',
            value: '1S0118a02f993fc7a4348fd36b7f7a596948f02b31',
          },
          {
            name: 'value',
            type: 'string',
            label: 'Value',
            value: '0xf4240',
          },
          {
            name: 'timestamp',
            type: 'string',
            label: 'Timestamp',
            value: '0',
          },
        ],
      },
    ],
  },
];

// 导出链配置对象
export const scdo: {
  api: UnifiedMethodConfig[];
  id: ChainCategory;
} = {
  id: 'scdo',
  api,
};
