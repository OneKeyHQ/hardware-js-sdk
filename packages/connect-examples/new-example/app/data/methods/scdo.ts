import type { UnifiedMethodConfig, ChainCategory } from '../types';

// 链元数据
export const chainMeta = {
  id: 'scdo',
  name: 'SCDO',
  description: 'SCDO blockchain operations',
  category: 'scdo' as ChainCategory,
};

const api: UnifiedMethodConfig[] = [
  {
    method: 'scdoGetAddress',
    description: 'Get address',
    presets: [
      {
        title: 'Get address',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Path',
            value: "m/44'/541'/0'/0/0",
          },
          {
            name: 'showOnOneKey',
            type: 'boolean',
            label: 'Show On One Key',
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
              null,
              2
            ),
          },
        ],
      },
    ],
  },
  {
    method: 'scdoSignMessage',
    description: 'Sign Message',
    presets: [
      {
        title: 'Sign Message',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Path',
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
    description: 'Sign Transaction',
    presets: [
      {
        title: 'Sign Transaction',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Path',
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

export default api;
