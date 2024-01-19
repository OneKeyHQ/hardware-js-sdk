import { INDEX_MARK } from '../../baseParams';
import { PubkeyTestCaseData } from '../types';

export default {
  name: 'two-passphrase18-密语1',
  passphrase: 'xyz456',
  passphraseState: 'mwdeVF48d9APXPFNUcZD71JEGWHCKerED3',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429490398',
  data: [
    {
      method: 'cardanoGetPublicKey',
      result: {
        '0': {
          publicKey:
            'd2842b3ee614a3b3aa03b9b035c7022f2a45a1ad052e75cec1b6e8a56dd9b0d1f1aa96d04b11332db0940e11e8ac5a4043f14cabf97ae7745362a58c6fb303a7',
        },
        '100': {
          publicKey:
            'bf58bd02d2d6a6fff2bdd168df731446cb03e55943b67992ff1656e07da5876d619b8193717d650a1a03d5bcd0bbd4f6ffe1cc1dedd4c3e197b6f7929af146c3',
        },
        '2147483647': {
          publicKey:
            '80e3e994accd90b95835fa93b84088720e68f4141c57cbd19abc3ba619b2d851460ea7f464d28fa34b4b452e09c453c7b57d0d99ae3a77bd6329c6255ebffc17',
        },
      },
    },
    {
      method: 'aptosGetPublicKey',
      result: {
        '0': {
          publicKey: '85723067e74528b86d12cb54bfc2fe2f2b6610031d269201b59a8f5835a70cb6',
        },
        '100': {
          publicKey: '821e1dc46a23d7fb5faba397632eb173a5c9b1fd92861aee645b0dbd1e22873a',
        },
        '2147483647': {
          publicKey: 'bca584f562861ed6dd5445fcf1742538d7fbdffdebeaf4e08d2f8eb28a4767ac',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-pubkey',
      result: {
        '0': {
          node: {
            public_key: '02773f9c6ab95588058b086525b6472b13e688ca6e5669a8b695fa817f54481a7b',
          },
          xpub: 'xpub6HBw2wPgy4GxcGcirKFwaCfFTdGzceXSHAvFy8j8kQs67cWftgi6A8Q3n64r9kbhaTyfrg1ZuUwJpCBePu6CaFFmSgC1SmqJMRFbnjtyFZb',
        },
        '100': {
          node: {
            public_key: '02a0adcce8b1f804a11671bb6c70f959281dd8bf63fb9308757542b217b2c747cb',
          },
          xpub: 'xpub6HBw2wPgy4H2zppxWZhRVqqLbT2nvStmqu3b5svHb26kuEFBeADLEbwgTpqZo2RFSfMVqmZxytJVhEH39sFYsBJaNWLtadXWaFCgRJBQbaL',
        },
        '2147483647': {
          node: {
            public_key: '028453d04250019c1eda766f8d3f7102699de997bae40c27834c8f08f43a7bfb40',
          },
          xpub: 'xpub6HBw2wPqJiovmSPV6FWVEXNbCC8Mec6CMtnw1fmyVwCowPL4DkKcQr1mVeB91PKeDFd31kC2N93mcWBvutipp7kkE53sPB2VZdodmn1JJwd',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-xpub',
      params: {
        path: "m/44'/0'/$$INDEX$$'",
        coin: 'btc',
      },
      result: {
        '0': {
          node: {
            public_key: '03caa4609e4829850fd1322be64848e067afb3cd88441bf4b3ff9084af5d1b4184',
          },
          xpub: 'xpub6DX7UhZUiMFkgmyN5kccuEkyugg5StQT5AjKDnnZX1k8Sw2PpJCQ9qmsaaDNWhDVnmx9WUX6BrarewV9KwP55Lyj7qpm7ucCXLUkFehz6bk',
        },
        '100': {
          node: {
            public_key: '033f7872e5e9e8a8ca8eb4c5650551763644eadbef443d4d4aee0c360849d4b69a',
          },
          xpub: 'xpub6DX7UhZUiMFq6CpzVstemR8q4rcXqvCdHw1rMqPSusf2A82xAHZPNGVwG44q8B7rXLfxoj11dKY2dP94y5usjsrM3mfLAqv42G7WTPihYCL',
        },
        '2147483647': {
          node: {
            public_key: '03079393c3da4f718a6fd3461b57376d8d2fb2ad76898929a85d89731f8d68c7db',
          },
          xpub: 'xpub6DX7UhZd41nipGqPGNHjGDFQJtQ6Ssg3Q3HDjFG91mVRDcsmSLcicBhr7SqEexwk1RM1wJAYtX6c7YYDon3DQpZG1XeuEb2jh5TvFLmJaLW',
        },
      },
    },
    {
      method: 'cosmosGetPublicKey',
      result: {
        '0': {
          publicKey: '02741907f1eb0b22c7008aafa378a7dbd564195d743fffb7b059d2797af37bbf58',
        },
        '100': {
          publicKey: '032a35b7ac447478896f7dfb8f8b0c783fa58f58e51bc44cd2a9106e43dbeef2b9',
        },
        '2147483647': {
          publicKey: '03cbe14f9b15e1ec2279bbb0b988660173e7fefcbdc77a683a38015b147e21649e',
        },
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-xpub',
      params: {
        path: "m/44'/60'/$$INDEX$$'",
      },
      result: {
        '0': {
          xpub: 'xpub6CbUPD3T2mpo7CJBhxtbouZ76yQa6STwtspM6KPszLNYxjKDXFkTRm7YyZgW7GBamj2u8wxkAbKyAERxSnQREvxFRSn6Xu1Zoc5m4KZkYd3',
          publicKey: '03888ee3ab6a657d5f088343bcb26000421f841b6e022b2de16ef3ca86fe20ceb0',
        },
        '100': {
          xpub: 'xpub6CbUPD3T2mpsX7p5XwDVz9CKeXpMCLZX1XianjPBdmzAyLYtwG6i1cPk174KaT9NPVydfySrbvQKd636VZLiQTgAPyFrBSZ4gei7K3TTYmY',
          publicKey: '023e98ea6d5eb521728e6fe69dc816a572428db36ebc43dfdabf29914ddca29e2a',
        },
        '2147483647': {
          xpub: 'xpub6CbUPD3bNSMmEmbs4xFw9udzh4PvtPfzGm4tc9TM1xwSNKAsoukg6QaxMgF5E13yj4JhXuZSDEzn7Hvnd9DpHWTMTLVSYowdqf2nAVUXpCz',
          publicKey: '03ca5d8b6a1edcf20b6c1dbef2b2467bb6434e20d3184258e5229a24d66e7309cc',
        },
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-pubkey',
      result: {
        '0': {
          xpub: 'xpub6FUpZZvh9iJgBXLcnTt78qEycnXY5wEa5L6sRSPGoFoPmaBGrUNcCRTcHzVxPCkWjDH8utgis51eu4FuKs3Xew8u4ExR1TUVHCpTH4s2RTj',
          publicKey: '03fda1e9ea4a59c35b7869cd574021f85b48766e93e22e4c731f5be470c506fcc3',
        },
        '100': {
          xpub: 'xpub6FUpZZvh9iJkbqqeK3i23AHf8NLZpDyB7k5L14VUBp67qctv33m7A3hcztK7QpqNydPy4fspw8JnPdT21D2ydTpbJ7s6tHMksvefwKDPevW',
          publicKey: '031aae5d849e6ecac1ba01418eb3c3ba39a92c589bea43775d75a56a9cdab1ee12',
        },
        '2147483647': {
          xpub: 'xpub6FUpZZvqVNqeKJ3HE4VpnmCuAEgmycYGhXJbkv1snHEdUQDvxSNqC8hXbNXWGw3pLGkUCZ5n5LSJC6b6YdAiK1C9ZTb1rXMUzhhTvcL1WVw',
          publicKey: '03442074a5d221c76546fe69e52a73347f3ddfaf1a24b5c3a8648c47d0fe53989b',
        },
      },
    },
    {
      method: 'nostrGetPublicKey',
      result: {
        '0': {
          npub: 'npub1xssldcw0pgeyzrw8k070j87dezdh3xc5g0qyh28u0x69j8aszkrs2qjlsr',
          publickey: '3421f6e1cf0a32410dc7b3fcf91fcdc89b789b1443c04ba8fc79b4591fb01587',
        },
        '100': {
          npub: 'npub1aekwntwq7h9gpfyqlfahd3gzfwk4uj36jg066plwqynsknzm0hnq4f6xd0',
          publickey: 'ee6ce9adc0f5ca80a480fa7b76c5024bad5e4a3a921fad07ee01270b4c5b7de6',
        },
        '2147483647': {
          npub: 'npub1j7qwuelqzzud8gy795q55pz4g87x0x7nxywcwnc4mxh40wvwh3xqr2njkp',
          publickey: '9780ee67e010b8d3a09e2d014a045541fc679bd3311d874f15d9af57b98ebc4c',
        },
      },
    },
    {
      method: 'polkadotGetAddress',
      result: {
        '0': {
          publicKey: '0x3c64b7a8b0af7905a4bef2f358c28239236f1f94a9f3be1b2d21bd97c05e398a',
        },
        '100': {
          publicKey: '0xcbabed0d51724c850ba5c003cc0bb357a238015a400122289400a42a6e178eca',
        },
        '2147483647': {
          publicKey: '0x9947e91d4e82018d77e1a8fff3b375ed47451f7bfde2d28f3444323e3f55cb91',
        },
      },
    },
    {
      method: 'xrpGetAddress',
      result: {
        '0': {
          publicKey: '023085de2e148cbd7df20e88c130c717ee3fd74358ef20f1b4f54d47f64639e5de',
        },
        '100': {
          publicKey: '028dae002863f3a5d5e345f9a6094db00842ef08b15acfd5aa436ee9a421291d5e',
        },
        '2147483647': {
          publicKey: '038bbb67bf011362b95a70d009e59c9a506b1043cf4af2edbd6f480f4851f057be',
        },
      },
    },
    {
      method: 'suiGetPublicKey',
      result: {
        '0': {
          publicKey: '872391008cb17af07634a2af235658179153c0d9697e29e4267106a18c85e2c0',
        },
        '100': {
          publicKey: 'e6020d744a6e6132b0a5b4e10d9ed63583aa08505e18d982ded59f16e9fcdc0f',
        },
        '2147483647': {
          publicKey: '42c55184cd0277de3e3bf9c10b8ede3dfb909f42b7018bd53631061c7d7b6fb6',
        },
      },
    },
  ],
} as PubkeyTestCaseData;
