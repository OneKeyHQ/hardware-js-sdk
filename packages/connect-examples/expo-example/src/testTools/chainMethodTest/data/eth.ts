import { type PlaygroundProps } from '../../../components/Playground';

const ethData: PlaygroundProps[] = [
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
        title: 'EIP-7702 With Pre-signed Authorization (Test)',
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
                yParity: 1,
                r: '0xdeadbeef1234567890abcdef1234567890abcdef1234567890abcdef123456789',
                s: '0xcafebabe567890abcdef1234567890abcdef1234567890abcdef1234567890abc',
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

export default ethData;
