import type { UnifiedMethodConfig, ChainCategory } from '../types';

const api: UnifiedMethodConfig[] = [
  {
    method: 'evmGetAddress',
    description: 'Get a EVM address for your account.',
    presets: [
      {
        title: 'Get EVM Address',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Derivation Path',
            description: 'BIP32 derivation path',
            value: "m/44'/60'/0'/0/0",
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
                  path: "m/44'/60'/0'/0/0",
                  showOnOneKey: false,
                },
                {
                  path: "m/44'/60'/0'/0/1",
                  showOnOneKey: false,
                },
                {
                  path: "m/44'/60'/0'/0/2",
                  showOnOneKey: false,
                },
                {
                  path: "m/44'/60'/0'/0/3",
                  showOnOneKey: false,
                },
                {
                  path: "m/44'/60'/0'/0/4",
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
    method: 'evmGetPublicKey',
    description: 'Get a EVM public key for your account.',
    presets: [
      {
        title: 'Get EVM Public Key',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Derivation Path',
            description: 'BIP32 derivation path',
            value: "m/44'/60'/0'/0/0",
          },
          {
            name: 'showOnOneKey',
            type: 'boolean',
            required: false,
            label: 'Show on Device',
            description: 'Display public key on OneKey device for verification',
            value: false,
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
            description: 'JSON array of public key configurations',
            value: JSON.stringify(
              [
                {
                  path: "m/44'/60'/0'/0/0",
                  showOnOneKey: false,
                },
                {
                  path: "m/44'/60'/0'/0/1",
                  showOnOneKey: false,
                },
                {
                  path: "m/44'/60'/0'/0/2",
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
    method: 'evmSignMessage',
    description: 'Sign a message with your EVM account.',
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
            value: "m/44'/60'/0'/0/0",
          },
          {
            name: 'showOnOneKey',
            type: 'boolean',
            required: false,
            label: 'Show on Device',
            description: 'Display message on OneKey device for verification',
            value: false,
          },
          {
            name: 'messageHex',
            type: 'string',
            required: true,
            label: 'Message (Hex)',
            description: 'Message to sign in hexadecimal format',
            value: '0x6578616d706c65206d657373616765',
          },
          {
            name: 'chainId',
            type: 'number',
            required: false,
            label: 'Chain ID',
            description: 'EVM chain ID',
            value: 1,
          },
        ],
      },
    ],
  },
  {
    method: 'evmSignMessageEIP712',
    description:
      'Sign a message with your EVM account. \nClassic and Mini firmware versions greater than 2.1.8 and less than 2.2.0 are available',
    deprecated: true,
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
            value: "m/44'/60'/0'/0/0",
          },
          {
            name: 'domainHash',
            type: 'string',
            required: true,
            label: 'Domain Hash',
            description: 'EIP712 domain hash',
            value: '7c872d109a4e735dc1886c72af47e9b4888a1507557e0f49c85b570019163373',
          },
          {
            name: 'messageHash',
            type: 'string',
            required: true,
            label: 'Message Hash',
            description: 'EIP712 message hash',
            value: '07bc1c4f3268fc74b60587e9bb7e01e38a7d8a9a3f51202bf25332aa2c75c644',
          },
        ],
      },
    ],
  },
  {
    method: 'evmSignTransaction',
    description: 'Sign a transaction with your EVM account.',
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
            value: "m/44'/60'/0'/0/0",
          },
          {
            name: 'transaction',
            type: 'textarea',
            required: true,
            label: 'Transaction',
            description: 'Transaction object',
            value: JSON.stringify(
              {
                to: '0x7314e0f1c0e28474bdb6be3e2c3e0453255188f8',
                value: '0xf4240',
                data: '0x00',
                chainId: 1,
                nonce: '0x0',
                gasLimit: '0x5208',
                gasPrice: '0xbebc200',
              },
              null,
              2
            ),
          },
        ],
      },
      {
        title: 'Sign Transaction(Empty data 1)',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Derivation Path',
            description: 'BIP32 derivation path',
            value: "m/44'/60'/0'/0/0",
          },
          {
            name: 'transaction',
            type: 'textarea',
            required: true,
            label: 'Transaction',
            description: 'Transaction object',
            value: JSON.stringify(
              {
                to: '0x7314e0f1c0e28474bdb6be3e2c3e0453255188f8',
                value: '0xf4240',
                data: '0x',
                chainId: 1,
                nonce: '0x0',
                gasLimit: '0x5208',
                gasPrice: '0xbebc200',
              },
              null,
              2
            ),
          },
        ],
      },
      {
        title: 'Sign Transaction(Empty data 2)',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Derivation Path',
            description: 'BIP32 derivation path',
            value: "m/44'/60'/0'/0/0",
          },
          {
            name: 'transaction',
            type: 'textarea',
            required: true,
            label: 'Transaction',
            description: 'Transaction object',
            value: JSON.stringify(
              {
                to: '0x7314e0f1c0e28474bdb6be3e2c3e0453255188f8',
                value: '0xf4240',
                data: '',
                chainId: 1,
                nonce: '0x0',
                gasLimit: '0x5208',
                gasPrice: '0xbebc200',
              },
              null,
              2
            ),
          },
        ],
      },
      {
        title: 'Sign Transaction(Send ERC20 USDC)',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Derivation Path',
            description: 'BIP32 derivation path',
            value: "m/44'/60'/0'/0/0",
          },
          {
            name: 'transaction',
            type: 'textarea',
            required: true,
            label: 'Transaction',
            description: 'Transaction object',
            value: JSON.stringify(
              {
                to: '0x7314e0f1c0e28474bdb6be3e2c3e0453255188f8',
                value: '0x0',
                data: '0xa9059cbb0000000000000000000000009755c3921b56b166876e2268e5b750ed301fe1b100000000000000000000000000000000000000000000000000000002046f78cf',
                chainId: 1,
                nonce: '0x0',
                gasLimit: '0x5208',
                gasPrice: '0xbebc200',
              },
              null,
              2
            ),
          },
        ],
      },
      {
        title: 'Sign EIP1559 Transaction',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Derivation Path',
            description: 'BIP32 derivation path',
            value: "m/44'/60'/0'/0/0",
          },
          {
            name: 'transaction',
            type: 'textarea',
            required: true,
            label: 'Transaction',
            description: 'EIP1559 transaction object',
            value: JSON.stringify(
              {
                to: '0x7314e0f1c0e28474bdb6be3e2c3e0453255188f8',
                value: '0xf4240',
                data: '0x00',
                chainId: 1,
                nonce: '0x0',
                gasLimit: '0x5208',
                maxFeePerGas: '0xbebc200',
                maxPriorityFeePerGas: '0xbebc200',
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
    method: 'evmSignTypedData',
    description: 'Sign a typed data with your EVM account.',
    presets: [
      {
        title: 'Sign Normal',
        parameters: [
          {
            name: 'path',
            type: 'string',
            required: true,
            label: 'Derivation Path',
            description: 'BIP32 derivation path',
            value: "m/44'/60'/0'/0/0",
          },
          {
            name: 'metamaskV4Compat',
            type: 'boolean',
            required: false,
            label: 'Metamask V4 Compatibility',
            description: 'Enable Metamask V4 compatibility mode',
            value: true,
          },
          {
            name: 'domainHash',
            type: 'string',
            required: true,
            label: 'Domain Hash',
            description: 'EIP712 domain hash',
            value: '7c872d109a4e735dc1886c72af47e9b4888a1507557e0f49c85b570019163373',
          },
          {
            name: 'messageHash',
            type: 'string',
            required: true,
            label: 'Message Hash',
            description: 'EIP712 message hash',
            value: '0x07bc1c4f3268fc74b60587e9bb7e01e38a7d8a9a3f51202bf25332aa2c75c644',
          },
          {
            name: 'chainId',
            type: 'number',
            required: false,
            label: 'Chain ID',
            description: 'EVM chain ID',
            value: 1,
          },
          {
            name: 'data',
            type: 'textarea',
            required: true,
            label: 'Typed Data',
            description: 'EIP712 typed data structure',
            value: JSON.stringify(
              {
                types: {
                  EIP712Domain: [
                    {
                      name: 'name',
                      type: 'string',
                    },
                  ],
                  Message: [
                    {
                      name: 'Wallet',
                      type: 'string',
                    },
                    {
                      name: 'Number',
                      type: 'uint64',
                    },
                  ],
                },
                primaryType: 'Message',
                domain: {
                  name: 'example.onekey.so',
                },
                message: {
                  Wallet: 'Onekey Touch',
                  Number: '911112119',
                },
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
    method: 'evmVerifyMessage',
    description: 'Verify a message with your EVM account.',
    presets: [
      {
        title: 'Verify Message',
        parameters: [
          {
            name: 'address',
            type: 'string',
            required: true,
            label: 'Address',
            description: 'Ethereum address that signed the message',
            value: '0xdA0b608bdb1a4A154325C854607c68950b4F1a34',
          },
          {
            name: 'messageHex',
            type: 'string',
            required: true,
            label: 'Message (Hex)',
            description: 'Original message in hexadecimal format',
            value: '4578616d706c65206d657373616765',
          },
          {
            name: 'signature',
            type: 'string',
            required: true,
            label: 'Signature',
            description: 'Message signature to verify',
            value:
              '11dc86c631ef5d9388c5e245501d571b864af1a717cbbb3ca1f6dacbf330742957242aa52b36bbe7bb46dce6ff0ead0548cc5a5ce76d0aaed166fd40cb3fc6e51c',
          },
          {
            name: 'chainId',
            type: 'number',
            required: false,
            label: 'Chain ID',
            description: 'EVM chain ID',
            value: 1,
          },
        ],
      },
    ],
  },
];

// 导出链配置对象
export const ethereum: {
  api: UnifiedMethodConfig[];
  id: ChainCategory;
} = {
  id: 'ethereum',
  api,
};
