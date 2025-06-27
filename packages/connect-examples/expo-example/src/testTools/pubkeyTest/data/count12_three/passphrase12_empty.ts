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
          xpub: 'fe04d33cc1593459f2e418aaf80257059556c122c02ca2033fbe1b1de48d3fa83253224853a90128a627b061e3ce4c3061ba7a2c3a3a90a7dfddc54d22702314',
        },
        1: {
          xpub: '27e41a47bf6c498e099a37bc0dcc7b89fbfc2d877ef76c44527bafebb4d121e14c315be8a32d16366ae2cd1e2dbb499f9c517888c26d17486520e6e039668e79',
        },
        10086: {
          xpub: '1b0c4746a74197034874f9018d4c067a5e124c2910e288cbb747568e51cdf494eb25844f5203d158b56374fed5b00f9cd8df9b8b285bb783db028d1d79133aa5',
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
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-xpub-48',
      params: {
        path: "m/48'/0'/$$INDEX$$'",
        coin: 'btc',
      },
      result: {
        '0': {
          node: {
            public_key: '028de8c94d6532354cd0bd94b95597b0d0c730ef2c8654d6c71cfffcda4b89e4e6',
          },
          xpub: 'xpub6Cx6jTxwx4jEdnmf3KawzEHmFnscP6XfaChG7nAw2pGB69nW7rRiR1Roiwff7s1zWMtKXoskpKnakUa4zrHvYB3E55ESXeias2TaFKdyQKX',
        },
        '1': {
          node: {
            public_key: '026898c6adc54bb7203443df3fcb57163f3296261f180a78d77aa39fbffb4645f4',
          },
          xpub: 'xpub6Cx6jTxwx4jEfu38oPM6ao7BUY3VrfLx4JYZ6VQquyy8SE4R3EaLG8E5hd51LZXwf6GVMCoSxVwMjNRR5kLpRpJUtpzeqxUhwoXERrkXNny',
        },
        '10086': {
          node: {
            public_key: '023e811db3b65aef850ef72b666dfff6814702910c637da9d3108ba77cd980f961',
          },
          xpub: 'xpub6Cx6jTxwx4rsqihWAnTxKpaaHBcB8UysGT8zQZc7VM9YUEe727XKPhK9in2gY5Y5rFmjLuWJhPTmQBXXTSPbFwpoLwX9tSxxH29VRbUAoor',
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
            public_key: '03cb95f38245af3415d6e3f38cb10cda5c7402a1b015493097237cc7d5d42060bd',
          },
          xpub: 'ypub6Wr4oHo2wdUiXVxYb6pqthK3vYsxzmbrizvTePRpMbHxbdcL2GyN8sZJpvd6bRcQ1jQy5QPfoZZKZiHGooxUYMVHEazKyja3b53Db2n67Bi',
        },
        '1': {
          node: {
            public_key: '0297f1f3d48b7e44555eae4e3353fa5b9d6591eab56b6c230149279c39a4f46399',
          },
          xpub: 'ypub6Wr4oHo2wdUiaxb4xJarvVxqX2e1PNHejAhaW4u2ooTTP3gVeJqk73Kwv88Eb3XEejimD6E45n8ExDtRU1h8WbAMg3CZHvRvbeaxhTjjXdr',
        },
        '10086': {
          node: {
            public_key: '03b52a1792be447145e721cd9dd1a5af8f57249b38cd4fc64d09ecc02d94442844',
          },
          xpub: 'ypub6Wr4oHo2wdcMjdDvNQKyzyxUQUYw2579aLSL2jwgadJdTL7uqD44zidxT2tqoqqYVS7PxsP6QQ48AH3VUqLvFuappvNhfyzMRjpkTgEDKan',
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
            public_key: '0213f6c248e80e2b2c3ca97948552034e2f8c16df5f7f263bf91f48de962196060',
          },
          xpub: 'zpub6rJYLZ5LT5Wv9vvddx4wUUUiZmQ1qgEEtxQEAMoiDHMXGgMp68jDZaFduUG7DxRrvsu3cJE2qY5YccpD6L4DUYjB9tzhSKSMuSe6aC5YZFo',
        },
        '1': {
          node: {
            public_key: '020244632024ee8bb82995191f9391aa8f95af818c89940b2ec6f4e99e0df1611c',
          },
          xpub: 'zpub6rJYLZ5LT5WvB5oy2xbwxBe4KBVpp7CjN6g4nEJndy6phwQQ8NvnrjvxdrWsuG9nLEmpZtC1suqgatH6zFbx66Ln2EpGVQsB96kJKVHr2Qn',
        },
        '10086': {
          node: {
            public_key: '03a36cfb72a4e0fea8f8511fc59c81040295f57b18afb45e5d6a45c387b5e3d5b8',
          },
          xpub: 'zpub6rJYLZ5LT5eZMp8DsYRMWF65WkRKTXUPdS4yZPr1avFrThs9Tax8YFT3hrVwnm7fJN4qeNNYJpozFFp3wpk3eMPYsqqcLHyBoaQFtYM5RuV',
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
            public_key: '03ffc6e2d0828f07ee2d8139ce967343afb84452787fd932ac1001eb084b7d75c3',
          },
          xpub: 'xpub6C2BvGKCHGsa5HX4HwLaVuXFcfyB1K9GiAtLtvC7Nsq8k27jvTG6oHNmYzhEmNkNXjosz55EWSwisx4k6iwcv4Y9TXy3kvwhvWYzrDZevAr',
        },
        '1': {
          node: {
            public_key: '03d87b4c5f4f1d2adbc20e4a0f288ca95b94c684d1275048a68c32de59e24b7ae0',
          },
          xpub: 'xpub6C2BvGKCHGsa72gBtNZuThAoWqSM1L2xgbsS1utE9gacacLsSdyrYnewWRFyZjWULz1r7W3Ww6AwHsURRjbYNpo2UdNPHQVCRByWoZduVBQ',
        },
        '10086': {
          node: {
            public_key: '0301368588f84db92480251aff116fd3cfcdc099f451a40789c3eb9a12cb0d5b07',
          },
          xpub: 'xpub6C2BvGKCHH1DH6DtYdzuhoyMoUnpRGeXhJSam4yFhAvT66LSJuUH1VopJjGxJyTBsq79z26D9XgmiSQKozkmq3eGUp2Zr2FoLjVv6X6FNqy',
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
            public_key: '0365c280f06f9a8d63a262e6c743af9cb77a5a320b65ad5d77208f28fde524179a',
          },
          xpub: 'Ltub2Ym8ugNMXTe8Wnd6NYFz1BBuiJhHaZJAupbucQv4kGx9zJ9mFdpZYVW2XE3TcM6wxrLwTw9o2ujRpTvqLPVMpz6DyXUn5o5qpqKoE3ajxoV',
        },
        '1': {
          node: {
            public_key: '02c9d641baace79de01fabc1d89a57af1db434f5af336d4eb809fa5f5866564aeb',
          },
          xpub: 'Ltub2Ym8ugNMXTe8Y78hpFQQBcykjKYjQrH6Ss5wrayWJCTWGrQnvxtwbyj94XPkNQw7BQ46s6K3nmGqrf4zghDhMC5Y1v7subscMMENDWsnHge',
        },
        '10086': {
          node: {
            public_key: '025ace17d1465aee4d194dee6b995d3d8f0421948d24f8b99c2a5ff2cb46a1460d',
          },
          xpub: 'Ltub2Ym8ugNMXTmmk9YHCYg2Gh7EZEmJwrFrqBP5EuNYs4jWCSqDGJbHFSjqxZwJX3Ge3VtEqEWkMZbMUkyvaR3faMy7dEbJo1PGV94ccdFMFbF',
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
            public_key: '02c343a2680ab747d6c4151bc25fe43530ec9b6223df5207bde669c8a746621e4b',
          },
          xpub: 'Mtub2rwtdZw8DBpFt55QVSkCwpiPxDivso1HPFMpFWWb42GMSRK2XkpQiCgpAvEJGqVZzAfpuEXhNaMKNtnZg2M78gRekbUSqDYf7TgPbFkWk3G',
        },
        '1': {
          node: {
            public_key: '03e985f24d7dadab7c4ed68fa657b24231590ae5bce3f4fd16fec5523188d15560',
          },
          xpub: 'Mtub2rwtdZw8DBpFuxgYu2B61DWj1k1Pqp6aZBVygya4KcgfirgWBhfjzPRT25nYvGxAY5EekxEBy6AgJHAVyZaZWe9gtakM28tzNYKQJurkjcy',
        },
        '10086': {
          node: {
            public_key: '03ba313cac4d8cf91f1e85149116d7c3e0e621c6796681b5474b88d081a4e005e8',
          },
          xpub: 'Mtub2rwtdZw8DBwu5oGaNjbHbskHaSwEuCLKZBnJgsitnyCdpKd1aXCixpoiWvpEP9gevWxmb3CzkEZg7Q3ZSXzHJJaLwjzTdWbqPsbJL3aiGgA',
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
            public_key: '03e0b626995e668370d34a717543f08862d9d41cce97c8bb084e9b35d08708098f',
          },
          xpub: 'zpub6qPuPd6DGzAHP1CaVZ52eioo46gyYcEr5SbUQnkZ5LyBKeqfHPfyC3euXmAjs6erNk8vWDNmkLhtfHwT2Z6MRvrAtRXyX6fYuWkyTc8KBgE',
        },
        '1': {
          node: {
            public_key: '0323912d912bd8f71a01bd66fab3c0b46a346bdd1edbcfbef6c5de428b3dcc08ab',
          },
          xpub: 'zpub6qPuPd6DGzAHSrU3AQvntLJwVZtY5Zu29yZSFUpvHYKYnmPCin6HU2kAAu8s8TyUo915f9ko64X3hk2Dnh7uZ28znhVsfD8yfvyyTpr4KYj',
        },
        '10086': {
          node: {
            public_key: '03230925052ebf2620dfa0949291f9413f5593b9b3bddd54a9293a8005a4f38eae',
          },
          xpub: 'zpub6qPuPd6DGzHvcqCAsyv36esDYbvJa3usW4Vvw3Cn1bM7rY8XAJpiqUoQQ367KreM3JHWwgzj5rnYJNDM5pt9huTuKcVcGaydAcNqJSmaNmW',
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
            public_key: '030993475b45260b21409d8182dba666a079ea05262ce7ced344646dd58e1ecdc0',
          },
          xpub: 'dgub8rCVjWau3aAmaq2ZD4z5s3iJe8AtWUFSxyV3jNFWXDCCpjuuXeXZDeintWiZKoK6dGFUMoYLeWAsh1YV3vLDs2AKahV6ms7FaNE33H8jaiQ',
        },
        '1': {
          node: {
            public_key: '022c8efedb848a82a586af9d55be59938e72fc2cf25c519675662dab6c28643684',
          },
          xpub: 'dgub8rCVjWau3aAme4UtrqxYXNNB9umoPkQJ8MAXRnTpnfAgi3HSXNPoUFPSkDuZfRGnirAbvJambwik7VPfEPkq1ywbcXwAjhZEjgYtRZXytMy',
        },
        '10086': {
          node: {
            public_key: '02da9f29d9c24a318041a40cb9eb2d97d4230cfc116f20f3a035222744625d757e',
          },
          xpub: 'dgub8rCVjWau3aJQpKGXpmf6cRNH2WbCiMUv4xPEzF3uCvf1BsjeDHx5pUdkqfs2aGiUn9pD49774yZScpQG1PPyyCm32geuRK7gJaxe7L15Y9o',
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
            public_key: '0317d52dde6a600d95608b5d6bb0047723ee75510a7df2900307af57cc18948353',
          },
          xpub: 'dgub8rkWkCbAYVdn9HiWT6e8GWEYCPEzf6Rd5E5Xpnys9wkmgwA93cuwD8QpzHfe7Fk84smHY3EWo7CF7esAGQ7RFm5xNaGB58M11Ku3rin6gJ6',
        },
        '1': {
          node: {
            public_key: '02b3e0bcb84b66e52945b84fb02cef92c88f7e4cc320b4bf3e282e1fa90625fdc2',
          },
          xpub: 'dgub8rkWkCbAYVdnCE23zY5fCjSAy5mt5YQ9sMtFffFXYmbThkUx6Lodd6pQRKLzVn2seiQ4KsBtMy6JTdPGaqFSb6N8dFfDXMLMsWnLVRfjzk9',
        },
        '10086': {
          node: {
            public_key: '037a6d0700ad27c465130c873404da04a5ae043b7056256c29c7d35cd3f8f76634',
          },
          xpub: 'dgub8rkWkCbAYVmRPMACKoJD1WHc3XAraKdYejUH8L4MSpCAm8xHjM5YXSJpAPFpp6MejwsRHFK4ggprppFG9JYLYUYsdf3x211JRFYZU1tNgnw',
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
