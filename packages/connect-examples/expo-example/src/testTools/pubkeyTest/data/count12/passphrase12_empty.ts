import { INDEX_MARK } from '../../baseParams';
import { PubkeyTestCaseData } from '../types';

export default {
  name: 'passphrase12-empty',
  description:
    '详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/259227649/passphrase-12',
  passphrase: '',
  passphraseState: 'mpERhxif9Eaovvh3PfStVMDKrwCc8ELwS9',
  data: [
    {
      method: 'cardanoGetPublicKey',
      result: {
        0: {
          publicKey:
            'fe04d33cc1593459f2e418aaf80257059556c122c02ca2033fbe1b1de48d3fa83253224853a90128a627b061e3ce4c3061ba7a2c3a3a90a7dfddc54d22702314',
        },
        1: {
          publicKey:
            '27e41a47bf6c498e099a37bc0dcc7b89fbfc2d877ef76c44527bafebb4d121e14c315be8a32d16366ae2cd1e2dbb499f9c517888c26d17486520e6e039668e79',
        },
      },
    },
    {
      method: 'aptosGetPublicKey',
      result: {
        0: { publicKey: '1e16e346ca9189444948831923132ad244101a665d06e0b9ff057a517e28f453' },
        1: { publicKey: '64b5b7ffb1d9b8b6411836d24e433944f435e196823fd8238fbfb31c23844e1e' },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-pubkey',
      result: {
        0: {
          node: {
            public_key: '03e54f05e8db321ce1f278719f79279b612a4aa7fb3f8a4b41d89fd4dd17280a60',
          },
          xpub: 'xpub6G6QXaDVBmwuzwU2hn9MS6ZnmfEoTuAfcvo1Mf4aVu93Q3jmEwpYH67QVRv4o3NLnfHavS3g1Jt62aP9oY45QjGN6DsfZsAxbsefuKjsJZJ',
        },
        1: {
          node: {
            public_key: '03f7efe23c9a60d75eef541f052b66d8b66918beee443b69bcd3a75f3ff3d6b26e',
          },
          xpub: 'xpub6G6QXaDVBmwv2TYJwzD746TPe8X9VVWvUkoGUV6UX7qvmYAJ7gpF9gyFqKFDBtT8CjtXe5yEDqJyR23HEgyHE7zHJ8GrCnyFZoYugy9oTVT',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-xpub',
      params: {
        path: `m/44'/0'/${INDEX_MARK}'`,
        coin: 'btc',
      },
      result: {
        0: {
          node: {
            public_key: '02fc9eb2556223954d133afd55128971a1dab273cd8e671fd311063d7c6fba5ec1',
          },
          xpub: 'xpub6CtKDkPmD3DrJ4C36KDambwrX9EGkX1tcGGPjA98AurRBudpoBxqcyVUVuHEaCudE5eoZkqoM3nTrwjSdPP4PDUccLAEK9Dry8gQXfZMLdQ',
        },
        1: {
          node: {
            public_key: '0210827fc18d329698b5d2e649f9c44083f19fb0c7aa0812122ae165d976037791',
          },
          xpub: 'xpub6CtKDkPmD3DrLn94N42Lt8vQWgysiWT7YQzjHqUdAPNa2N2x9RfYiP5TX2kyjSiBUhWGvEfRxednnByVeryQ5gTNdxNzFh7ZAAuUMy5E9Gc',
        },
      },
    },
    {
      method: 'cosmosGetPublicKey',
      result: {
        0: { publicKey: '02bb986c178f83e29a39e025125657a2fbd59e50f72662eb3712be74d826576bf2' },
        1: { publicKey: '02e8aba2b6bb9de435c549d3d7dc0bd82acad5201915947af0eab8631bc9c54527' },
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-xpub',
      params: {
        path: `m/44'/60'/${INDEX_MARK}'`,
      },
      result: {
        0: {
          xpub: 'xpub6BszXQKF12q8LQS1dhzS2VZcufZCmgAiRE5nb5H6XkJQE1U2AA1i2atsd7ENmLwytSPAadmknenzav6quY7b86nJFa2EEjAxoct2TgXatiU',
          publicKey: '0211f8e378583f98c4eb683e54251b9621d4f7dc1461d43297b68f6350f4abed77',
        },
        1: {
          xpub: 'xpub6BszXQKF12q8MGhSDYA1vyVqf3DbFBopUnJinHVrNV5rsRec2cUZSsmpLkngzLsAwGxAyrXxQgQFbXxnpyiKs2Tks5Jut1jN8gkBXN9Qxtp',
          publicKey: '02ef7264bd5ffc5cc9fda5ba30ca132cf22276fdc8492bc11104ccf00fc077dd1d',
        },
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-pubkey',
      result: {
        0: {
          xpub: 'xpub6GGG6r4AhkMQ4TR9JFDuEyaGgNEgWRT7WEvwRdZY8tUQBXdRhB2HrHwubdCwNGKHbwo7cZZSvmX1jn8cWQeAZQMgPJiZdjsK15q9sgo83NW',
          publicKey: '033e6bf2f06ee2dc4ad55fe5bd178d26a50f3ede0b6e9db323ac4aa65f6c905d7b',
        },
        1: {
          xpub: 'xpub6GGG6r4AhkMQ84f32qAyBPmYZs8tAMmdkqqRDv5XCwZjpZ3QLNu6g2YCCwufiqUuea9o2Kz3jCij6TajtsWrANzU7E8PV2khmBy6PxtoPx6',
          publicKey: '03572bd366ab02f945a5aa9dee5b6b4776363f05e840062b3b9df120955c7706aa',
        },
      },
    },
    {
      method: 'nostrGetPublicKey',
      result: {
        0: {
          npub: 'npub16q3aaaya63xvthrkhhm0kkp42s7z2marjunyzgx9zxy9gms5cpysalj5rl',
          publickey: 'd023def49dd44cc5dc76bdf6fb5835543c256fa397264120c51188546e14c049',
        },
        1: {
          npub: 'npub17ay4t98reuk88y6mhs9uvweh3e3dhjktlfgexjl5xk23jh0klkvqwktne4',
          publickey: 'f7495594e3cf2c73935bbc0bc63b378e62dbcacbfa51934bf43595195df6fd98',
        },
      },
    },
    {
      method: 'polkadotGetAddress',
      result: {
        0: { publicKey: '0xc5faf99628a14827c1c373a552623d24f7691eda5b00ce0b0b93ef175b20e15c' },
        1: { publicKey: '0x6fa88ebe28d17b534bff65570dd8f14a4940da100d908c3143d5f384660e3e4b' },
      },
    },
    {
      method: 'xrpGetAddress',
      result: {
        0: { publicKey: '03f5e6332c78f327d567c807571d5c1a7d28e3dba206ba8f531bcbd37ce8219b61' },
        1: { publicKey: '03374d7bfe72777ec250455e28dd295ca48e415a9d56d8b6e514e1e4113bd6d18b' },
      },
    },
    {
      method: 'suiGetPublicKey',
      result: {
        0: { publicKey: '3b77a2f193d36e6a6de946ee62590a0151721d6b96da9575faeb68ee0cbdc0e7' },
        1: { publicKey: '305f70add5f722d84e8f0744389cc8f75351aa18110ba6a869498d7a05d40713' },
      },
    },
  ],
} as PubkeyTestCaseData;
