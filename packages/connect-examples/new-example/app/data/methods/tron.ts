import type { UnifiedMethodConfig, ChainCategory } from '../types';

const api: UnifiedMethodConfig[] = [
  {
    method: 'tronGetAddress',
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
            value: "m/44'/195'/0'/0/0",
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
                  path: "m/44'/195'/0'/0/0",
                  showOnOneKey: false,
                },
                {
                  path: "m/44'/195'/0'/0/1",
                  showOnOneKey: false,
                },
                {
                  path: "m/44'/195'/0'/0/2",
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
    method: 'tronSignTransaction',
    description: 'Sign transaction',
    presets: [
      {
        title: 'Transfer TRX',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Derivation Path',
            value: "m/44'/195'/0'/0/0",
          },
          {
            name: 'transaction',
            type: 'textarea',
            required: true,
            label: 'Transaction',
            value: JSON.stringify(
              {
                to: 'TLPpXqSGqpNBwbNnTf1hcypL7m8nLBFqzF',
                amount: 100000000,
                blockID: '0000000000aeff54ea62e7fcce1aaec4bb88d26a5ac2d1b50c92ca9b5ba5e0a7',
                blockNumber: 11468628,
                blockTimestamp: 1578057072000,
                expiration: 1578057132000,
                feeLimit: 100000000,
              },
              null,
              2
            ),
          },
        ],
      },
      {
        title: 'Transfer TRC20 Token',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Derivation Path',
            value: "m/44'/195'/0'/0/0",
          },
          {
            name: 'transaction',
            type: 'textarea',
            required: true,
            label: 'Transaction',
            value: JSON.stringify(
              {
                contractAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
                functionSelector: 'transfer(address,uint256)',
                parameter:
                  '000000000000000000000000389ffce9db8f9a637a4e6905b892b6aaa0c7c44b0000000000000000000000000000000000000000000000000de0b6b3a7640000',
                feeLimit: 100000000,
                blockID: '0000000000aeff54ea62e7fcce1aaec4bb88d26a5ac2d1b50c92ca9b5ba5e0a7',
                blockNumber: 11468628,
                blockTimestamp: 1578057072000,
                expiration: 1578057132000,
              },
              null,
              2
            ),
          },
        ],
      },
    ],
  },
  {
    method: 'tronSignMessage',
    description: 'Sign message',
    presets: [
      {
        title: 'Sign message',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Derivation Path',
            value: "m/44'/195'/0'/0/0",
          },
          {
            name: 'messageHex',
            type: 'string',
            required: true,
            label: 'Message (Hex)',
            value: '48656c6c6f20576f726c64',
          },
        ],
      },
    ],
  },
];

// 导出链配置对象
export const tron: {
  api: UnifiedMethodConfig[];
  id: ChainCategory;
} = {
  id: 'tron',
  api,
};
