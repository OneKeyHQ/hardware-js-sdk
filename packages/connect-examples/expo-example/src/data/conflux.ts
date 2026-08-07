import { type PlaygroundProps } from '../components/Playground';

const api: PlaygroundProps[] = [
  {
    method: 'confluxGetAddress',

    presupposes: [
      {
        title: 'Get address',
        value: {
          path: "m/44'/503'/0'/0/0",
          chainId: 1029,
          showOnOneKey: false,
        },
      },
      {
        title: 'Batch Get Address',
        value: {
          bundle: [
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
      },
    ],
  },
  {
    method: 'confluxSignMessage',

    presupposes: [
      {
        title: 'Sign Message',
        value: {
          path: "m/44'/503'/0'/0/0",
          messageHex: '0x6578616d706c65206d657373616765',
        },
      },
    ],
  },
  {
    method: 'confluxSignMessageCIP23',
    description: 'Sign Message CIP23',
    presupposes: [
      {
        title: 'Sign Message',
        value: {
          path: "m/44'/503'/0'/0/0",
          domainHash: '7c872d109a4e735dc1886c72af47e9b4888a1507557e0f49c85b570019163373',
          messageHash: '0x07bc1c4f3268fc74b60587e9bb7e01e38a7d8a9a3f51202bf25332aa2c75c644',
        },
      },
    ],
  },
  {
    method: 'confluxSignTransaction',

    presupposes: [
      {
        title: 'Sign Transaction',
        value: {
          path: "m/44'/503'/0'/0/0",
          transaction: {
            to: '0x7314e0f1c0e28474bdb6be3e2c3e0453255188f8',
            value: '0xf4240',
            data: '0x01',
            chainId: 1,
            nonce: '0x00',
            epochHeight: '0x00',
            gasLimit: '0x5208',
            storageLimit: '0x5208',
            gasPrice: '0xbebc200',
          },
        },
      },
      {
        title: 'Sign Transaction (Big Data)',
        value: {
          path: "m/44'/503'/0'/0/0",
          transaction: {
            to: '0x7314e0f1c0e28474bdb6be3e2c3e0453255188f8',
            value: '0xf4240',
            data: `0x${'01'.repeat(3072)}`,
            chainId: 1,
            nonce: '0x00',
            epochHeight: '0x00',
            gasLimit: '0x5208',
            storageLimit: '0x5208',
            gasPrice: '0xbebc200',
          },
        },
      },
    ],
  },
];

export default api;
