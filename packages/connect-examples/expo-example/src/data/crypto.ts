import { type PlaygroundProps } from '../components/Playground';

const api: PlaygroundProps[] = [
  {
    method: 'cryptoBatchGetPublickeys',
    description: 'cryptoBatchGetPublickeys',
    presupposes: [
      {
        title: 'cryptoBatchGetPublickeys',
        value: {
          ecdsa_curve_name: 'secp256k1',
          paths: ["m/44'/60'/0'/0/0", "m/44'/60'/0'/0/1", "m/44'/60'/0'/0/2"],
        },
      },
    ],
  },
  {
    method: 'cryptoCipherKeyValue',
    description: 'cryptoCipherKeyValue',
    presupposes: [
      {
        title: 'cryptoCipherKeyValue',
        value: {
          path: "m/44'/60'/0'/0/0",
          key: '0x123456',
          value: '0x123456',
        },
      },
    ],
  },
  {
    method: 'cryptoCosiCommit',
    description: 'cryptoCosiCommit',
    presupposes: [
      {
        title: 'Sign Message',
        value: {
          path: "m/44'/60'/0'/0/0",
          data: '0x6578616d706c65206d657373616765',
        },
      },
    ],
  },
  {
    method: 'cryptoCosiSign',
    description: 'cryptoCosiSign',
    presupposes: [
      {
        title: 'Sign Message',
        value: {
          path: "m/44'/60'/0'/0/0",
          data: '7c872d109a4e735dc1886c72af47e9b4888a1507557e0f49c85b570019163373',
        },
        expect: {
          common: {
            normal: {
              error: true,
            },
          },
          touch: {
            normal: {
              requestPin: true,
            },
          },
          pro: {
            normal: {
              requestPin: true,
            },
          },
        },
      },
    ],
    deprecated: true,
  },
  {
    method: 'cryptoGetECDHSessionKey',
    description: 'cryptoGetECDHSessionKey',
    presupposes: [
      {
        title: 'cryptoGetECDHSessionKey',
        value: {
          identity: {
            proto: 'Ethereum',
            user: '0x7314e0f1c0e28474bdb6be3e2c3e0453255188f8',
            host: 'localhost',
            port: '8545',
            path: "m/44'/60'/0'/0/0",
            index: 0,
          },
          peer_public_key: '0x7314e0f1c0e28474bdb6be3e2c3e0453255188f8',
        },
      },
    ],
  },
  {
    method: 'cryptoSignIdentity',
    description: 'cryptoSignIdentity',
    presupposes: [
      {
        title: 'cryptoSignIdentity',
        value: {
          identity: {
            proto: 'Ethereum',
            user: '0x7314e0f1c0e28474bdb6be3e2c3e0453255188f8',
            host: 'localhost',
            port: '8545',
            path: "m/44'/60'/0'/0/0",
            index: 0,
          },
        },
      },
    ],
  },
];
export default api;
