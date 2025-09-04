import { type PlaygroundProps } from '../components/Playground';

const api: PlaygroundProps[] = [
  {
    method: 'evmGetAddress',
    description: 'Get a EVM address for your account.',
    presupposes: [
      {
        title: 'Get EVM Address',
        value: {
          path: "m/44'/60'/0'/0/0",
          showOnOneKey: false,
        },
      },
      {
        title: 'Batch Get Address',
        value: {
          bundle: [
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
      },
    ],
  },
  {
    method: 'evmGetPublicKey',
    description: 'Get a EVM public key for your account.',
    presupposes: [
      {
        title: 'Get EVM Public Key',
        value: {
          path: "m/44'/60'/0'/0/0",
          showOnOneKey: false,
        },
      },
      {
        title: 'Batch Get Public Key',
        value: {
          bundle: [
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
      },
    ],
  },
  {
    method: 'evmSignMessage',
    description: 'Sign a message with your EVM account.',
    presupposes: [
      {
        title: 'Sign Message',
        value: {
          path: "m/44'/60'/0'/0/0",
          showOnOneKey: false,
          messageHex: '0x6578616d706c65206d657373616765',
          chainId: 1,
        },
      },
    ],
  },
  {
    method: 'evmSignMessageEIP712',
    description:
      'Sign a message with your EVM account. \nClassic and Mini firmware versions greater than 2.1.8 and less than 2.2.0 are available',
    presupposes: [
      {
        title: 'Sign Message',
        value: {
          path: "m/44'/60'/0'/0/0",
          domainHash: '7c872d109a4e735dc1886c72af47e9b4888a1507557e0f49c85b570019163373',
          messageHash: '07bc1c4f3268fc74b60587e9bb7e01e38a7d8a9a3f51202bf25332aa2c75c644',
        },
      },
    ],
    deprecated: true,
  },
  {
    method: 'evmSignTransaction',
    description: 'Sign a transaction with your EVM account.',
    presupposes: [
      {
        title: 'Sign Transaction',
        value: {
          path: "m/44'/60'/0'/0/0",
          transaction: {
            to: '0x7314e0f1c0e28474bdb6be3e2c3e0453255188f8',
            value: '0xf4240',
            data: '0x00',
            chainId: 1,
            nonce: '0x0',
            gasLimit: '0x5208',
            gasPrice: '0xbebc200',
          },
        },
      },
      {
        title: 'Sign Transaction(Empty data 1)',
        value: {
          path: "m/44'/60'/0'/0/0",
          transaction: {
            to: '0x7314e0f1c0e28474bdb6be3e2c3e0453255188f8',
            value: '0xf4240',
            data: '0x',
            chainId: 1,
            nonce: '0x0',
            gasLimit: '0x5208',
            gasPrice: '0xbebc200',
          },
        },
      },
      {
        title: 'Sign Transaction(Empty data 2)',
        value: {
          path: "m/44'/60'/0'/0/0",
          transaction: {
            to: '0x7314e0f1c0e28474bdb6be3e2c3e0453255188f8',
            value: '0xf4240',
            data: '',
            chainId: 1,
            nonce: '0x0',
            gasLimit: '0x5208',
            gasPrice: '0xbebc200',
          },
        },
      },
      {
        title: 'Sign Transaction(Send ERC20 USDC)',
        value: {
          path: "m/44'/60'/0'/0/0",
          transaction: {
            to: '0x7314e0f1c0e28474bdb6be3e2c3e0453255188f8',
            value: '0x0',
            data: '0xa9059cbb0000000000000000000000009755c3921b56b166876e2268e5b750ed301fe1b100000000000000000000000000000000000000000000000000000002046f78cf',
            chainId: 1,
            nonce: '0x0',
            gasLimit: '0x5208',
            gasPrice: '0xbebc200',
          },
        },
      },
      {
        title: 'Sign Transaction(Send ERC721 NFT)',
        value: {
          path: "m/44'/60'/0'/0/0",
          transaction: {
            to: '0x7314e0f1c0e28474bdb6be3e2c3e0453255188f8',
            value: '0x0000000000000068F116a894984e2DB1123eB395',
            data: '0x42842e0e0000000000000000000000007baa4e405e3fd07d361d5530e4a6180954106ee4000000000000000000000000d1464d62321c15bb73f80f9dcef7edc37acc22e40000000000000000000000000000000000000000000000000000000000000a65360c6ebe',
            chainId: 1,
            nonce: '0x0',
            gasLimit: '0x5208',
            gasPrice: '0xbebc200',
          },
        },
      },
      {
        title: 'Sign Transaction (Big Data)',
        value: {
          path: "m/44'/60'/0'/0/0",
          transaction: {
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
      },
      {
        title: 'Sign EIP1559 Transaction(Empty data 1)',
        value: {
          path: "m/44'/60'/0'/0/0",
          transaction: {
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
      },
      {
        title: 'Sign EIP1559 Transaction(Empty data 2)',
        value: {
          path: "m/44'/60'/0'/0/0",
          transaction: {
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
      },
      {
        title: 'Sign EIP1559 Transaction(Send ERC20 USDC)',
        value: {
          path: "m/44'/60'/0'/0/0",
          transaction: {
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
      },
      {
        title: 'Sign EIP1559 Transaction(Send ERC721 NFT)',
        value: {
          path: "m/44'/60'/0'/0/0",
          transaction: {
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
      },
      {
        title: 'Sign EIP1559 Transaction',
        value: {
          path: "m/44'/60'/0'/0/0",
          transaction: {
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
      },
      {
        title: 'Sign EIP1559 Transaction (Big Data)',
        value: {
          path: "m/44'/60'/0'/0/0",
          transaction: {
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
      },
      {
        title: 'EIP-7702 Simple7702Account',
        value: {
          path: "m/44'/60'/0'/0/0",
          transaction: {
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
      },
      {
        title: 'EIP-7702 MetaMask Account',
        value: {
          path: "m/44'/60'/0'/0/0",
          transaction: {
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
      },
      {
        title: 'EIP-7702 OKX WalletCore',
        value: {
          path: "m/44'/60'/0'/0/0",
          transaction: {
            to: '0x80296FF8D1ED46f8e3C7992664D13B833504c2Bb',
            value: '0x0',
            data: '0x8129fc1c', // initialize() function selector
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
      },
      {
        title: 'EIP-7702 Revoke Authorization',
        value: {
          path: "m/44'/60'/0'/0/0",
          transaction: {
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
      },
      {
        title: 'EIP-7702 With Pre-signed Authorization (Flattened Structure)',
        value: {
          path: "m/44'/60'/0'/0/0",
          transaction: {
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
                r: '0x7f209007aa8d29b5fb1c6cc2667e7cf10004ce251303621dea9ea36820abcdef',
                s: '0x1594e46e321822ae718a12ad4ee0d249a93e24b134ba5379bd038368a7f51cad',
              },
            ],
          },
        },
      },
    ],
  },
  {
    method: 'evmSignTypedData',
    description: 'Sign a typed data with your EVM account.',
    presupposes: [
      {
        title: 'Sign Normal',
        value: {
          path: "m/44'/60'/0'/0/0",
          metamaskV4Compat: true,
          domainHash: '7c872d109a4e735dc1886c72af47e9b4888a1507557e0f49c85b570019163373',
          messageHash: '0x07bc1c4f3268fc74b60587e9bb7e01e38a7d8a9a3f51202bf25332aa2c75c644',
          chainId: 1,
          data: {
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
      },
      {
        title: 'Sign Bigger data',
        value: {
          path: "m/44'/60'/0'/0/0",
          metamaskV4Compat: true,
          data: {
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
          domainHash: 'e1630040b43761d37578b947e7036afbc20d84c81af8d781275e318f080cc9f9',
          messageHash: '182a9c8090b0facb90c403825fd01a144ce8d0152a8ad785be33e9f8884bd0f5',
          chainId: 1,
          useEmptyPassphrase: true,
          connectId: 'TC01WBD202303160742560002553',
          deviceId: '91CC3D3EDFE355DE7619148C',
          method: 'evmSignTypedData',
        },
      },
      {
        title: 'Sign Nested array',
        value: {
          path: "m/44'/60'/0'/0/0",
          metamaskV4Compat: true,
          domainHash: '276bc64a43ff20d362b6c982bc21d1f83716496363478990aa0bbaa99044923a',
          messageHash: 'f8d0b2b47784324fed641b26f594e164d78a7e53fd6b3c9db099ab5cbfa9fa30',
          chainId: 1,
          data: {
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
      },
      {
        title: 'Sign Gnosis Safe Tx',
        value: {
          path: "m/44'/60'/0'/0/0",
          domainHash: '8d3fd2ba3e47fb69ebeb3f94a96b03f99f43c2aa8e3e969bb8eec2a5e53f96b4',
          messageHash: '5af73f1c5230924b60ba2c00e31ad5a5a5e6b7a45c9b93b5e2fa5c90e616e2f3',
          data: {
            types: {
              SafeTx: [
                {
                  name: 'to',
                  type: 'address',
                },
                {
                  name: 'value',
                  type: 'uint256',
                },
                {
                  name: 'data',
                  type: 'bytes',
                },
                {
                  name: 'operation',
                  type: 'uint8',
                },
                {
                  name: 'safeTxGas',
                  type: 'uint256',
                },
                {
                  name: 'baseGas',
                  type: 'uint256',
                },
                {
                  name: 'gasPrice',
                  type: 'uint256',
                },
                {
                  name: 'gasToken',
                  type: 'address',
                },
                {
                  name: 'refundReceiver',
                  type: 'address',
                },
                {
                  name: 'nonce',
                  type: 'uint256',
                },
              ],
              EIP712Domain: [
                {
                  name: 'chainId',
                  type: 'uint256',
                },
                {
                  name: 'verifyingContract',
                  type: 'address',
                },
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
      },
      {
        title: 'Sign Gnosis Safe Tx(ChainId: 10 进制)',
        value: {
          path: "m/44'/60'/0'/0/0",
          domainHash: '9e4b8f7c6d5e4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b',
          messageHash: '5af73f1c5230924b60ba2c00e31ad5a5a5e6b7a45c9b93b5e2fa5c90e616e2f3',
          data: {
            types: {
              SafeTx: [
                {
                  name: 'to',
                  type: 'address',
                },
                {
                  name: 'value',
                  type: 'uint256',
                },
                {
                  name: 'data',
                  type: 'bytes',
                },
                {
                  name: 'operation',
                  type: 'uint8',
                },
                {
                  name: 'safeTxGas',
                  type: 'uint256',
                },
                {
                  name: 'baseGas',
                  type: 'uint256',
                },
                {
                  name: 'gasPrice',
                  type: 'uint256',
                },
                {
                  name: 'gasToken',
                  type: 'address',
                },
                {
                  name: 'refundReceiver',
                  type: 'address',
                },
                {
                  name: 'nonce',
                  type: 'uint256',
                },
              ],
              EIP712Domain: [
                {
                  name: 'chainId',
                  type: 'uint256',
                },
                {
                  name: 'verifyingContract',
                  type: 'address',
                },
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
      },
      {
        title: 'Sign Gnosis Safe Tx(Danger)',
        value: {
          path: "m/44'/60'/0'/0/0",
          domainHash: '9e4b8f7c6d5e4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b',
          messageHash: '8f7c5e4d3b2a1c9e8d7f6b5a4e3c2d1b9a8f7e6d5c4b3a2e1d9c8b7f6a5e4d',
          data: {
            types: {
              SafeTx: [
                {
                  name: 'to',
                  type: 'address',
                },
                {
                  name: 'value',
                  type: 'uint256',
                },
                {
                  name: 'data',
                  type: 'bytes',
                },
                {
                  name: 'operation',
                  type: 'uint8',
                },
                {
                  name: 'safeTxGas',
                  type: 'uint256',
                },
                {
                  name: 'baseGas',
                  type: 'uint256',
                },
                {
                  name: 'gasPrice',
                  type: 'uint256',
                },
                {
                  name: 'gasToken',
                  type: 'address',
                },
                {
                  name: 'refundReceiver',
                  type: 'address',
                },
                {
                  name: 'nonce',
                  type: 'uint256',
                },
              ],
              EIP712Domain: [
                {
                  name: 'chainId',
                  type: 'uint256',
                },
                {
                  name: 'verifyingContract',
                  type: 'address',
                },
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
      },
    ],
  },
  {
    method: 'evmVerifyMessage',
    description: 'Verify a message with your EVM account.',
    presupposes: [
      {
        title: 'Verify Message',
        value: {
          address: '0xdA0b608bdb1a4A154325C854607c68950b4F1a34',
          messageHex: '4578616d706c65206d657373616765',
          signature:
            '11dc86c631ef5d9388c5e245501d571b864af1a717cbbb3ca1f6dacbf330742957242aa52b36bbe7bb46dce6ff0ead0548cc5a5ce76d0aaed166fd40cb3fc6e51c',
          chainId: 1,
        },
      },
    ],
  },
];

export default api;
