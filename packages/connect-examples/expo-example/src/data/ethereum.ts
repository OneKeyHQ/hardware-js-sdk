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
            gasPrice: '0xbebc200',
          },
        },
      },
      {
        title: 'Sign Transaction (AccessList)',
        value: {
          path: "m/44'/60'/0'/0/0",
          transaction: {
            to: '0x7314e0f1c0e28474bdb6be3e2c3e0453255188f8',
            chainId: 1,
            nonce: '0x0',
            gasLimit: '0x5208',
            gasPrice: '0xbebc200',
            accessList: [
              {
                address: '0x283f227c4bd38ece252c4ae7ece650b0e913f1f9',
                storageKeys: [
                  '0xe9fb0a90f9bd0d647017c4b86b03d6aacb2dadde129ad4e427a2779fe75f7aac',
                  '0x4288cae9cd1968c85927ae5dec536583d14e0eedd10fc9b69836385650845596',
                ],
              },
              {
                address: '0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85',
                storageKeys: [
                  '0xc08ec01b77737eed9d0cab7446f39d1924da7f993f2186b066895650ab4a9226',
                  '0x0000000000000000000000000000000000000000000000000000000000000003',
                  '0x55b6273152a39172bd041d99e7b56ab285c5bf05c1415f3fdd909188f7ff4dfe',
                  '0xde52f861a2b463847c6e64d3dc03855ee87b8cfaabf744730b16289168dc734a',
                  '0x218f323528d658ab3d7bb9564dd6edf268003d8eb42ceac38c130971c58857d5',
                  '0xfa9a81415218f70c209c010bb3c1b83ee602594f748c91b45e4efd90d44e80bf',
                  '0x0000000000000000000000000000000000000000000000000000000000000002',
                  '0xe2628b049e910310a3bef3018d0e7020fe60275d59dca333ed5cb9f40f06d660',
                  '0x59e5b242224aa862ecb5f40b15662d4a778fb1f8e049db756ed9a0a4fc38c28f',
                ],
              },
              { address: '0x7542565191d074ce84fbfa92cae13acb84788ca9', storageKeys: [] },
              {
                address: '0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419',
                storageKeys: [
                  '0x0000000000000000000000000000000000000000000000000000000000000005',
                  '0x0000000000000000000000000000000000000000000000000000000000000002',
                ],
              },
              {
                address: '0x7d4e742018fb52e48b08be73d041c18b21de6fb5',
                storageKeys: [
                  '0xfb44bcdd0398172ec04229ecdf2731caab3b9195751a90735b5969e03b3bac03',
                  '0x000000000000000000000000000000000000000000000000000000000000000b',
                  '0xbc09a746559afe6e001fea1d6c5f4f80c67b17ad610bf4752c7251974f9ad4bf',
                ],
              },
              {
                address: '0x59e16fccd424cc24e280be16e11bcd56fb0ce547',
                storageKeys: ['0x39eced1c8545e8dcf79a393c770581bdc5cf8c351c2a7202a49c3ce596865256'],
              },
              {
                address: '0x00000000000c2e074ec69a0dfb2997ba6c7d2e1e',
                storageKeys: [
                  '0x859ecef2e168dc10231b000bd53493b42bc9d944cac29d94582c1e1d43592131',
                  '0xce5527cdafae6cecb8a9416489756358c0d6365a7f5eab610405ddbd10d9bdf5',
                  '0xce5527cdafae6cecb8a9416489756358c0d6365a7f5eab610405ddbd10d9bdf6',
                ],
              },
              {
                address: '0xf29100983e058b709f3d539b0c765937b804ac15',
                storageKeys: [
                  '0xce5527cdafae6cecb8a9416489756358c0d6365a7f5eab610405ddbd10d9bdf5',
                  '0x6ba92f8746869287f7fae109c7904a61f415190130b3a6270292c56e746a00b1',
                  '0xa7ac1ab858980c2e794e46047ca071f03a72e1d2c033a163a18a25fa939ff379',
                ],
              },
            ],
            data: '0xef9c8805000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000001000000000000000000000000005e42f07c15a4c7c14796a2db1d192874ec1629780000000000000000000000000000000000000000000000000000000001e133809923eb9400000003a10a5d4251a0f6a2da77aedb66f4be855b196b3ac408e08a000000000000000000000000f29100983e058b709f3d539b0c765937b804ac1500000000000000000000000000000000000000000000000000000000000001400000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000056b6f736d6900000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000e410f13a8c0c151bc182d453cf955cbe44364de1261ef545ab45d8a8f6a3599c208b2210cb000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000066176617461720000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001868747470733a2f2f6575632e6c692f6b6f736d692e65746800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a48b95dd710c151bc182d453cf955cbe44364de1261ef545ab45d8a8f6a3599c208b2210cb000000000000000000000000000000000000000000000000000000000000003c000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000145e42f07c15a4c7c14796a2db1d192874ec16297800000000000000000000000000000000000000000000000000000000000000000000000000000000',
            from: '0x5e42F07C15A4c7c14796A2Db1D192874eC162978',
            gas: '0x48cc6',
            type: '0x2',
            value: '0x63c201797a045',
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
      {
        title: 'Sign Transaction EIP1559 (AccessList)',
        value: {
          path: "m/44'/60'/0'/0/0",
          transaction: {
            to: '0x7314e0f1c0e28474bdb6be3e2c3e0453255188f8',
            chainId: 1,
            nonce: '0x0',
            gasLimit: '0x5208',
            maxFeePerGas: '0xbebc200',
            maxPriorityFeePerGas: '0x9502f900',
            accessList: [
              {
                address: '0x283f227c4bd38ece252c4ae7ece650b0e913f1f9',
                storageKeys: [
                  '0xe9fb0a90f9bd0d647017c4b86b03d6aacb2dadde129ad4e427a2779fe75f7aac',
                  '0x4288cae9cd1968c85927ae5dec536583d14e0eedd10fc9b69836385650845596',
                ],
              },
              {
                address: '0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85',
                storageKeys: [
                  '0xc08ec01b77737eed9d0cab7446f39d1924da7f993f2186b066895650ab4a9226',
                  '0x0000000000000000000000000000000000000000000000000000000000000003',
                  '0x55b6273152a39172bd041d99e7b56ab285c5bf05c1415f3fdd909188f7ff4dfe',
                  '0xde52f861a2b463847c6e64d3dc03855ee87b8cfaabf744730b16289168dc734a',
                  '0x218f323528d658ab3d7bb9564dd6edf268003d8eb42ceac38c130971c58857d5',
                  '0xfa9a81415218f70c209c010bb3c1b83ee602594f748c91b45e4efd90d44e80bf',
                  '0x0000000000000000000000000000000000000000000000000000000000000002',
                  '0xe2628b049e910310a3bef3018d0e7020fe60275d59dca333ed5cb9f40f06d660',
                  '0x59e5b242224aa862ecb5f40b15662d4a778fb1f8e049db756ed9a0a4fc38c28f',
                ],
              },
              { address: '0x7542565191d074ce84fbfa92cae13acb84788ca9', storageKeys: [] },
              {
                address: '0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419',
                storageKeys: [
                  '0x0000000000000000000000000000000000000000000000000000000000000005',
                  '0x0000000000000000000000000000000000000000000000000000000000000002',
                ],
              },
              {
                address: '0x7d4e742018fb52e48b08be73d041c18b21de6fb5',
                storageKeys: [
                  '0xfb44bcdd0398172ec04229ecdf2731caab3b9195751a90735b5969e03b3bac03',
                  '0x000000000000000000000000000000000000000000000000000000000000000b',
                  '0xbc09a746559afe6e001fea1d6c5f4f80c67b17ad610bf4752c7251974f9ad4bf',
                ],
              },
              {
                address: '0x59e16fccd424cc24e280be16e11bcd56fb0ce547',
                storageKeys: ['0x39eced1c8545e8dcf79a393c770581bdc5cf8c351c2a7202a49c3ce596865256'],
              },
              {
                address: '0x00000000000c2e074ec69a0dfb2997ba6c7d2e1e',
                storageKeys: [
                  '0x859ecef2e168dc10231b000bd53493b42bc9d944cac29d94582c1e1d43592131',
                  '0xce5527cdafae6cecb8a9416489756358c0d6365a7f5eab610405ddbd10d9bdf5',
                  '0xce5527cdafae6cecb8a9416489756358c0d6365a7f5eab610405ddbd10d9bdf6',
                ],
              },
              {
                address: '0xf29100983e058b709f3d539b0c765937b804ac15',
                storageKeys: [
                  '0xce5527cdafae6cecb8a9416489756358c0d6365a7f5eab610405ddbd10d9bdf5',
                  '0x6ba92f8746869287f7fae109c7904a61f415190130b3a6270292c56e746a00b1',
                  '0xa7ac1ab858980c2e794e46047ca071f03a72e1d2c033a163a18a25fa939ff379',
                ],
              },
            ],
            data: '0xef9c8805000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000001000000000000000000000000005e42f07c15a4c7c14796a2db1d192874ec1629780000000000000000000000000000000000000000000000000000000001e133809923eb9400000003a10a5d4251a0f6a2da77aedb66f4be855b196b3ac408e08a000000000000000000000000f29100983e058b709f3d539b0c765937b804ac1500000000000000000000000000000000000000000000000000000000000001400000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000056b6f736d6900000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000e410f13a8c0c151bc182d453cf955cbe44364de1261ef545ab45d8a8f6a3599c208b2210cb000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000066176617461720000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001868747470733a2f2f6575632e6c692f6b6f736d692e65746800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a48b95dd710c151bc182d453cf955cbe44364de1261ef545ab45d8a8f6a3599c208b2210cb000000000000000000000000000000000000000000000000000000000000003c000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000145e42f07c15a4c7c14796a2db1d192874ec16297800000000000000000000000000000000000000000000000000000000000000000000000000000000',
            from: '0x5e42F07C15A4c7c14796A2Db1D192874eC162978',
            gas: '0x48cc6',
            type: '0x2',
            value: '0x63c201797a045',
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
        },
      },
      {
        title: 'Sign Normal (Mini parsed capability)',
        value: {
          path: "m/44'/60'/0'/0/0",
          metamaskV4Compat: true,
          domainHash: '0x1a7d32d5c8bc7642896c6b5e4d9d0b5b31c4ae4d1400d3c4a861e5d3cc4f1101',
          messageHash: '0x2bd59f0cb70845baf6b36b29f0db1d54a1f146db41b8e3ddfc0ef5a3d54ef102',
          chainId: 1,
          data: {
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
      },
      {
        title: 'Blind Sign (Mini parsed capability, >16 struct fields)',
        value: {
          path: "m/44'/60'/0'/0/0",
          metamaskV4Compat: true,
          domainHash: '0x3c0a11222f6d2526648531f5f801c9a4f58e53ce8c29c293b0dfdb9e58ab2203',
          messageHash: '0x4f7ae317286be7b19d1f9c4e4103b754d4d5b2f422f5d35308d1ec847ef43204',
          chainId: 1,
          data: {
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
      },
      {
        title: 'Blind Sign (Mini parsed capability, string >1536 bytes)',
        value: {
          path: "m/44'/60'/0'/0/0",
          metamaskV4Compat: true,
          domainHash: '0x5ad2f0c59b9f517d064614bcb5fd8f207e1aa0b13dc45942c1791003ca2b3305',
          messageHash: '0x6ce32e7c80db5cfd4b1eb7bb38701fd9bd92bb73a70f0d2a95e05af01d4c4406',
          chainId: 1,
          data: {
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
      },
      {
        title: 'Blind Sign (Mini parsed capability, MetaMask v4 struct array >24)',
        value: {
          path: "m/44'/60'/0'/0/0",
          metamaskV4Compat: true,
          domainHash: '0x7d1a15c6280d2018738d78fce9b50581b67d62047bdbcd03f59060f4505d5507',
          messageHash: '0x8eb8d73477aa18dbede5dd58e4fd500f57057b0fd7b5ff86ed438dcf61ae6608',
          chainId: 1,
          data: {
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
