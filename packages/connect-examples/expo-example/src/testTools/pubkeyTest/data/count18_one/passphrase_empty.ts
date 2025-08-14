import { INDEX_MARK } from '../../baseParams';
import { PubkeyTestCaseData } from '../types';

export default {
  name: 'one-passphrase18-empty',
  passphrase: '',
  passphraseState: 'n1xWjoRozJunfJ949rNixAWMCh4Vwj4L9j',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429162750',
  data: [
    {
      method: 'cardanoGetPublicKey',
      result: {
        '0': {
          xpub: '291e1610162989b42e41d7aec6b7f699ecc36a09bee5f6d096b153625f2108b6f6dd53227cc9ed5a1e1886f5305a525d347d5ad4470e1c9560f434b862e0c42c',
        },
        '100': {
          xpub: '3070803925ec7a58a21fac845c526b078b01dc86ca39db3dbcf228da636a612e838f704e064aabfe8b7cd1cbafcbd081554691a671f71ed28488544a608d8c52',
        },
        '2147483647': {
          xpub: '1d9fd2edc203bc4ba7e966bc5545ee5f7ca5eeeae1cbe61d895e2234a4375f0e5fd7c324f4c00e3f7ed76288f89145511309098300f072fd41839ff9f448c473',
        },
      },
    },
    {
      method: 'aptosGetPublicKey',
      result: {
        '0': {
          publicKey: 'f7901faf562fe12aae57fef882dcb396ae8085a3b34760da71e37078d8b61bcf',
        },
        '100': {
          publicKey: 'e3a416a3131a5dd7f20912491ff26a1253018448052f89eb31548564ed21227e',
        },
        '2147483647': {
          publicKey: '824d7a16031b75ee545124c6b37850105d7300a13cf27ee607e68e8ddee1fac5',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-pubkey',
      result: {
        '0': {
          node: {
            public_key: '03d868940b4bbc242c1312eb429cf63d6e3b079e46f00bc5607552528e2cf8e75d',
          },
          xpub: 'xpub6FZ2vZ9KvC416kPGUg4Jffzkx2Xtj6uruhnC1w6EJT8dZfiXD1ZNJMch6GB4oLYbL2iz6BUmYM2MMbmkbWxoAjsoc5j6U12r9LPy4UbsKBv',
        },
        '100': {
          node: {
            public_key: '026c65a34434be483153d3955e97df34ed47db501990ccc25a01ce0246bccfc91a',
          },
          xpub: 'xpub6FZ2vZ9KvC45VfdUAcx7BVZGLLC1BqEypWveXRGu4AxzhFqWPtHuuwsCLY8zDA9Loj4ptzYWCfVKX9774YLqBPLmFfF8ZxMpjnvskK3tRcB',
        },
        '2147483647': {
          node: {
            public_key: '02fd13c0fb443de156e757b5bde81169f44a50d3556eb7cadddeb08e31cb6ca2b2',
          },
          xpub: 'xpub6FZ2vZ9UFrayFRHdyJPiShLEzBjhna7sg4kaG3kHZtFcgZFGZZzAvfjmgLTZuqbgZKXs53cBxe4sUjn7cN88fRkxSURPbm5GteuGK1LpYoK',
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
            public_key: '026fc1cd2c4f5d36317a05dae18fed7e7f6cfb2b4e9445a16501921c754ecd7f92',
          },
          xpub: 'xpub6CrrJ9mMXduabKLcZTNvFXKV17ZtHY9KEBzuzdRbyWAiCGMmKU4TBqzbEFz2TME8rSTkGADTemtNroob2iTT2qr37ScBf5EZzNJa5gArTdQ',
        },
        '100': {
          node: {
            public_key: '02fcf048622b768676d315f336863a47ff000c299a31c9687a91e03ff51989297d',
          },
          xpub: 'xpub6CrrJ9mMXduezAVP1TVEszpFeyXQim6nbjD59Hd4i1rkjboyBFhLLxhqeVZcy6sxPHrndTkm7Q38GsvW7e49FWeVyLVafTw8taroR6wpr1d',
        },
        '2147483647': {
          node: {
            public_key: '0248b707598ec64de10d1d0568a86629ef41e7030704948e0613bb9157553f52ec',
          },
          xpub: 'xpub6CrrJ9mVsJSYjivvo6JVEywEQTNqm6XsR3xLN1oXtTdyiiXAmNrMpuF4Mdv6x5xRFs4oab4UVk8orUBtgUetYr3R3fs15ihNAuKdSSWjAt2',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-test-xpub',
      params: {
        path: "m/44'/1'/$$INDEX$$'",
        coin: 'test',
      },
      result: {
        '0': {
          node: {
            public_key: '03936777d05c7b135a816f6ee0ab64aa2d71869e9fcecffd9a92a02a5b0318da41',
          },
          xpub: 'tpubDCgvsRNLMG9xbgYYdvVV4BahwB3X7gqhE2Wy4aDgmtKfXx9Mm4jJvjq4fac8MBePaJvNCe8b1zEHhGHF7bzhHZiJLSUTGzoZENxsQbevi8U',
        },
        '100': {
          node: {
            public_key: '031342bf23bd015a1459a43b2dcf5839475e9882e958b4beb5db3a4633b684a7e8',
          },
          xpub: 'tpubDCgvsRNLMGA2zbEuMKHrmtW1Sg1jfXWCJci8RFVThmvDbNCRwJbndwP4Cmw29UsWguu5MvjYf3vxyqYmhoTyyAHyeBNVQvwaeu5rUT6UQ34',
        },
        '2147483647': {
          node: {
            public_key: '0200895d7902678a8ee0a9a3819bd61c152d958d9f0cf7c33091e64f88e8a318b0',
          },
          xpub: 'tpubDCgvsRNUgvgviZY1JDEry7r6R6eUHdy3wRzCipDX413x8HoNHWZN4vGboZQeWhFv1KKgsXMqw7F9K28Diwtk2xTpj64RDUFNRRQzbWXH17h',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-xpub-48',
      params: {
        path: "m/48'/0'/$$INDEX$$'",
        coin: 'btc',
      },
      result: {
        '0': {
          node: {
            public_key: '035b48f7314cf5199eecb490dfe677f89ad1bef7bf4d68c403017053b1d0972db8',
          },
          xpub: 'xpub6BwFGi1XaTsQP7vrHc9zUh49NFu1WAre5gZ56H5ULyzkQNoaM7FtwkKUdrQwfKXi6YHRxLCLSkZRWM455xozBLyuQSWf24PuQyk9YcsEFxn',
        },
        '100': {
          node: {
            public_key: '023f44a50fcedbccc3f4df421c8efe79301d0d1495b57215613157903bc6386b3a',
          },
          xpub: 'xpub6BwFGi1XaTsUnxjgd5zVtzF9n5kt85Apq4Vpk5Y6hLoxF2EUDSZW1tfgutTtKtcdFjLB8RD4opXCRf6EWnXoUnwKC2RF8biMkGozdTwtUkp',
        },
        '2147483647': {
          node: {
            public_key: '03885b2633b148edf664f91bb730985654e78d7c54e543778d9689440ab57ba286',
          },
          xpub: 'xpub6BwFGi1fv8QNYPwXMqohrR7kAAm4cdkWjGt639mce6cZ5tSAU6fqACiTWd7HADn1aXDKN84PHYiZJsL4zq94KdT8FfZguuGSUm87dAPBf39',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-xpub-49',
      params: {
        path: "m/49'/0'/$$INDEX$$'",
        coin: 'btc',
      },
      result: {
        '0': {
          node: {
            public_key: '02f1407116f845f666fb55edb8af0da997530d708491fc35f3046adfb08c3067cd',
          },
          xpub: 'ypub6XXANCqgzNxzdDD5GNjhD4yV3ayR6am7FFbbSXDAatn9JS4UrR9kmjrNjpqYa777eWMeStHVZUpHVM75c58BxpWEJos4X2eQsbEQVAELbCo',
        },
        '100': {
          node: {
            public_key: '02e02bf240cf26aad157d43b2565c82b88205602136ba6e7a5a91f6368883c1582',
          },
          xpub: 'ypub6XXANCqgzNy52YpCcLRdhwNamiNvPbvBX6MLnnHXbeZw4nSRwSJ3isT4qfqFg251zUQRyn3TAxP5RoDS6i1prLbUZd9au3pUwXwY41CnymB',
        },
        '2147483647': {
          node: {
            public_key: '0385c542587b64044c93a0a08c03830671d7d10301542f11cd9a7b03d7c0ea4ff5',
          },
          xpub: 'ypub6XXANCqqL3Vxm76wripdrR2C4BE1jRWjEWBNuPRSCiCdGwE47wUF5MqomcJqfeNSMDHK6FaeGxe3eKFnLR3YCzcPEL2T7YFqiXLydJKerNz',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-xpub-84',
      params: {
        path: "m/84'/0'/$$INDEX$$'",
        coin: 'btc',
      },
      result: {
        '0': {
          node: {
            public_key: '03fdb36c8768fe3db853d5c334f8deaf747981f2438db2f9a0d2b1c4780e564276',
          },
          xpub: 'zpub6qwkwiUPCFTYBY9DZCsp1XYyNiLt8guVj7etu81ESwXnnivkCQMoKLKhwv5MqwrEWEoKGLss3qoyVD6j7hKX1KycsBKUKpmUxkZFswop5YE',
        },
        '100': {
          node: {
            public_key: '03ddad650a013c19f95fbcba0f45de6938a4732eb53ce32afd52bfab7b49a09fda',
          },
          xpub: 'zpub6qwkwiUPCFTcYjXsg226ZB59pbPLDK2R5YC1h4Xi4vLVkTYkR6NTFGVXkM1tFmRSq6tuDcBK4qmnzPQioqNKK92tyM4nzz1F2XRZgqCKiDF',
        },
        '2147483647': {
          node: {
            public_key: '0237096be17aa7676d80194176726301a9d5c4233747558455642b53379fa2029c',
          },
          xpub: 'zpub6qwkwiUXXuzWK9v4yCAvwsz7hbN55KdhXZ6kVvUDCAU3psAFKs2PW3xC8RwXH4GeRgJk3hSzZURyAe78ijjt8jgW7mZNJqdoRiFbBqKGC4k',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-xpub-86',
      params: {
        path: "m/86'/0'/$$INDEX$$'",
        coin: 'btc',
      },
      result: {
        '0': {
          node: {
            public_key: '03a62dce7e1f19b16a6ee3f9230926c6fbcdf5d5af48ae5a579827edaa4f5b31f2',
          },
          xpub: 'xpub6DGfE9fRQCaoVsShucaFCoanbejUPyq4Qc5kAYRAsh4H6ftzg9SbekLRwx7pY6MaKc7yhSqoy85KdbM6NqyiCc8xECvLAwiZGf2MwaJWupf',
        },
        '100': {
          node: {
            public_key: '027a07f9df1e1b28b01ee7e8b64fa9e5dd56c5225e465ac414e2b524938558ecd6',
          },
          xpub: 'xpub6DGfE9fRQCassx3VX8esQr9smRyAAA5Cnp9NTsrFKb3AYmEPPBaW6xXaHDHGZPH1cJKDVQkwVCxzxzdmdJHcLiBc7ihAtfVRyHp9M7EHm7V',
        },
        '2147483647': {
          node: {
            public_key: '02fbfb4a0a5677681f1aa28244efd128db161f47008a6dc528b9c925b80bf17c1b',
          },
          xpub: 'xpub6DGfE9fZjs7mdCwyR86Mhr7aHYuhS8oxtxYUSkUaW4mYQCX5Hwj5Tc7QAkAbBz7gk9C2cdBf1e5DTL7MRLktVwMEwZj1hL7K3SeWcnkwSGm',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-xpub-44-ltc',
      params: {
        path: "m/44'/2'/$$INDEX$$'",
        coin: 'ltc',
      },
      result: {
        '0': {
          node: {
            public_key: '02651d4d240d825cba0b09773e8763bfd03b8034c8c112e92a4e25fe0b301519f1',
          },
          xpub: 'Ltub2YAycMi1ernHVLWyzL2RR6o4Dt7L2HMzaL2GqBQkXoPrnCiGAM4oPkcmU6sWEpAoX6xrKN2t8Uf9258nxgwCDXqNaZHQMQ4aMyetx5Gs3US',
        },
        '100': {
          node: {
            public_key: '02132c1c453f14040d008b0c42118f49ab956cc890c38af5f601197039bcf5c947',
          },
          xpub: 'Ltub2YAycMi1ernMuQt3mYFnN1QXx66F3tg6dnfPkhGrKKgUsPL1g8wARVR5z8nFDrtUjSHZJDkqgWpbYqpwvGr8rqTSKy69CxVuDeTq1jdtAag',
        },
        '2147483647': {
          node: {
            public_key: '03e7c83fea2ca7c75a704fb30fc815bebc411bf886c2245486110bdf1d741fb0ac',
          },
          xpub: 'Ltub2YAycMi9zXKFeET5sbwWrMkixfSpaB3pJMqwAHAoNQaP8Sye4sAPJ8pBTfGsnCiFd1jqxRdignxr8TzU7fmYBJq4eqjmN3cbueJwANazbqk',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-xpub-49-ltc',
      params: {
        path: "m/49'/2'/$$INDEX$$'",
        coin: 'ltc',
      },
      result: {
        '0': {
          node: {
            public_key: '02c34b9dec6c9619e208d2d7713974b95796a5a0a4905a1cf69906bd632ee1eb17',
          },
          xpub: 'Mtub2sZMREy8dBq6btCposJB7xHoEuNXU9oUHNp7L13JkiB8Skgv3vccczigNLAM79Qu6j2D8bAG2JRSSdeWtEjPpGZ8iAwHBP2o2DTttu6obHn',
        },
        '100': {
          node: {
            public_key: '030965be535192b91085b20e2c6bb5d41466c342ce75b426de1cf1616503a7a510',
          },
          xpub: 'Mtub2sZMREy8dBqB1KXgGRq6nnpwzyCPk25pvxq9XQ4xt1QXTfgSizepj1wshuLM2SQLpmuFG4NZWRZzNnsoac1GEnPKGwJQYfpuMqLE4ZVCxmT',
        },
        '2147483647': {
          node: {
            public_key: '025752aa7e208cdf39d8cd33491a5f54c1ae57d27456526a0524a953e3a3fcb40c',
          },
          xpub: 'Mtub2sZMREyGxrN4jwqtoSQ3hdWqkpoPHjyXr2pp4oUbpS7KAtrDfe8njaKVX6iZWfekCLKGbYr6EDFwB6YJnVv6SUGXjoLr9vhsUTUSr28Vsm4',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-xpub-84-ltc',
      params: {
        path: "m/84'/2'/$$INDEX$$'",
        coin: 'ltc',
      },
      result: {
        '0': {
          node: {
            public_key: '03a6db5017d2d3c1e6aea505246d877f72cc05f1c2ee7c8b416f238c4e8cc1d84b',
          },
          xpub: 'zpub6rfrV7kzua9vg3gP4xTAm8aDjEVpc7aG744LFTJQ7fsyLr47tf7s35XtiXTmtV4ThcQ5mazNkfAM6NFuTcKH4gAr5cakZGuLD2pjtbn4Mnd',
        },
        '100': {
          node: {
            public_key: '033e10efd2ce5b19cc06b910af2a55c9f36976194faf0e54a2fe9dad41a3a81263',
          },
          xpub: 'zpub6rfrV7kzuaA14xkHjxC7zcxFXttmxLbDNdX66Vitjmfm6Xcmeic6URkp8aXKBVTaCmsqhnvaqPXp3aWuMa7UHX56YQg1kJVw8pNEj7ZnUi4',
        },
        '2147483647': {
          node: {
            public_key: '023f5b7c2135b8a5c2b54f2f832a8384aee57d7f899871e94b84126da80c7b1bf2',
          },
          xpub: 'zpub6rfrV7m9FEgtpT7aCyy221H27FeTSVUcF2R98ztMyPrccLKKhzMccB1WkXAbH6ngPm3xMJ8uqRFHdV9xxBEyCdpmFm3vn9hQyTzrfShs4fN',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-xpub-44-doge',
      params: {
        path: "m/44'/3'/$$INDEX$$'",
        coin: 'doge',
      },
      result: {
        '0': {
          node: {
            public_key: '020259173fa16c034701321521e728a976a070a09c4d58f6d7e9cc31e9d1e974d0',
          },
          xpub: 'dgub8sTL1df3XMbCMopG68ALRddduJwwswkjY4tUpJQXCLEtisSZ48pZj9vR49UgdzvTjuGRaCWriV2gnnqSUiQxhMm2a7vVpuxDbM8gMu4Znvr',
        },
        '100': {
          node: {
            public_key: '03cfd674d8389a738af763aa94c83f302391b9715789b4a65c520d0940ff1a9483',
          },
          xpub: 'dgub8sTL1df3XMbGmoaTgQuYMV61wWwxECdMxBAPH1jhVTZ7ArUYPc2mA52AtHntGT6GPyMey46Jmr4CXDDuCfFk3Aw36ZHozCayXFpLxMEMucx',
        },
        '2147483647': {
          node: {
            public_key: '02c7031569c1bad3929e86b3b6961f0ec2d3d7ad4197d93e060e00bd899fc7aa47',
          },
          xpub: 'dgub8sTL1dfBs28AVxLS6vBZSkSMcXXvST2mV2sYvuB978rHLYJkcY1cYGkPXEvNysmUFjEjMV9278VmCFa7xHfhZkhMFUcSQe6H2s7UDLKrXBV',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-xpub-48-doge',
      params: {
        path: "m/48'/3'/$$INDEX$$'",
        coin: 'doge',
      },
      result: {
        '0': {
          node: {
            public_key: '025a56f11c54cce14d3ede0f790f2f5b8be878cac810a15b3473ba1ad7f370b341',
          },
          xpub: 'dgub8sYQ2pDsLEVqpydZNB9oParvCmMZ2XRruZVr5bLrsfKHvW6wuwewjRpkHEC8MXrmZTsgRJ5ex4Tz9iiGBLM88oZX5Py751kHKMexjXtVZRA',
        },
        '100': {
          node: {
            public_key: '02e3f95ce8e708ecb2f5b860182106a332525144c81c485da513fb896e31308c90',
          },
          xpub: 'dgub8sYQ2pDsLEVvBtn8hY1hVEfLRomqyqUAYpVscuJdg1rQu28PH6AVz24qWsnghtY9gsB6bpAeF7RUDseyZmbsMm5bsTekSeZFx1Z9RKCAjoi',
        },
        '2147483647': {
          node: {
            public_key: '02470316f367e1030602a0d4a5519f9e1c0270dd54baea095a4514c88d1d3d55e6',
          },
          xpub: 'dgub8sYQ2pE1fu2oxbYmKxrgwhtHHamHZWcU8iXbYT2baHjPN1R34GRtGi1fjhz5txzvVzo8rxbML9jpVha97sfp8z9EL4wte6N64EyUUaz4abs',
        },
      },
    },
    {
      method: 'cosmosGetPublicKey',
      result: {
        '0': {
          publicKey: '022c45dbbb612096bf508ebc05a8af8c28093bd3fdb80a12dcc34c1c2a57d6eee0',
        },
        '100': {
          publicKey: '02457bd1e010c51722b48fdfc78d4d3ed0bf9efd901f969418bbe05b2b55b77107',
        },
        '2147483647': {
          publicKey: '034f979e399c1d8bff49c21b69838f6f9fb1c99dbb45949371c05743d6a8de2827',
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
          xpub: 'xpub6CUdBa3ZBJNT3pNK13qgpVzun87pcJyvebRHVGHTzAcvGYTmGaijYesdv4FrLAL8RqNdKPwK6nyCsE2NkYVoubCQUaHXkwfN2fUcMq2KnD9',
          publicKey: '0368b97d1058965e73fe744986cdeb583cc9a88b469be1ea01220c919100242968',
        },
        '100': {
          xpub: 'xpub6CUdBa3ZBJNXT4gKekyweyvcfPLQEJJK8atVjbNUCrMgiwVPG2X495h5U6mjp3BepbL7PWY1bFLh6tj5EHavHcLLMvGNE9JMAsTpQ2E3ny1',
          publicKey: '03ce80dce9518b1f9cd3962c1eefb16adefc167b93069a8004c8cb7a151c475d61',
        },
        '2147483647': {
          xpub: 'xpub6CUdBa3hWxuRCXPoxzJqr3ACgpjMyMemf9mctW9YfJNXf9krbFXe9kChFhcUsr7QLwEkqCmhZuhHFaFxLHXYCPg613rfgVU4LP5izMpvzDM',
          publicKey: '0333be14233c10855a5a6cf476dd171c015fc7446c12262dc5e316648376a6b33f',
        },
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-pubkey',
      result: {
        '0': {
          xpub: 'xpub6GyKbZoWX1mUAqBaQE4kJTJqsijbjUbZ9Ydd7kMWVnSR4cYsQxaTBSrqJUcFCGtPHxBN1VectS7k765fzHkpZZ2Di9DdmfhZEjavjkqoZ3y',
          publicKey: '02e8344bd06de5e1590c40ae9d9d1a856558e81105d71ab34b62b07ab92529a6a3',
        },
        '100': {
          xpub: 'xpub6GyKbZoWX1mYYwUEUQjpQ9RxF8oQbuvoC6wDKT6EjriGdEHMcv4wys21gMb3LV5JVVajCtpdJWeEQbxfiVBvfuXMmFuqxJGC6eS6ZUiycxp',
          publicKey: '03e7c3a2cfd06c3a79345e412cf1aa6ebcd57c49eeeada2677edd86c1ec9763f89',
        },
        '2147483647': {
          xpub: 'xpub6GyKbZoergJSJKUUpSP8uEeZ5Sp3KnJZrKrxJjdpAb5TJdEbfuhnZTXpGg5gZrXmZkKjSqMg3KPYWVdSL8tZmLnsQQ6QNTVTNxsEU6xKDyP',
          publicKey: '0266db4202ccfc4713930997dfa9f788b07fe387986461ee59c41bf8275c487fca',
        },
      },
    },
    {
      method: 'nostrGetPublicKey',
      result: {
        '0': {
          npub: 'npub1nnxsrr0cy85tecv2xnn09g3g2mt4lwgea3n3zxflammjj5606pgqvhl8le',
          publickey: '9ccd018df821e8bce18a34e6f2a22856d75fb919ec6711193feef729534fd050',
        },
        '100': {
          npub: 'npub1au2lj4u4fv5qmetp9ptc883twqn3htdaes43vf427qyxlke3hvrs6k983s',
          publickey: 'ef15f957954b280de5612857839e2b70271badbdcc2b1626aaf0086fdb31bb07',
        },
        '2147483647': {
          npub: 'npub12ek78jnhgukf8ua0d3y7z0sah70zmz6qyd4mz7njas982y70xskq8cx707',
          publickey: '566de3ca77472c93f3af6c49e13e1dbf9e2d8b40236bb17a72ec0a7513cf342c',
        },
      },
    },
    {
      method: 'polkadotGetAddress',
      result: {
        '0': {
          publicKey: '0xb3c8d13a826ded7161e1af02d0be7d8e1a1b1167e646a9eb2e62eca4af8e9c93',
        },
        '100': {
          publicKey: '0xab2759b234cb645648f4f8c9e159cd880d0e860209275cb17af118a33df924ff',
        },
        '2147483647': {
          publicKey: '0x7910731a4172283564d596d2a42c695f45dea45d1539749a3f2e95668c2e08ef',
        },
      },
    },
    {
      method: 'xrpGetAddress',
      result: {
        '0': {
          publicKey: '020e4ef3b6bb6beb39b1fc7259623dfc15fc78389bac54936a413118af20cb990d',
        },
        '100': {
          publicKey: '0218e08ee62add5b2e96a953f774387681c8fd0ed169a4e895dcb1985cf0979075',
        },
        '2147483647': {
          publicKey: '0311d6a4a102cd0d635d89de2bec028bee92af2ad15a7d285b099a6c80fc67c5a9',
        },
      },
    },
    {
      method: 'suiGetPublicKey',
      result: {
        '0': {
          publicKey: 'b77e59fdb9e06740eb0bc21861cfb88ea7e5b682267c3f89ee7edcba04e26c58',
        },
        '100': {
          publicKey: '37288973cb1de51e3d9f2f33b3b2d548a03a15a6e20263379e4657c944517167',
        },
        '2147483647': {
          publicKey: '439757d14f696884f5fd0aacd154168662522318b62869c76bbc75ca5c6899cc',
        },
      },
    },
  ],
} as PubkeyTestCaseData;
