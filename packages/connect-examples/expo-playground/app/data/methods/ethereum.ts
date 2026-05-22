import type { UnifiedMethodConfig, ChainCategory } from '../types';

const api: UnifiedMethodConfig[] = [
  {
    method: 'evmGetAddress',
    description: 'methodDescriptions.evmGetAddress',
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
          },
        ],
      },
    ],
  },
  {
    method: 'evmGetPublicKey',
    description: 'methodDescriptions.evmGetPublicKey',
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
            description: '',
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
            value: [
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
          },
        ],
      },
    ],
  },
  {
    method: 'evmSignMessage',
    description: 'methodDescriptions.evmSignMessage',
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
    description: 'methodDescriptions.evmSignMessageEIP712',
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
    description: 'methodDescriptions.evmSignTransaction',
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
            value: {
              to: '0x7314e0f1c0e28474bdb6be3e2c3e0453255188f8',
              value: '0xf4240',
              data: '0x00',
              chainId: 1,
              nonce: '0x0',
              gasLimit: '0x5208',
              gasPrice: '0xbebc200',
            },
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
            value: {
              to: '0x7314e0f1c0e28474bdb6be3e2c3e0453255188f8',
              value: '0xf4240',
              data: '0x',
              chainId: 1,
              nonce: '0x0',
              gasLimit: '0x5208',
              gasPrice: '0xbebc200',
            },
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
            value: {
              to: '0x7314e0f1c0e28474bdb6be3e2c3e0453255188f8',
              value: '0xf4240',
              data: '',
              chainId: 1,
              nonce: '0x0',
              gasLimit: '0x5208',
              gasPrice: '0xbebc200',
            },
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
            value: {
              to: '0x7314e0f1c0e28474bdb6be3e2c3e0453255188f8',
              value: '0x0',
              data: '0xa9059cbb0000000000000000000000009755c3921b56b166876e2268e5b750ed301fe1b100000000000000000000000000000000000000000000000000000002046f78cf',
              chainId: 1,
              nonce: '0x0',
              gasLimit: '0x5208',
              gasPrice: '0xbebc200',
            },
          },
        ],
      },
      {
        title: 'Sign Transaction(Send ERC721 NFT)',
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
            value: {
              to: '0x7314e0f1c0e28474bdb6be3e2c3e0453255188f8',
              value: '0x0000000000000068F116a894984e2DB1123eB395',
              data: '0x42842e0e0000000000000000000000007baa4e405e3fd07d361d5530e4a6180954106ee4000000000000000000000000d1464d62321c15bb73f80f9dcef7edc37acc22e40000000000000000000000000000000000000000000000000000000000000a65360c6ebe',
              chainId: 1,
              nonce: '0x0',
              gasLimit: '0x5208',
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
            label: 'Derivation Path',
            description: 'BIP32 derivation path',
            value: "m/44'/60'/0'/0/0",
          },
          {
            name: 'transaction',
            type: 'textarea',
            required: true,
            label: 'Transaction',
            description: 'Transaction object with big data',
            value: {
              to: '0x7314e0f1c0e28474bdb6be3e2c3e0453255188f8',
              value: '0xf4240',
              data: `0x${'01'.repeat(3072)}`,
              chainId: 1,
              nonce: '0x0',
              gasLimit: '0x5208',
              maxFeePerGas: '0xbebc200',
              maxPriorityFeePerGas: '0xbebc200',
            },
          },
        ],
      },
      {
        title: 'Sign Transaction (AccessList)',
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
            description: 'Legacy transaction object with access list',
            value: {
              to: '0x7314e0f1c0e28474bdb6be3e2c3e0453255188f8',
              chainId: 1,
              nonce: '0x0',
              gasLimit: '0x5208',
              gasPrice: '0xbebc200',
              value: '0x63c201797a045',
              data: '0x',
              accessList: [
                {
                  address: '0x283f227c4bd38ece252c4ae7ece650b0e913f1f9',
                  storageKeys: [
                    '0xe9fb0a90f9bd0d647017c4b86b03d6aacb2dadde129ad4e427a2779fe75f7aac',
                    '0x4288cae9cd1968c85927ae5dec536583d14e0eedd10fc9b69836385650845596',
                  ],
                },
              ],
            },
          },
        ],
      },
      {
        title: 'Sign EIP1559 Transaction(Empty data 1)',
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
            value: {
              to: '0x7314e0f1c0e28474bdb6be3e2c3e0453255188f8',
              value: '0xf4240',
              data: '0x',
              chainId: 1,
              nonce: '0x0',
              gasLimit: '0x5208',
              maxFeePerGas: '0xbebc200',
              maxPriorityFeePerGas: '0xbebc200',
            },
          },
        ],
      },
      {
        title: 'Sign EIP1559 Transaction(Empty data 2)',
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
            value: {
              to: '0x7314e0f1c0e28474bdb6be3e2c3e0453255188f8',
              value: '0xf4240',
              data: '',
              chainId: 1,
              nonce: '0x0',
              gasLimit: '0x5208',
              maxFeePerGas: '0xbebc200',
              maxPriorityFeePerGas: '0xbebc200',
            },
          },
        ],
      },
      {
        title: 'Sign EIP1559 Transaction(Send ERC20 USDC)',
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
            value: {
              to: '0x7314e0f1c0e28474bdb6be3e2c3e0453255188f8',
              value: '0x0',
              data: '0xa9059cbb0000000000000000000000009755c3921b56b166876e2268e5b750ed301fe1b100000000000000000000000000000000000000000000000000000002046f78cf',
              chainId: 1,
              nonce: '0x0',
              gasLimit: '0x5208',
              maxFeePerGas: '0xbebc200',
              maxPriorityFeePerGas: '0xbebc200',
            },
          },
        ],
      },
      {
        title: 'Sign EIP1559 Transaction(Send ERC721 NFT)',
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
            value: {
              to: '0x7314e0f1c0e28474bdb6be3e2c3e0453255188f8',
              value: '0x0000000000000068F116a894984e2DB1123eB395',
              data: '0x42842e0e0000000000000000000000007baa4e405e3fd07d361d5530e4a6180954106ee4000000000000000000000000d1464d62321c15bb73f80f9dcef7edc37acc22e40000000000000000000000000000000000000000000000000000000000000a65360c6ebe',
              chainId: 1,
              nonce: '0x0',
              gasLimit: '0x5208',
              maxFeePerGas: '0xbebc200',
              maxPriorityFeePerGas: '0xbebc200',
            },
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
            value: {
              to: '0x7314e0f1c0e28474bdb6be3e2c3e0453255188f8',
              value: '0xf4240',
              data: '0x00',
              chainId: 1,
              nonce: '0x0',
              gasLimit: '0x5208',
              maxFeePerGas: '0xbebc200',
              maxPriorityFeePerGas: '0xbebc200',
            },
          },
        ],
      },
      {
        title: 'Sign EIP1559 Transaction (Big Data)',
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
            description: 'EIP1559 transaction object with big data',
            value: {
              to: '0x7314e0f1c0e28474bdb6be3e2c3e0453255188f8',
              value: '0xf4240',
              data: `0x${'01'.repeat(3072)}`,
              chainId: 1,
              nonce: '0x0',
              gasLimit: '0x5208',
              maxFeePerGas: '0xbebc200',
              maxPriorityFeePerGas: '0xbebc200',
            },
          },
        ],
      },
      {
        title: 'Sign Transaction EIP1559 (AccessList)',
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
            description: 'EIP1559 transaction object with access list',
            value: {
              to: '0x7314e0f1c0e28474bdb6be3e2c3e0453255188f8',
              chainId: 1,
              nonce: '0x0',
              gasLimit: '0x5208',
              maxFeePerGas: '0xbebc200',
              maxPriorityFeePerGas: '0x9502f900',
              value: '0x63c201797a045',
              data: '0x',
              accessList: [
                {
                  address: '0x283f227c4bd38ece252c4ae7ece650b0e913f1f9',
                  storageKeys: [
                    '0xe9fb0a90f9bd0d647017c4b86b03d6aacb2dadde129ad4e427a2779fe75f7aac',
                    '0x4288cae9cd1968c85927ae5dec536583d14e0eedd10fc9b69836385650845596',
                  ],
                },
              ],
            },
          },
        ],
      },
      {
        title: 'EIP-7702 Simple7702Account',
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
            description: 'EIP7702 transaction with Simple7702Account contract',
            value: {
              to: '0x4Cd241E8d1510e30b2076397afc7508Ae59C66c9',
              value: '0x0',
              data: '0x', // empty data for code authorization only
              chainId: 1,
              nonce: '0x0',
              gasLimit: '0x5208',
              maxFeePerGas: '0xbebc200',
              maxPriorityFeePerGas: '0x9502f900',
              accessList: [],
              authorizationList: [
                {
                  chainId: 1,
                  address: '0x4Cd241E8d1510e30b2076397afc7508Ae59C66c9',
                  nonce: '0x1',
                },
              ],
            },
          },
        ],
      },
      {
        title: 'EIP-7702 MetaMask Account',
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
            description: 'EIP7702 transaction with MetaMask account contract',
            value: {
              to: '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B',
              value: '0x0',
              data: '0x', // empty data for code authorization only
              chainId: 1,
              nonce: '0x1',
              gasLimit: '0x5208',
              maxFeePerGas: '0xbebc200',
              maxPriorityFeePerGas: '0x9502f900',
              accessList: [],
              authorizationList: [
                {
                  chainId: 1,
                  address: '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B',
                  nonce: '0x2',
                },
              ],
            },
          },
        ],
      },
      {
        title: 'EIP-7702 OKX WalletCore',
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
            description: 'EIP7702 transaction with OKX WalletCore contract',
            value: {
              to: '0x80296FF8D1ED46f8e3C7992664D13B833504c2Bb',
              value: '0x0',
              data: '0x8129fc1c', // initialize() function
              chainId: 1,
              nonce: '0x2',
              gasLimit: '0x5208',
              maxFeePerGas: '0xbebc200',
              maxPriorityFeePerGas: '0x9502f900',
              accessList: [],
              authorizationList: [
                {
                  chainId: 1,
                  address: '0x80296FF8D1ED46f8e3C7992664D13B833504c2Bb',
                  nonce: '0x3',
                },
              ],
            },
          },
        ],
      },
      {
        title: 'EIP-7702 Revoke Authorization',
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
            description: 'EIP7702 transaction to revoke authorization (zero address)',
            value: {
              to: '0x0000000000000000000000000000000000000000',
              value: '0x0',
              data: '0x', // empty data for revoke
              chainId: 1,
              nonce: '0x3',
              gasLimit: '0x5208',
              maxFeePerGas: '0xbebc200',
              maxPriorityFeePerGas: '0x9502f900',
              accessList: [],
              authorizationList: [
                {
                  chainId: 1,
                  address: '0x0000000000000000000000000000000000000000',
                  nonce: '0x4',
                },
              ],
            },
          },
        ],
      },
      {
        title: 'EIP-7702 Additional Authorization',
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
            description: 'EIP7702 transaction with additional authorization',
            value: {
              to: '0x4Cd241E8d1510e30b2076397afc7508Ae59C66c9',
              value: '0x0',
              data: '0x',
              chainId: 1,
              nonce: '0x5',
              gasLimit: '0x7530',
              maxFeePerGas: '0xbebc200',
              maxPriorityFeePerGas: '0x9502f900',
              accessList: [],
              authorizationList: [
                {
                  chainId: 1,
                  address: '0x4Cd241E8d1510e30b2076397afc7508Ae59C66c9',
                  nonce: '0x5',
                },
              ],
            },
          },
        ],
      },
      {
        title: 'EIP-7702 With Pre-signed Authorization (Flattened)',
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
            description:
              'EIP7702 transaction with pre-signed authorization using flattened yParity,r,s structure',
            value: {
              to: '0x4Cd241E8d1510e30b2076397afc7508Ae59C66c9',
              value: '0x0',
              data: '0x', // empty data for authorization only
              chainId: 1,
              nonce: '0x5',
              gasLimit: '0x7530',
              maxFeePerGas: '0xbebc200',
              maxPriorityFeePerGas: '0x9502f900',
              accessList: [],
              authorizationList: [
                {
                  chainId: 1,
                  address: '0x4Cd241E8d1510e30b2076397afc7508Ae59C66c9',
                  nonce: '0x5',
                  yParity: 0,
                  r: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
                  s: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
                },
              ],
            },
          },
        ],
      },
    ],
  },
  {
    method: 'evmSignTypedData',
    description: 'methodDescriptions.evmSignTypedData',
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
            value: {
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
          },
        ],
      },
      {
        title: 'Sign Bigger data',
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
            name: 'data',
            type: 'textarea',
            required: true,
            label: 'Typed Data',
            description: 'EIP712 typed data structure',
            value: {
              domain: {
                name: 'Franklin',
                version: '0.0.1',
                chainId: 1,
                verifyingContract: '0x0000000000000000000000000000000000000000',
              },
              primaryType: 'ForwardRequest',
              types: {
                EIP712Domain: [
                  { name: 'name', type: 'string' },
                  { name: 'version', type: 'string' },
                  { name: 'chainId', type: 'uint256' },
                  { name: 'verifyingContract', type: 'address' },
                ],
                ForwardRequest: [
                  { name: 'from', type: 'address' },
                  { name: 'to', type: 'address' },
                  { name: 'value', type: 'uint256' },
                  { name: 'gas', type: 'uint256' },
                  { name: 'nonce', type: 'uint256' },
                  { name: 'data', type: 'bytes' },
                ],
                VerifyWallet: [{ name: 'contents', type: 'string' }],
              },
              message: {
                from: '0x0000000000000000000000000000000000000000',
                to: '0x0000000000000000000000000000000000000000',
                value: 0,
                gas: 275755,
                nonce: 3,
                data: `0x${'01'.repeat(3072)}`,
              },
            },
          },
          {
            name: 'domainHash',
            type: 'string',
            required: true,
            label: 'Domain Hash',
            description: 'EIP712 domain hash',
            value: 'e1630040b43761d37578b947e7036afbc20d84c81af8d781275e318f080cc9f9',
          },
          {
            name: 'messageHash',
            type: 'string',
            required: true,
            label: 'Message Hash',
            description: 'EIP712 message hash',
            value: '182a9c8090b0facb90c403825fd01a144ce8d0152a8ad785be33e9f8884bd0f5',
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
            name: 'useEmptyPassphrase',
            type: 'boolean',
            required: false,
            label: 'Use Empty Passphrase',
            description: 'Use empty passphrase for signing',
            value: true,
          },
          {
            name: 'connectId',
            type: 'string',
            required: false,
            label: 'Connect ID',
            description: 'Device connection ID',
            value: 'TC01WBD202303160742560002553',
          },
          {
            name: 'deviceId',
            type: 'string',
            required: false,
            label: 'Device ID',
            description: 'Hardware device ID',
            value: '91CC3D3EDFE355DE7619148C',
          },
          {
            name: 'method',
            type: 'string',
            required: false,
            label: 'Method',
            description: 'Method name',
            value: 'evmSignTypedData',
          },
        ],
      },
      {
        title: 'Sign Normal (Mini parsed capability)',
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
            value: true,
          },
          {
            name: 'domainHash',
            type: 'string',
            value: '0x1a7d32d5c8bc7642896c6b5e4d9d0b5b31c4ae4d1400d3c4a861e5d3cc4f1101',
          },
          {
            name: 'messageHash',
            type: 'string',
            value: '0x2bd59f0cb70845baf6b36b29f0db1d54a1f146db41b8e3ddfc0ef5a3d54ef102',
          },
          {
            name: 'chainId',
            type: 'number',
            value: 1,
          },
          {
            name: 'data',
            type: 'textarea',
            value: {
              types: {
                EIP712Domain: [{ name: 'name', type: 'string' }],
                WalletProfile: [
                  { name: 'walletName', type: 'string' },
                  { name: 'memberCount', type: 'uint64' },
                ],
              },
              primaryType: 'WalletProfile',
              domain: {
                name: 'mini.parsed.example',
              },
              message: {
                walletName: 'OneKey Mini',
                memberCount: '3',
              },
            },
          },
        ],
      },
      {
        title: 'Blind Sign (Mini parsed capability, >16 struct fields)',
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
            value: true,
          },
          {
            name: 'domainHash',
            type: 'string',
            value: '0x3c0a11222f6d2526648531f5f801c9a4f58e53ce8c29c293b0dfdb9e58ab2203',
          },
          {
            name: 'messageHash',
            type: 'string',
            value: '0x4f7ae317286be7b19d1f9c4e4103b754d4d5b2f422f5d35308d1ec847ef43204',
          },
          {
            name: 'chainId',
            type: 'number',
            value: 1,
          },
          {
            name: 'data',
            type: 'textarea',
            value: {
              types: {
                EIP712Domain: [{ name: 'name', type: 'string' }],
                BigStruct: [
                  { name: 'field01', type: 'uint256' },
                  { name: 'field02', type: 'uint256' },
                  { name: 'field03', type: 'uint256' },
                  { name: 'field04', type: 'uint256' },
                  { name: 'field05', type: 'uint256' },
                  { name: 'field06', type: 'uint256' },
                  { name: 'field07', type: 'uint256' },
                  { name: 'field08', type: 'uint256' },
                  { name: 'field09', type: 'uint256' },
                  { name: 'field10', type: 'uint256' },
                  { name: 'field11', type: 'uint256' },
                  { name: 'field12', type: 'uint256' },
                  { name: 'field13', type: 'uint256' },
                  { name: 'field14', type: 'uint256' },
                  { name: 'field15', type: 'uint256' },
                  { name: 'field16', type: 'uint256' },
                  { name: 'field17', type: 'uint256' },
                ],
              },
              primaryType: 'BigStruct',
              domain: {
                name: 'mini.blind.max-fields',
              },
              message: {
                field01: '1',
                field02: '2',
                field03: '3',
                field04: '4',
                field05: '5',
                field06: '6',
                field07: '7',
                field08: '8',
                field09: '9',
                field10: '10',
                field11: '11',
                field12: '12',
                field13: '13',
                field14: '14',
                field15: '15',
                field16: '16',
                field17: '17',
              },
            },
          },
        ],
      },
      {
        title: 'Blind Sign (Mini parsed capability, string >1536 bytes)',
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
            value: true,
          },
          {
            name: 'domainHash',
            type: 'string',
            value: '0x5ad2f0c59b9f517d064614bcb5fd8f207e1aa0b13dc45942c1791003ca2b3305',
          },
          {
            name: 'messageHash',
            type: 'string',
            value: '0x6ce32e7c80db5cfd4b1eb7bb38701fd9bd92bb73a70f0d2a95e05af01d4c4406',
          },
          {
            name: 'chainId',
            type: 'number',
            value: 1,
          },
          {
            name: 'data',
            type: 'textarea',
            value: {
              types: {
                EIP712Domain: [{ name: 'name', type: 'string' }],
                LongNote: [{ name: 'note', type: 'string' }],
              },
              primaryType: 'LongNote',
              domain: {
                name: 'mini.blind.long-note',
              },
              message: {
                note: `${'OneKeyMini'.repeat(154)}`,
              },
            },
          },
        ],
      },
      {
        title: 'Blind Sign (Mini parsed capability, MetaMask v4 struct array >24)',
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
            value: true,
          },
          {
            name: 'domainHash',
            type: 'string',
            value: '0x7d1a15c6280d2018738d78fce9b50581b67d62047bdbcd03f59060f4505d5507',
          },
          {
            name: 'messageHash',
            type: 'string',
            value: '0x8eb8d73477aa18dbede5dd58e4fd500f57057b0fd7b5ff86ed438dcf61ae6608',
          },
          {
            name: 'chainId',
            type: 'number',
            value: 1,
          },
          {
            name: 'data',
            type: 'textarea',
            value: {
              types: {
                EIP712Domain: [{ name: 'name', type: 'string' }],
                Member: [{ name: 'name', type: 'string' }],
                Team: [{ name: 'members', type: 'Member[]' }],
              },
              primaryType: 'Team',
              domain: {
                name: 'mini.blind.member-array',
              },
              message: {
                members: [
                  { name: 'member-01' },
                  { name: 'member-02' },
                  { name: 'member-03' },
                  { name: 'member-04' },
                  { name: 'member-05' },
                  { name: 'member-06' },
                  { name: 'member-07' },
                  { name: 'member-08' },
                  { name: 'member-09' },
                  { name: 'member-10' },
                  { name: 'member-11' },
                  { name: 'member-12' },
                  { name: 'member-13' },
                  { name: 'member-14' },
                  { name: 'member-15' },
                  { name: 'member-16' },
                  { name: 'member-17' },
                  { name: 'member-18' },
                  { name: 'member-19' },
                  { name: 'member-20' },
                  { name: 'member-21' },
                  { name: 'member-22' },
                  { name: 'member-23' },
                  { name: 'member-24' },
                  { name: 'member-25' },
                ],
              },
            },
          },
        ],
      },
      {
        title: 'Sign Nested array',
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
            value: '276bc64a43ff20d362b6c982bc21d1f83716496363478990aa0bbaa99044923a',
          },
          {
            name: 'messageHash',
            type: 'string',
            required: true,
            label: 'Message Hash',
            description: 'EIP712 message hash',
            value: 'f8d0b2b47784324fed641b26f594e164d78a7e53fd6b3c9db099ab5cbfa9fa30',
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
            description: 'EIP712 typed data structure with nested arrays',
            value: {
              types: {
                EIP712Domain: [{ name: 'name', type: 'string' }],
                NestedArray: [{ name: 'items', type: 'SingleItem[2]' }],
                SingleItem: [
                  { name: 'id', type: 'uint256' },
                  { name: 'value', type: 'string' },
                ],
              },
              primaryType: 'NestedArray',
              domain: {
                name: 'NestedArrayTest',
              },
              message: {
                nestedItems: [
                  [
                    {
                      items: [
                        { id: 1, value: 'Item1-1' },
                        { id: 2, value: 'Item1-2' },
                      ],
                    },
                    {
                      items: [
                        { id: 3, value: 'Item2-1' },
                        { id: 4, value: 'Item2-2' },
                      ],
                    },
                  ],
                  [
                    {
                      items: [
                        { id: 5, value: 'Item3-1' },
                        { id: 6, value: 'Item3-2' },
                      ],
                    },
                    {
                      items: [
                        { id: 7, value: 'Item4-1' },
                        { id: 8, value: 'Item4-2' },
                      ],
                    },
                  ],
                ],
              },
            },
          },
        ],
      },
      {
        title: 'Sign Gnosis Safe Tx',
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
            name: 'data',
            type: 'textarea',
            required: true,
            label: 'Typed Data',
            description: 'Gnosis Safe transaction typed data',
            value: {
              types: {
                SafeTx: [
                  { name: 'to', type: 'address' },
                  { name: 'value', type: 'uint256' },
                  { name: 'data', type: 'bytes' },
                  { name: 'operation', type: 'uint8' },
                  { name: 'safeTxGas', type: 'uint256' },
                  { name: 'baseGas', type: 'uint256' },
                  { name: 'gasPrice', type: 'uint256' },
                  { name: 'gasToken', type: 'address' },
                  { name: 'refundReceiver', type: 'address' },
                  { name: 'nonce', type: 'uint256' },
                ],
                EIP712Domain: [
                  { name: 'chainId', type: 'uint256' },
                  { name: 'verifyingContract', type: 'address' },
                ],
              },
              domain: {
                chainId: '0x1',
                verifyingContract: '0x673f21761c5400531a37554a602fe0407addd0dd',
              },
              primaryType: 'SafeTx',
              message: {
                to: '0x5618207d27d78f09f61a5d92190d58c453feb4b7',
                value: '10000000000000',
                data: '0x',
                operation: '0',
                safeTxGas: '0',
                baseGas: '0',
                gasPrice: '0',
                gasToken: '0x0000000000000000000000000000000000000000',
                refundReceiver: '0x0000000000000000000000000000000000000000',
                nonce: '0',
              },
            },
          },
        ],
      },
      {
        title: 'Sign Gnosis Safe Tx(ChainId: 10 进制)',
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
            value: '9e4b8f7c6d5e4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b',
          },
          {
            name: 'messageHash',
            type: 'string',
            value: '5af73f1c5230924b60ba2c00e31ad5a5a5e6b7a45c9b93b5e2fa5c90e616e2f3',
          },
          {
            name: 'data',
            type: 'textarea',
            required: true,
            label: 'Typed Data',
            description: 'Gnosis Safe transaction typed data with decimal chain ID',
            value: {
              types: {
                SafeTx: [
                  { name: 'to', type: 'address' },
                  { name: 'value', type: 'uint256' },
                  { name: 'data', type: 'bytes' },
                  { name: 'operation', type: 'uint8' },
                  { name: 'safeTxGas', type: 'uint256' },
                  { name: 'baseGas', type: 'uint256' },
                  { name: 'gasPrice', type: 'uint256' },
                  { name: 'gasToken', type: 'address' },
                  { name: 'refundReceiver', type: 'address' },
                  { name: 'nonce', type: 'uint256' },
                ],
                EIP712Domain: [
                  { name: 'chainId', type: 'uint256' },
                  { name: 'verifyingContract', type: 'address' },
                ],
              },
              domain: {
                chainId: '311',
                verifyingContract: '0x673f21761c5400531a37554a602fe0407addd0dd',
              },
              primaryType: 'SafeTx',
              message: {
                to: '0x5618207d27d78f09f61a5d92190d58c453feb4b7',
                value: '10000000000000',
                data: '0x',
                operation: '0',
                safeTxGas: '0',
                baseGas: '0',
                gasPrice: '0',
                gasToken: '0x0000000000000000000000000000000000000000',
                refundReceiver: '0x0000000000000000000000000000000000000000',
                nonce: '0',
              },
            },
          },
        ],
      },
      {
        title: 'Sign Gnosis Safe Tx(Danger)',
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
            name: 'data',
            type: 'textarea',
            required: true,
            label: 'Typed Data',
            description: 'Gnosis Safe transaction typed data (dangerous operation)',
            value: {
              types: {
                SafeTx: [
                  { name: 'to', type: 'address' },
                  { name: 'value', type: 'uint256' },
                  { name: 'data', type: 'bytes' },
                  { name: 'operation', type: 'uint8' },
                  { name: 'safeTxGas', type: 'uint256' },
                  { name: 'baseGas', type: 'uint256' },
                  { name: 'gasPrice', type: 'uint256' },
                  { name: 'gasToken', type: 'address' },
                  { name: 'refundReceiver', type: 'address' },
                  { name: 'nonce', type: 'uint256' },
                ],
                EIP712Domain: [
                  { name: 'chainId', type: 'uint256' },
                  { name: 'verifyingContract', type: 'address' },
                ],
              },
              domain: {
                chainId: '0x1',
                verifyingContract: '0x673f21761c5400531a37554a602fe0407addd0dd',
              },
              primaryType: 'SafeTx',
              message: {
                to: '0x5618207d27d78f09f61a5d92190d58c453feb4b7',
                value: '10000000000000',
                data: '0x',
                operation: '1',
                safeTxGas: '0',
                baseGas: '0',
                gasPrice: '0',
                gasToken: '0x0000000000000000000000000000000000000000',
                refundReceiver: '0x0000000000000000000000000000000000000000',
                nonce: '0',
              },
            },
          },
        ],
      },
    ],
  },
  {
    method: 'evmVerifyMessage',
    description: 'methodDescriptions.evmVerifyMessage',
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
