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
          xpub: 'd2842b3ee614a3b3aa03b9b035c7022f2a45a1ad052e75cec1b6e8a56dd9b0d1f1aa96d04b11332db0940e11e8ac5a4043f14cabf97ae7745362a58c6fb303a7',
        },
        '100': {
          xpub: 'bf58bd02d2d6a6fff2bdd168df731446cb03e55943b67992ff1656e07da5876d619b8193717d650a1a03d5bcd0bbd4f6ffe1cc1dedd4c3e197b6f7929af146c3',
        },
        '2147483647': {
          xpub: '80e3e994accd90b95835fa93b84088720e68f4141c57cbd19abc3ba619b2d851460ea7f464d28fa34b4b452e09c453c7b57d0d99ae3a77bd6329c6255ebffc17',
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
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-test-xpub',
      params: {
        path: "m/44'/1'/$$INDEX$$'",
        coin: 'test',
      },
      result: {
        '0': {
          node: {
            public_key: '02c604a164eb8f5595bc902a665809afeaa9e2ccebaf5483e78865dd6032e3feb1',
          },
          xpub: 'tpubDDDeNn1oS4EQiapCcEiPKvqYQC6ktkfGZCJ8ktiaDwETeZJQEJ3Q9PW9avku7MR7qiyfhoz9jMLZ2P7CBWND2AiQUCz7dnfqVFV4ZLCjfWi',
        },
        '100': {
          node: {
            public_key: '02bf46eff8badaa3a24eecb8d36e34952f0d4b1e44e298f54c6bd814a2cd742263',
          },
          xpub: 'tpubDDDeNn1oS4EV7Uy2AxfRxzo3EUxMapoHBtZCWSR28mKLBisKANKgTbG9s6FSTbvpgv9jnEBbukscV2VQpZBh5JWW97tLj9CQuBtAyzavvK7',
        },
        '2147483647': {
          node: {
            public_key: '02c6e8f77fe2ceea712ebaf0e8e64fd5ff2fc10cda0c0915e5c9681c0ab4ce1c84',
          },
          xpub: 'tpubDDDeNn1wmimNsyMMxJtkLj6y2okUggWnmhxzm6coP61ReqFBqyJGS2GNMdi2ck2TjaqyBPArWEmUBXWn2w9o4Q3MDdFNVv9VtCTEtqQ9LKU',
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
            public_key: '02688451da54836daf7a49101e9da68607ec19cd021a68009a41e1152e0ea66efe',
          },
          xpub: 'xpub6CYDjo6VKrwytGhJEPr9Sqrz2mNKE5UDGYeepW9S99zuw5kvPEFFb22c4NEMzYMXpwCbB4YGAeuf6kqWfikMvtgPY7pSCDcY6tEy5TNfSho',
        },
        '100': {
          node: {
            public_key: '031079e57399364e241081a30ddc67a73c9f195fdb7733f4eba2d515e8e9186ae6',
          },
          xpub: 'xpub6CYDjo6VKrx4H5JPvb7sUeBP8mADdZL7XkKHdZbdzzKa6ZW6KaNjedCt6E6V1HBuPxVMtD4jxZEZXjRAFphyu67q9viw6ECUY1H3i1Z5Zz1',
        },
        '2147483647': {
          node: {
            public_key: '025a9bd990dc6eea9ae61a0b5141ae0eca6bb322b8138af7683ca1cdd680f7eeaf',
          },
          xpub: 'xpub6CYDjo6dfXUx2d8yqYN3GBc93rdYk1HFG1Aaw1wNx7WMFp4XZqt4upRBGtViPG1V9fUsmWLT1nVaZrmPQC96CVT6ic9wMZPDxYrAqa8UR2F',
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
            public_key: '0246546eee12211c9797132c33aed28502372acc384e41ffa9f0374b4ff76858b7',
          },
          xpub: 'ypub6WyZd1vScGMnU1SHa8agArSiW2t3DP2vN6yoQ285zTU5AFcXncHz9X2G3Mr8aTmQubWCWbHCPnbWUjFNU5Z5FLsW1drycisZUzV8pbUXJfo',
        },
        '100': {
          node: {
            public_key: '03c64f0e511937bfe69fd6b319580a169cec36984f6434e798988c86d206bf23ce',
          },
          xpub: 'ypub6WyZd1vScGMrsbJU7dVa6p21v6c5fZra6LjKxBUMyTnaujzMXDJcmRJxiXbZs3TMXrpZbxa1iuiNVPm9HcQ9PQmbU1YXvCR2ZAKf8hHchea',
        },
        '2147483647': {
          node: {
            public_key: '0315fc9cc877d6821672ebbfb8bd2ad8b0811a4dfb117ce01572ee7721413f3eea',
          },
          xpub: 'ypub6WyZd1vawvtkcnKakzczpHkoejxWyfySDadaEi6S3nS4U2HL3xVmDFB9oVFcTyM69ZvYgNut1HE6TkHgrrotfLouywnvPdVdFHG1ayNph45',
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
            public_key: '03235ed8400b7ce3b247f7225043665cf3b7f8395432e4b8551f49147efa175f73',
          },
          xpub: 'zpub6rtSQEydfFUAChHuZxTiBJKPKnvK3G9GXqxjN6yS4bokw38awK4hcCStDZpVepx7jvd5CamtoqiPyUDZQuJveLM7xQFyDKpfaEJVm8qj9gt',
        },
        '100': {
          node: {
            public_key: '031ded20e4df445593551136c23237f1613e7969f581263479196fd847a6627f44',
          },
          xpub: 'zpub6rtSQEydfFUEd3sQQwro2gS68fQgdaQhZyJ9ypnPdpNbhWfZ8FNajhrczZd2w3z4HNMadMkuvytqdcWFE4MQqnDupwMqCRQwN4NaVGzkbf9',
        },
        '2147483647': {
          node: {
            public_key: '038a7ec4361d990dfd957b67d3f88ef335641c1ce2c2c19ef5f9968d3964e085ba',
          },
          xpub: 'zpub6rtSQEymzv18NSWaxWuvGd12vSbfbGn846W8gi3Fbn4kXZoUCwNRXTP5rak4PCqtyLVVtCNhnUh3dNSD4ncHtQPXUgH2adEQYD9Pb7tUSmL',
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
            public_key: '0301046b42958597343989553539a9d9027a4bbf4aeb0fd9e145e4c144a5da5102',
          },
          xpub: 'xpub6DEVCTJfpMQMnngDbJtR8pbp6WtGf9VG4xpbeq8XVAiMRUdijjEMFPv5Lk5b1Qwki9Ves4qpoVxL1cuEXhGaaxDYuKRQHBFCMF6KjWrm8jT',
        },
        '100': {
          node: {
            public_key: '03b9397d0afc6cd4ee8f2caeb072c79dd2bd341e785d8882f6614a1542b05cc3d3',
          },
          xpub: 'xpub6DEVCTJfpMQSBq52LEAWHVpoMxfoVc9ibifo7xinjRXPvN6sPq9nseBxgjrgTfnbNJx5x2oKvTKtZxdYKKFudzEykLE3tgxkSJgzaHT4npd',
        },
        '2147483647': {
          node: {
            public_key: '02f0b2eb7e02dedbac482c5947fccf7e9bc17ef77df113d050ff61c39808ddc7e3',
          },
          xpub: 'xpub6DEVCTJpA1wKwQVFJMR6v9qhxPBeb6TPqzWxsL5wUNjqdhi72zThBSwFqjRypN5cT98vB8Vz9iEpEcWhFKHGjBJkZejd9px7WPL2CxRbdds',
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
            public_key: '0277a460b46810be46d45ea7e042cd3484f8affc40d3b5e9ba346b8cfa9e2c7051',
          },
          xpub: 'Ltub2YEjAaQkhTLktbwRG5erhe93wZb6QySbRFiRcWVj8iWk9hVhMtv8T5ufSTuqqa8TW6o7rMRg4cbc1TshRnpkftWEy8TME28JuqBKz4YuajA',
        },
        '100': {
          node: {
            public_key: '02e10b12947a3ee4ffbc677608aa0223203322782b1ef7814488f079f2e54e109e',
          },
          xpub: 'Ltub2YEjAaQkhTLqJcx16xzHRuKSrAyK9nFbNkJLVGhfqRT8UMc7pDJ8991QgPK1rSXoMTxPkmwGxGrHx52eDWrUDU3qZKubpd6wGqbN5LyFU6u',
        },
        '2147483647': {
          node: {
            public_key: '03a3f2d01e7178c09b3f9bd266333cd8ac1dc20893e019f94707db32764639f34b',
          },
          xpub: 'Ltub2YEjAaQu37sj3312AtmBdKmBywU3dz43c6Gq8X4nh8QhiX99Zdf82J5oUZjR9SHPoVpubbeBDs1L678q46Z4XZnAJhcFTgRAY8rD9eX8sFm',
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
            public_key: '02b7dd8b51321a7a41d626e07100b92e9ce2207410490c65be0eacacc62175b420',
          },
          xpub: 'Mtub2teevoYWZzP5p8P6uxh9BgmDZHMrK2tWjK1LaDCkHzVyzdEzogGP5H3Qh91yst8m58p7pHLRvX33ChWvTLzRiHrvfZTDRRfgBV1aLGx8Eim',
        },
        '100': {
          node: {
            public_key: '0302e3c5b38f0cd597acce2ed91fce325ed29d6ec17d5f7c16c689f2408a46c805',
          },
          xpub: 'Mtub2teevoYWZzPAByrQQ1ZbHcKtsvUfZuEXProqD4X1wFQ5kYuBbYrKZ6u4i5orjrkJK1arStPiDSCWXzWyJJdT6SaLnUQRYfAMEEC42gFvwxz',
        },
        '2147483647': {
          node: {
            public_key: '03a0766fa038ffa8e0e35a55d1e95542135b94895144b86fec333e91601a3c5845',
          },
          xpub: 'Mtub2teevoYeuev3wiEUcxSLdWnogUfojMxbH9D9UMjG3HrAwmhetM9gLjQReE2uTbYpsRZtNMPiby5xufVuGvXy2X6wXn6TDBwnN1CJbW8hzne',
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
            public_key: '02849601af2ae2727f6e1095f6f4cb5f77eb2103e791a0da758531b0a7eb402657',
          },
          xpub: 'zpub6rYeY2C5XinL11q5yZDefJF62awJJ6usyQFiNmfNDaJHC4aKQGmRQphqg6aen8b8MPPXemm43G6HmAWBwVJuL67VWjVViMED2msxxos77MY',
        },
        '100': {
          node: {
            public_key: '03741ca069d2ab0582bc16f498a693bae3496e1afdf3f6725b94a63c289e4b1b60',
          },
          xpub: 'zpub6rYeY2C5XinQNtbZ8yJjpZiYZbwUrw8PX3mJUxsN1wcdpW29AV8dDtaRjL9cmNsienFsdBANSubRcHSWjxmFv4Rkpb5m3nkeqcoY1dRztuh',
        },
        '2147483647': {
          node: {
            public_key: '02bf225510b82381b82d10deb4c68474ba48233e49fc38f55d83ce49e8ed7d6d8d',
          },
          xpub: 'zpub6rYeY2CDsPKJ6jjDUCrwj1o9gP4UiqNjRnYVHN5zA94MD3ND5oSY7WGz3NJer5aPozcQbKprnT14GSVCbyniEkofxXUSnSCdqbRPg1LjMmF',
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
            public_key: '02ad8b32f00c2dfdafd04a61e4385787741d341c786c8bfb0d5e05d32fa0725876',
          },
          xpub: 'dgub8suDZ5kdzNq6AYjqk2D4kbvgeULiJA4FJfQKuaPWWbqHjuvy7qcK1NJ7Aw2eQueWjYgqjnZhTq8jwoqouRa8erim4z5GeKKg53ePNVo19rQ',
        },
        '100': {
          node: {
            public_key: '0344cf42d86db5d22909d0db2e1f1dda361425c2d60da22978a3d62dd20ffce57e',
          },
          xpub: 'dgub8suDZ5kdzNqAX9svMDRGexS7rtFhHaJcaM74c6fwNPLU5VXriKpGUPRiMqhEyZZSomFN9kg4yWLEJbyFN82kzggcNXyzDHobPctS5pCFrDe',
        },
        '2147483647': {
          node: {
            public_key: '03f62d63dc93aaae6058ea3319d18704dc4a6e2c9110b0cc2bb0765e04b85c10e5',
          },
          xpub: 'dgub8suDZ5knL3N4GUgdjodouvG1kcUAHK7nvZqqTC2GQ8Mzic2RKh8tK5RQPY4TtTNroBvdh95gNScQ7ZbfTYSGMqP83q2AGSU92oaVfjrqxcM',
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
            public_key: '036b2ce711edfefcdf0160d02d6471f8ebddc1d3bf16206bc56e9e100d7517f123',
          },
          xpub: 'dgub8rp2sCUsPWgfeF8J1iwkCiL7RJ7zbYzv3x8ai2tTJez19uQjnavXbshDVr7SCQQAeExVDMHiqvdPr9exoScYPapUSDqrzVXDmotTVm16CCJ',
        },
        '100': {
          node: {
            public_key: '03c9514aa7ebc3d0e00693bcd7f09a1e014c79fc04d663637cc102c6c80dde4dfe',
          },
          xpub: 'dgub8rp2sCUsPWgk1h6vH4SGLZGJ4EbpB7KJzzDkM4BKC4P728KUzQvBmoKqyPHRgNSzJaVtJESiRn1YhX7iaVsUYzi55fkqRWHhYEMgCCaU6cQ',
        },
        '2147483647': {
          node: {
            public_key: '03148407ebac2d96be3c7023027600be87d156e18735438802ed5c9ddc11de4387',
          },
          xpub: 'dgub8rp2sCV1jBDdmc7Z7JvzGyB2Gff8sFFfXhbDJ96VLct4UnfPDZQe1UeBc6XnFmp9BBCfKGRYjMKD8P7MxWsQJYyjhv2T5PFK4qsCHat4NTV',
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
