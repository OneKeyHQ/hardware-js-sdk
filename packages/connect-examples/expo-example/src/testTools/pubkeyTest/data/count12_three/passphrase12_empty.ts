import { INDEX_MARK } from '../../baseParams';
import { PubkeyTestCaseData } from '../types';

export default {
  name: 'three-passphrase12-empty',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/427983033',
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
        10086: {
          publicKey:
            '1b0c4746a74197034874f9018d4c067a5e124c2910e288cbb747568e51cdf494eb25844f5203d158b56374fed5b00f9cd8df9b8b285bb783db028d1d79133aa5',
        },
      },
    },
    {
      method: 'aptosGetPublicKey',
      result: {
        0: { publicKey: '1e16e346ca9189444948831923132ad244101a665d06e0b9ff057a517e28f453' },
        1: { publicKey: '64b5b7ffb1d9b8b6411836d24e433944f435e196823fd8238fbfb31c23844e1e' },
        10086: {
          publicKey: '2cdff48bc6c351c91a1cf22b4d0b6982c2e2e8c98937d4b259455106dde9eea9',
        },
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
        10086: {
          node: {
            public_key: '02ac949fc68c8db7e97c22ebc32be5c62a7b4813643a9aa0af03155337ab79534c',
          },
          xpub: 'xpub6G6QXaDVBn5ZCnpZFnr3mcmzcRgUJDH5WNHRR2rbU1eUReb69GQ5fxpZx2mgUA2HL8BB8g1LDZiZu1JkRpEdasz14iMV8ABiLf1pXzxWhJM',
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
        10086: {
          node: {
            public_key: '0242e9b6f264da3e8aea5ee44f3bd6e2da282da35bc21c7070d9cb8ff0b3c88cb3',
          },
          xpub: 'xpub6CtKDkPmD3MVWj9sWedxhwyzobuyAZufkKTB4nNfYvkh7ACVpUziSHkj4H7P78WUjP5ASV6WQaJNbDYu1J3Xnpj1zZi7RNV6yEf9xizo6z7',
        },
      },
    },
    {
      method: 'cosmosGetPublicKey',
      result: {
        0: { publicKey: '02bb986c178f83e29a39e025125657a2fbd59e50f72662eb3712be74d826576bf2' },
        1: { publicKey: '02e8aba2b6bb9de435c549d3d7dc0bd82acad5201915947af0eab8631bc9c54527' },
        10086: { publicKey: '03cf0baa6f4cb19952a61224f167c34bbd6e911f1893ada8a1abaf9f1b485bb9b6' },
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
        10086: {
          xpub: 'xpub6BszXQKF12xmWziV3dj7RXh4hjoRyzXxrBfrQe7tBDNaZ1oLWsL2Qw38S4AvcKDipfV7PcCKK5QhchHc1yo7SpcDs4xfcGza2HnHpsM216F',
          publicKey: '0380331b3d7002d8ea1614f14cf8637d46b2ac315d48bf8a6ac3a24b8c96296259',
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
        10086: {
          xpub: 'xpub6GGG6r4AhkV3GivpvqbbTWpdMhwbrqNaW1QDRwQbaFodfTwx7cCB98nA4xabo8iRKywQMf791MbGKweTSUNTShnUgJBAYJuvMPnGrMCP9Ka',
          publicKey: '034a42d395010f4d8d5b52977554ec6e85779afbca5c7d777a0c9a76812681d000',
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
        10086: {
          npub: 'npub1ua66u6cvz0qfuc293sdc6xeslprfe3djpyfct93x3jkdcy8spk0qea6wew',
          publickey: 'e775ae6b0c13c09e61458c1b8d1b30f8469cc5b209138596268cacdc10f00d9e',
        },
      },
    },
    {
      method: 'polkadotGetAddress',
      result: {
        0: { publicKey: '0xc5faf99628a14827c1c373a552623d24f7691eda5b00ce0b0b93ef175b20e15c' },
        1: { publicKey: '0x6fa88ebe28d17b534bff65570dd8f14a4940da100d908c3143d5f384660e3e4b' },
        10086: { publicKey: '0xd041fd53bc62e4f4749cf8b428934dcddf850d8f0f9f3214590d2382ffcdcca2' },
      },
    },
    {
      method: 'xrpGetAddress',
      result: {
        0: { publicKey: '03f5e6332c78f327d567c807571d5c1a7d28e3dba206ba8f531bcbd37ce8219b61' },
        1: { publicKey: '03374d7bfe72777ec250455e28dd295ca48e415a9d56d8b6e514e1e4113bd6d18b' },
        10086: { publicKey: '02bad5a79f09a4489b983e8ea8398f76e783c73508032f31c8382525cd956f26f6' },
      },
    },
    {
      method: 'suiGetPublicKey',
      result: {
        0: { publicKey: '3b77a2f193d36e6a6de946ee62590a0151721d6b96da9575faeb68ee0cbdc0e7' },
        1: { publicKey: '305f70add5f722d84e8f0744389cc8f75351aa18110ba6a869498d7a05d40713' },
        10086: { publicKey: '8325d7684e40fbe6999becb0d07251fe2cf77a9b37a31a7b8472ed7931393007' },
      },
    },
  ],
} as PubkeyTestCaseData;
