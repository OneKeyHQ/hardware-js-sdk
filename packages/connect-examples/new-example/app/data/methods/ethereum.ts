import { type PlaygroundProps } from '../components/Playground';
import type { ChainCategory } from "../types";


// 链元数据
export const chainMeta = {
  id: "ethereum",
  name: "Ethereum",
  description: "Ethereum and EVM-compatible chains",
  icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.999 0L7.06 12.188l4.939 2.274 4.94-2.274L11.999 0z" fill="#627EEA"/><path d="M11.999 24l4.94-6.838-4.94-2.274-4.939 2.274L11.999 24z" fill="#627EEA"/><path d="M11.999 17.538l4.94-2.274-4.94-2.273-4.939 2.273 4.939 2.274z" fill="#627EEA" fill-opacity="0.6"/><path d="M7.06 12.188L11.999 0v15.265l-4.939-3.077z" fill="#627EEA" fill-opacity="0.45"/><path d="M11.999 0l4.94 12.188-4.94 3.077V0z" fill="#627EEA" fill-opacity="0.8"/></svg>`,
  color: "#627EEA",
  category: "ethereum" as ChainCategory,
};

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
        title: 'Sign Gnosis Safe Tx(Danger)',
        value: {
          path: "m/44'/60'/0'/0/0",
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


// 导出链配置对象
export const chainConfig = {
  ...chainMeta,
  api,
};

export default api;
