import { INDEX_MARK } from '../../baseParams';
import { PubkeyTestCaseData } from '../types';

export default {
  name: 'two-passphrase12-密语1',
  passphrase: '56789',
  passphraseState: 'n3EKBUnoqYtYqg7qdUyCpehKXsuq1tx3yY',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429457507',
  data: [
    {
      method: 'cardanoGetPublicKey',
      result: {
        '0': {
          xpub: '7391bbe881d801695737b073be06bc77679745e2488f29ec917cf178aae1651f8b9c7293967d1ba022abc45fae53a63b3281b8329e22b06bee807619c6cea415',
        },
        '35': {
          xpub: '3ca0e0c6d55c0a33e1a78e4bbb917e7e4944181ddf0c7e74299a62f6fbf29583b9dd97104c369599025677b7d1e1f540ea5d2c9f3ff37019bfebabd630937704',
        },
        '2147483647': {
          xpub: '3ec372fea205b1d2147982ede3798137ba1ed5fa7355eeb9b50a8f6ac36614faef10e1e7512c73c66bddd519de9a66346d279c7fa3a3488486de1dd3b3c99ef7',
        },
      },
    },
    {
      method: 'aptosGetPublicKey',
      result: {
        '0': {
          publicKey: '21cfde36adf650a52e0e26eaf36415ecde45599a1002bbc29e1f062a681d6a78',
        },
        '35': {
          publicKey: '5bc430c5c53b68d0af7f4cea21cdb99b45ec3d316a5d16936957e1271b04d2b8',
        },
        '2147483647': {
          publicKey: '254d2b54e04f2a4a9e0dc92da84fad2f4cb6b4971147ca83277741f980ec54cc',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-pubkey',
      result: {
        '0': {
          node: {
            public_key: '032ca52393360a5364b0a3873e5ef0ede79bb35b3261f72b212f8ababc21244baa',
          },
          xpub: 'xpub6FpFsjvPVx5UkVDDn6d5iH8d14nfjuEoA2GUDF5txPSotM3tZ7q5pkEWZ7Awwey8E5S9nCTGjL3HTgeutcQJkRPGQxDQRnnKR8X6DHin7nU',
        },
        '35': {
          node: {
            public_key: '02ba5c5fce22a082b442907b27c6ffaec9934035485a10f6ed7ea1d6d7d4a5e142',
          },
          xpub: 'xpub6FpFsjvPVx5WJ1jxMwJ1DEBSwxzfWMNLXRp5nwEgvS1yce3iaiLBKrM5151y8yoaKbQmKa1eyH6uf117vyH3CBHPpoHCQNeFiCtSY38H3ck',
        },
        '2147483647': {
          node: {
            public_key: '03ed3cbda72bf2bf8522fe956cabdd859a55b2a5faec26c7329a7046e03102a2da',
          },
          xpub: 'xpub6FpFsjvXqccSu5CTMYSiAw8m1UVvRyEnVCWSTdskAwfeNd2WqUaSVsefNvGWuFNQ1YAxHp3a8f3bEHTBxx9pZaLUsE2WEJcEVw7MG6NMeKA',
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
            public_key: '03323248ac03c39fd316e2af7d31d88f574ca0ace58f641942433791ff35c05a52',
          },
          xpub: 'xpub6CbkAHZeEHUTSGiW5bWyaLyaPChrW3BnmMPhrbSARmPv5CvMaLVrsoMsezoPNMc8y5gQZsp8RjjSijAPYFF2EyvZCuceYdMvSJA7sbPGrpQ',
        },
        '35': {
          node: {
            public_key: '038af4906e8acc0baa80c78b4cbc3f94d69a284548daa61aaf7fdfd010e5290bcb',
          },
          xpub: 'xpub6CbkAHZeEHUUyrEFo1sHiw4cEozAqoJ4J1qjrdqkmnaZzrqYetYyh4gA1WM7WM4Z8bV9WMuNhcaveq9ALkbDqNW7N98tYjxnhZec5rMSntJ',
        },
        '2147483647': {
          node: {
            public_key: '032765a7931a70dbcf778dc3d12b611e670e9575c784047056477a94981846e719',
          },
          xpub: 'xpub6CbkAHZnZx1RZNzYLxrchcW2ndmAEpiXCb1sRPVRPBX7er1fxDiaNgHRuBLaZBy2o7oYKTG1hS1ah4ijT8cFt7QQwutFmLhtELJxgUrJnT7',
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
            public_key: '03c06bd0c712c061bf707d68b52395cd1c058ec151fbbb6f0b6b6a63d749a550d9',
          },
          xpub: 'xpub6BsdUtf5SPRAAiN7FnY83qrwZVSddNSTjGsLxc1Y9a4SCxq4Z7EqQgZfNG4RGXirUWpzaZGXfcNLixeDWBkd6CkMxE311dU3cxm87o3ju4a',
        },
        '35': {
          node: {
            public_key: '03bd1a1545f10a14e3342a79587fc9fe354fa31f38f3a19a4508843598c8bfca8c',
          },
          xpub: 'xpub6BsdUtf5SPRBhT9XnWGcmAaEWmwZM5rm3aNQQekgPksYq6cCdy4KQnHNKKRMnawZobuzBqhWtdGk7QLoriTCJUFcHJND9G4nhH3czU4Xxsu',
        },
        '2147483647': {
          node: {
            public_key: '021f222bf79a49d7939e31238cb8efbee8949348f7ca83f586fa06011122551db4',
          },
          xpub: 'xpub6BsdUtfDn3x8Kw6eh9XBtMnYPUU56kFgzYDPEHj2KygFpUcMn1mya9CVGqCXPDygiQtdtkWcmsJb5J6ik54suMnzcb1zDDBzrZhFPdPbHgn',
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
            public_key: '03e0af77701061f598782c9dceba054fda7e56c3593e99a090d2264c7c4cb735ee',
          },
          xpub: 'ypub6XZhJvB6cox8GBVAvEV4awmcjfqzLv8ryEa9eub5psoyXzxak1rfALEWJurRUHY5kZwPEY1XJ8FJgPSUhnAti7CEPBDdrVMcC7WaHGJAe2u',
        },
        '35': {
          node: {
            public_key: '03c4db21cffd198052ac6f8915d8314d37858242e9e1879a1fc9fe8501b0ecbf72',
          },
          xpub: 'ypub6XZhJvB6cox9o7rrW8SjxpkLEbqrBCCjmHf8E3XicSYXHgo2SpdaBasGjQq6cYHKR6tQ13MTKJfPinEZ1BtFpgBuPJzjD6zzSYYrqhCHFNw',
        },
        '2147483647': {
          node: {
            public_key: '03a1bf4c3b89c52554000a37bc57dbf7e20c91c31bd741395de3c14436f8760bed',
          },
          xpub: 'ypub6XZhJvBExUV6PHamgjctitW6ZVBJeUDB4aUDhdQLqG6QDLwoYRUG3dRvVFAXJmkvT5xq6gWn5n5HEca7gtSnv2p4oihMbxTfgKp6u9yF3LV',
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
            public_key: '02a181e022a9715655371bdcd892a24e4087ee69b94ff1724a87b608337bd6cb40',
          },
          xpub: 'zpub6rDWgwZf3kxtnuMrBTY4GSEFkEJZVMWcEcP5hkAbHWE1DfqevS13UrDhfzdn2Kp6QzPUy1z8padw6pEQDS9exutzwEXPFM1LXzJtKYJLadA',
        },
        '35': {
          node: {
            public_key: '037401e87bc2d6badafb3a938dd409b06757c3f82b6263ae6ab02f831a7ab72254',
          },
          xpub: 'zpub6rDWgwZf3kxvKCgaw4sNgg47wLG5UEer1Rh3hdZ1hdjHcybFSq6ajuLHfEdXT9LWQUA1xpt6g67gZ25L2ZSZpMYphqgzZCfbUmSeTfFDSrh',
        },
        '2147483647': {
          node: {
            public_key: '03df67cb0650bf8720059327abafafef2b4d4bddeaed4ee765069b7a50e29bfd8a',
          },
          xpub: 'zpub6rDWgwZoPRVrurg3QSDVyNNVwRWMzh6tMT2kZKvibLzQUuWCgg9FjFWgjM8hrTHcffcwoRrUnCo3YkbrvM6aR9bFUoAeuj2SNVuZyJRQdk8',
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
            public_key: '02f539226d32b3253e0141e593f5938f13c91eef76e0986babdf8354d96196e28f',
          },
          xpub: 'xpub6BwSUxUPe7Fxapsnd5wv9CdjAzDYZP1dMwYh6w1zUX4Jg2XrFhx7TkJ9JeZm7Y2qS51wzkCqCac62TUdVDiffbRuce52aH6zX5uUFFRroFz',
        },
        '35': {
          node: {
            public_key: '0297eee518cc54f0f667664ca3f9badeb8cb1f968687992d5b49eed02791868b44',
          },
          xpub: 'xpub6BwSUxUPe7Fz861JBVw5Qr9xcc3zoQir7ExTigdMi4foAH8yLm4Yyc25px5i4vyGqFG8ubqoz2udpmwy2xrig21GByauNuKb6Z8MawAt8tK',
        },
        '2147483647': {
          node: {
            public_key: '025baf8b82e75618c77d24a2ae8f5cb6ea91a8efac35b8ef0fe4c4034c5dc78867',
          },
          xpub: 'xpub6BwSUxUXymnvig7ooAFYqdSht6eyuQP81bgYf1pizMF49Sjj2fR92KXjBXHb4ZXdvvxtM39C44L8KACioAadqizDFSpT4KaeLwvH7HMRVFj',
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
            public_key: '027b304926883dfd64a4acc48c490f32609cb6b433329573d826d7973acd534158',
          },
          xpub: 'Ltub2ZhhzjEVffKUYEZTf4C79MH6CFeWgjgzsWDUY4h6Bw3yheUyTnFs5nxyJL8XQBw5jopUsAhoJR4FhCYsR9cPAt2wnRyAjhrzasAb9uqtehL',
        },
        '35': {
          node: {
            public_key: '02539b062b98164edd10c3f4a8a35120cdca9179abf178cc623f3aa5ebe6bbfd33',
          },
          xpub: 'Ltub2ZhhzjEVffKW6XVUZaxYEqqjAUm9fbEpyc5PavpH44Pjj45L54p6qyy34fZizuAwgNugDCzQLubxzNw6aXzLYY9FUprj6JJ8kwrESrtQChH',
        },
        '2147483647': {
          node: {
            public_key: '02e4bb849d9d105663db04b3fdf2a1ec0415b4ec2c5cdca22bbcc5c54895ee2064',
          },
          xpub: 'Ltub2ZhhzjEe1KrSgDgD2pN6u5sbBGkqy5NmERqQiTsmrDfHkWQW8bjRa4wLxN7aPaxCkhskQhfc3CjhVpAgCW7EthtNeiDa4TEoRMYWQqNyrX6',
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
            public_key: '02742ef328719bbb1742fc731e215183dfd1cb36327ab44777753cc7aa700b8ec9',
          },
          xpub: 'Mtub2tUeUj6R4L5a164N21H2HaBqzYpTVjyaWgXGGNdYH7Mv85QNDGCdXMDtZg8uGYeujhr9mZ46BG6nfmX7Y7PYFscy5JVxTFT88GMCYt45Hzn',
        },
        '35': {
          node: {
            public_key: '02139b1cdf4864d1052a2b0fd6c3a6427ab97c2e9dfe47fc9f1a19f55ec2b61729',
          },
          xpub: 'Mtub2tUeUj6R4L5bXsMA1mXoB3h243wCQK6t2B27aMPG4ZpoFLdvjdzL3jZvnN2ktq7s5zoahUDrDrgowqwc4SruTLQnR8PQCuqZRX95iFVWRHv',
        },
        '2147483647': {
          node: {
            public_key: '020359005f410d054d6bcbc63421b54152dff361353dbe1c6eb8641651efe5fbb4',
          },
          xpub: 'Mtub2tUeUj6ZPzcY7CCmjYdWUu3VxSm7hUvBwT3P2A1uXWyPS9fmutcFUgwaoPadjaz9NcTKm1FML6jCHHKNZ85USiixBfakZFxFgdJotehDgvV',
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
            public_key: '02d1ac7f95bf6828cce052cb76ae180c82e45728caa227b5125ca31287350aa86c',
          },
          xpub: 'zpub6sC1vd1qDyiLKr1koMQTRB8Gt9f7eFzK38KosiweTBCsctvWsYnuzeQmqnu2kX4n1rByt1gVCncKgBAGhMB8jea1ewPbPjsVStQr23BCL7y',
        },
        '35': {
          node: {
            public_key: '02b5bfeb5ddfc6360b3ec45dbacd4f89d6fddd4132d3486ea3ff49fc9b0d2da7f3',
          },
          xpub: 'zpub6sC1vd1qDyiMs57M6cy2oBTpa1yoWX9NPLBsBkxie6Kfk4mwJienavnimirhKpCzNXP5uyAGudRL9VWh4b2dE4i8SmAYtHfmsmcxyTu9HQN',
        },
        '2147483647': {
          node: {
            public_key: '0365edf9a7e4b9a726f5e6445e058247cea4a9b806d9596de609c78e46fafdc752',
          },
          xpub: 'zpub6sC1vd1yZeFJVheFkzi89XJCsTHL9X83DSsq338ssWcMoYMF5gNi9WMYwnwwXcXWpv2YsBnm9WLSN73une34MUx48QqotKZaHgC5Drcg2yS',
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
            public_key: '03f18ff2a4990a06ccc4b0555915a9fe841e38f735f378d40d9ce80b82314cf122',
          },
          xpub: 'dgub8sTDGjerfRx8Fmz6ERkS4PFNz86JvD9Dp7wm8kwFEw1Ppoe2sun4SYxbfdGzu85TzZLySWTARyXJbkvBebc9vVMT9Gnq68E3xcJFAP9cEmN',
        },
        '35': {
          node: {
            public_key: '03fb443079abd70040e8f444af725b5311763865b1522f5fb0dd2254b68f002497',
          },
          xpub: 'dgub8sTDGjerfRx9nGtRwf4UkbTraoN3JtGTFM4om7cU456RX9uPjh4gNCYaLdRX76eWrmK1J9ShoySvHPxod3HB9RHyDKkAvArGDhR2MUeZSSq',
        },
        '2147483647': {
          node: {
            public_key: '03b2ff27b1593d982dcc443ca9e6319e12130310e2d38028c14e957f470c289c04',
          },
          xpub: 'dgub8sTDGjf116V6N7WDGHDdeXHLWhwQ2rJ1yh5F2hHBnqGqYVYLxy4Bgu3wQgJVXMfRkrCy8ToWiMkWG1yr126rCtR6b9t63BFxTagqkWJYpFy',
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
            public_key: '0374624885b136a3980979f919a0a6ff23b91781e67281a52363517b20bd87e12c',
          },
          xpub: 'dgub8rV3Ap8HRrYH4GAPjS9xa6Uj2YQ3cHfZ34hMuEhohQN5EkTT8rKrErf9XBMedBMZTxFK3qcNxMxUi44cB8GgJ6fUFVECkMFDw2jwJtkztd3',
        },
        '35': {
          node: {
            public_key: '024534cbbef6e868aac090ee7011ee23b2fd998645dcb69ff68c852d2330133144',
          },
          xpub: 'dgub8rV3Ap8HRrYJcLb9kocYF5UBLGdNt8P4SkbUgJX24JNMEWg4pRUB7uiJYFFTbwYifJhUu7ijJWvJqnL5aNV4qXfC7KXfQDqFpobv1NDZbSV',
        },
        '2147483647': {
          node: {
            public_key: '029c65f89b1cbd9cd55ec27d607c151d7ea13447f53e241376fc1d591d8b3fb0c7',
          },
          xpub: 'dgub8rV3Ap8RmX5FBfL8zBHPQGZqp82WhmCWfXLkJ679eYX9rexCzUf6RpyReL4sFbrybW99rT7RgKndrXPTErA2xq6r4AUnZxTvV51U3XT1GXu',
        },
      },
    },
    {
      method: 'cosmosGetPublicKey',
      result: {
        '0': {
          publicKey: '03c14577d348d9f1deabdab9174b448f85029aaa89a0e1c8a06b0ad60d4daff792',
        },
        '35': {
          publicKey: '036af0cb840d60dfb03e23885b2c0f5db9c0017b75181723215641944bb490bf37',
        },
        '2147483647': {
          publicKey: '03378f47fbcd065f13d63c93698936350768c23b5612ed4545bfe74e73d0292387',
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
          xpub: 'xpub6CYN8qm4RkeHJMBAaCB7ZygpCNwVqc9dSwWoQg39aQEQcrEmXgbSeuQ92QWuSvhgSf5FAe5vBHZku5mP4GaWcCbjj6dQferCupk1FSpzQUc',
          publicKey: '021dd7635ce15fd82898b2af52a09d24b43da7cfa6a62018183b540fc2d71a8fbf',
        },
        '35': {
          xpub: 'xpub6CYN8qm4RkeJq1p8M4qmDV2Loi6EaDREe16g3tBNuxGa4vDeCDrbs8AGEcaGPmN13CbhMbKge3krUaRPzjwPoTh1g1JQbG2QAoqZkh1rf6N',
          publicKey: '022b11b4934fcfb6fb99d52b767fd5fe60511e8c83f085cc828ac61ace0e18ddda',
        },
        '2147483647': {
          xpub: 'xpub6CYN8qmCmRBFR9Z2q7wRbtXkMMT2fdS6MwwhRMTjXjWHECP5cZXWkvuSHRDCht6ELhz764whH5mehBEjyP4t7mynKT1UqgniX2HdWzNrJyG',
          publicKey: '0220100b7823a289014365fd0c29cd416f063a8d493b511d7aa07aa0898e1ed1ee',
        },
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-pubkey',
      result: {
        '0': {
          xpub: 'xpub6GPje1gUZAcqMwLJUrPae2j1GqAbFD7L87AzfW95379M1erbLKGzvMEaoF3112QfCwNhn68oGMLV2u4yGH62JHz2njKEDVcxUNKqT7Kv4in',
          publicKey: '038b9037c6fd5024cd2e80479817706ce37a0205fb4d0d8ef74a48e8cd694e61f7',
        },
        '35': {
          xpub: 'xpub6GPje1gUZAcruFupzs4V5Pjk7q5jxjgE6uCVRHcraELg9QjBodYhcv5fu8Q43iSmxgKYLJWxZqQcVsVxXft2bvdqZoUuTRywHnm1BP3yYh7',
          publicKey: '03466a319fa58db8d00385c3984f1399bba3649a52cfbad5abed690755f2b6895c',
        },
        '2147483647': {
          xpub: 'xpub6GPje1gctq9oVrHMp7a2yYLGYPASGASQHrmYzbMQacWvhRzFxCSZhENtVT3ourFUe4aCcjaVkuNf3h83ZHGHxs2meeaW8iDbVZdkMdoq3hZ',
          publicKey: '03de4a93d8449a0fc11f87c95b7e449dc072278540e1ae2460714aa3c3792d73da',
        },
      },
    },
    {
      method: 'nostrGetPublicKey',
      result: {
        '0': {
          npub: 'npub1tqd5er283xzrfekcd9f0cufj2e3uwlc34dg5knhksen3en3w6tqqsnfmv3',
          publickey: '581b4c8d47898434e6d86952fc71325663c77f11ab514b4ef686671cce2ed2c0',
        },
        '35': {
          npub: 'npub1valwtzytmts4gvqlddlnucg5zppjf9vx49qtet3wz2rlgxzp9qlsr5uw48',
          publickey: '677ee5888bdae154301f6b7f3e61141043249586a940bcae2e1287f41841283f',
        },
        '2147483647': {
          npub: 'npub1kxuy29wa4huy3pvethh2dhelrgn5z44d59r8ntru2mmvtkeaj7espugglc',
          publickey: 'b1b84515ddadf84885995deea6df3f1a274156ada14679ac7c56f6c5db3d97b3',
        },
      },
    },
    {
      method: 'polkadotGetAddress',
      result: {
        '0': {
          publicKey: '0x89e6e02f7013b8a95a4bb3a81537e4f6644410a4e6b956826b82356e50ddc55d',
        },
        '35': {
          publicKey: '0xce286c0d94a1e1cd7f316210800b09264f714d3376d112a759e986f86b1955c9',
        },
        '2147483647': {
          publicKey: '0x024f4a4ca01ce63035292c5c6ad3f9599fcea84881c7aeb7f40993c90aa39096',
        },
      },
    },
    {
      method: 'xrpGetAddress',
      result: {
        '0': {
          publicKey: '020621f30e39c6a30c6357a681326ae661ef07f63f670017345a38263037e01fb0',
        },
        '35': {
          publicKey: '03d753c86f5913c314a1dc8791058687e0b0357840fa6bbb3a2cbeef89dba1ece3',
        },
        '2147483647': {
          publicKey: '03efcabc9058a0d9b2dc019e09360ebc7b91b22bce4ad6ec1d905cd8c1d3e31363',
        },
      },
    },
    {
      method: 'suiGetPublicKey',
      result: {
        '0': {
          publicKey: '916f4e93850a63568ec9a326d4b660bd0a79f1faaf0d1f64cdea537ffc6b4b6c',
        },
        '35': {
          publicKey: '4a229f68fb2e38a2ff6dc18693e45502c62e1d8c14f6249b9a278d2eda2419e5',
        },
        '2147483647': {
          publicKey: 'f1693ee1b4ca8103089c1a232fc21a285c978a897ff177a9c505742909c12117',
        },
      },
    },
  ],
} as PubkeyTestCaseData;
