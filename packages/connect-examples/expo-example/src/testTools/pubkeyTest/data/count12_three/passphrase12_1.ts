import { INDEX_MARK } from '../../baseParams';
import { PubkeyTestCaseData } from '../types';

export default {
  name: 'three-passphrase12-密语1',
  passphrase: "qwertyuiopasdfghjklzxcvbnm1234567890-=[];',./12345",
  passphraseState: 'n3igG2n49CvSEt12j1jr4SKkp45oUWWmAT',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/427983033',
  data: [
    {
      method: 'cardanoGetPublicKey',
      result: {
        0: {
          xpub: '159a499d1b3c7d51162559c759a8a3e4d942d8d6c27e284cd6dfbd3e977933f1cc75b43a73ba8693080af2c6df0468f46516f020f0dac4557249d05be5d7c3b2',
        },
        1: {
          xpub: '88a9a2ec8bdea6b612faa678ed8cc05d2a5cae697de05a9f580a2e98ef4c9d7e7fd0773b6b8fd439d766f66122442de38c177f511acb4ad9fde6d616407ce168',
        },
        10086: {
          xpub: '20f4ba764dc5c8d2cadcf25ae3a475d4ffaadd4fa318582bb1fec336c7cbdf4aba6dc8605a7976e70f530e6e0f308a2fca822013c0c3b3b1406d13dae5f66cf2',
        },
      },
    },
    {
      method: 'aptosGetPublicKey',
      result: {
        0: { publicKey: '9d45273cf7fb6c5eca33e6d335779000ef734c0a7444d11e81a356709a0f00aa' },
        1: { publicKey: 'd9463f819b97068fd5cef1478574e93bbdd8a6f12ddcb158655acc1d17a34a00' },
        10086: { publicKey: '2c952f199d02a71dd6c3ee562a917a3034e981d94701d9e36b3dd3be5a2027bd' },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-pubkey',
      result: {
        0: {
          node: {
            public_key: '03a26000e7a6f9112857966330f99bc39b4c72526e5d9a7ee7923446d9818aff33',
          },
          xpub: 'xpub6FSCQPLVaoxBJGPoa15yXNQbXQ2v8aXzdJF9dz9UnvRGPuNAE6SYJRDXxJoJFAzXsg7hwFas5Sfq8h4YcAhEVrZxew46SBo5u5sqSVAUqXL',
        },
        1: {
          node: {
            public_key: '02c4176f68f7a5172e968149fb6042c1991dff3d84a88718a8ae51b830df866098',
          },
          xpub: 'xpub6FSCQPLVaoxBLusy9zmA1bPkYuj8KfbtVuyj7TebVJsGwr2Kmw8vm57muggPdpsfDx6VwHs73hRtMaWJf14qxkUKA3eDgLGZCmaeAB3bfMP',
        },
        10086: {
          node: {
            public_key: '03e4a93299cb46268286952029985ae43310f5739d4682f2dbf983a16997e4a2fc',
          },
          xpub: 'xpub6FSCQPLVap5pY9WfkBpzoxmBqqLu6KHKYARNCCWyWDQWrLWtxn34epmcGXRAYXssAJfoWTkxufwVGWPaXy9dFsWjWA2swaa7ruB8N9aNCAz',
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
            public_key: '027fb6d3f72e7ea4fb81f90135fb79054c4a5805e5ba816a90a848fbd7465b9cf8',
          },
          xpub: 'xpub6DUhZvNUUKSQz7CcupvnZxL7JyezFMoefzFzi7McvLzoQZFmT6ZCCmDv2XCnS4yMoocVPjf3S91GtPeBf31hvMxw72jbuFXDwKnkZ9wW35L',
        },
        1: {
          node: {
            public_key: '02c67d034e009a3f09340aaf1e068407f432600fb728b7949653ad781fb10cf8dd',
          },
          xpub: 'xpub6DUhZvNUUKSR4N3pcUNR6cjNTEeJRpFp75ahguUkqo8TvzghMbcuYDWibGoHiDdjyFS88emjE7ApdARxPyT9DanWEacAmPjmYiicnynEgX9',
        },
        10086: {
          node: {
            public_key: '03d365ec2d85679ff8258d6ed9516e3df1cd255a583c2cd59a94eec9cce579d4e3',
          },
          xpub: 'xpub6DUhZvNUUKa4CHJ6uHBEzoX1ZVrGa3f1t6QfD6CmN76XEnrDKc6wQuiJLuEUmU8w8pNEBnvWDY1aWQPvhNZeZtDGB6MmkWFgCGNjExDQSxe',
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
            public_key: '037b15dcf75879ca79c8d77445e5a68a3194136525bb020b391ddc795f62aa723d',
          },
          xpub: 'xpub6D1g2onaFcXxMwyvvJEKsnAEwCm7ogDziKMU6DnNVW2Hz1TAFyXjJCP2rvLm8JKrYdU6NdjJaHhLdNajmtqf9ouXddkGgZM5yox4wLsrWsb',
        },
        '1': {
          node: {
            public_key: '03b226870e92bfc8ff06144ec7d39bdfe5eae2bb5c04210640201a4226a254577e',
          },
          xpub: 'xpub6D1g2onaFcXxNWbniv4x9jLkHqdXVfy2Ko8k5Ea8NFz2PvqTgZbb5VktJ7Y6SF452vigMgDKyx1SXZM9ojBhN41nAuLG9VUuPnZbRbdhhzY',
        },
        '10086': {
          node: {
            public_key: '03e6698f32ca3d82b8ef43eff7e1fdee64a5e4bf7085f874c84330538a4bb59ce9',
          },
          xpub: 'xpub6D1g2onaFcfbZK671bqgz5Dk6GkSzQ3VZfRATJ3pNM7mwW5e5WAWC5yg53bttv4ye1DiV3TjUf8XCNwKGCPDapp53whyDNE4ae6kEpYuXxo',
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
            public_key: '030bf93615cbcba9d5bd5d95a09aa5f2fd9f12974818cd1632c6c593c774654af0',
          },
          xpub: 'ypub6WiY2ZE1hetLTYoc6J4zfMGWgokRZ3nwmNVwzpJHk76VA1LiCvTpBRg9HBH7PYMeqr8zC9V7Mit1tB4x7FwbF6fQGpiRqvnVo6T7LmqFLtC',
        },
        '1': {
          node: {
            public_key: '030ab80a4d0ba4f47e2e454de36b868c931bae6177b1c213c4042ff54284e9b434',
          },
          xpub: 'ypub6WiY2ZE1hetLVxa7Br7Cy389xxfaXNX6b2qvw9bfznQTo4cFGK8ebzr8rPTqAiVFZ9zmRGRqZp5VyLimGo7MwQL6zoUwruGqKZYLrG2q76K',
        },
        '10086': {
          node: {
            public_key: '02325c03a9b578eb20d3a8dae943112e42499d42802afa3e5b173117df469d8f56',
          },
          xpub: 'ypub6WiY2ZE1hf1ygTtzrydEJdNm5CrFUNhsi5YkH2QmrN33L9aKcmqKRpAiNNLUzkXGhi5ZFNusK9wBy5PE1SMPt4A8KLGRPvCs4nYyrYAoXhb',
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
            public_key: '03d4532ff64f94e6cdecfeabdb4bc1f959b03964c329e9622f694841c6aa823099',
          },
          xpub: 'zpub6rANPKYi2Wc4sgPopdTc3stLnJEAd91UhNwGfGZxmNHy2gmJRAds8VCT68iWL7yzS2jJSiytsgxhUrynZEYjn1u4RVZuGNQepmG3S9kzgpN',
        },
        '1': {
          node: {
            public_key: '03117711e3aa989d70d229f1bb31be906b218f01063606ec03c3c2af43a6c47453',
          },
          xpub: 'zpub6rANPKYi2Wc4v4tA7iG3PBXAHHtygwqJx6GyyRCJLVyStecUoQVTKo23binRGjQYBBTKBWVYzw7j1E8CJbFGrPLW676jhkysNesWFGr6Eax',
        },
        '10086': {
          node: {
            public_key: '03292db3fe964a1fbdaf4db1d33c0f6ef75a1d84bbc8d60447d8c4b1885795745b',
          },
          xpub: 'zpub6rANPKYi2Wji7Ny4DMCEJdwKJr76EfGz7dQEqrQ6ZQZzHyEmCaQm134itfaGhMSeCXhynsEoSuv9sdEszCjyaseUJRtsd1GDVL2avbcaNnx',
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
            public_key: '020ecb0aa62c85772be21092b0633efc123daa9ec0524d0f0904c4036aaac5c939',
          },
          xpub: 'xpub6BoRxKxhHFeUeqoxHwk5DKWVZQagTBFzS54ZcChodUr5Yj82m22WPhPQRoC4ijKaEdKGZsh3pV3jXNgGMJqFVKGrhVitn69LEPtMcTUWt9r',
        },
        '1': {
          node: {
            public_key: '028048d71978957a5a63660403198e747db0289cedb873330002cfb092b53b5d9c',
          },
          xpub: 'xpub6BoRxKxhHFeUf9CaPTDG4stBDW3zmxaTj3TrzDQhLW7VEDbJo3ERVULrg9LZmq1rhJWn2ipam5mdouZy7DHU3eCMEhoG8jksyzsV1p8qh9n',
        },
        '10086': {
          node: {
            public_key: '03ceca20eb21255fa9d42282dd6155910098e0d0d8adb0a0ec1500bb3d35b2d8e8',
          },
          xpub: 'xpub6BoRxKxhHFn7rxAT2zb4h9xcn8MBpcFJXb9AeB9onfcs9nKPGcdjU5eEHR8Pkv4totPg6cYB2QPgr9khSLTqKbwKgXL2TS6YNwVbVXy2S8k',
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
            public_key: '02ff9531ad6ceca14dd4553222b994b1d87a0f8972877f590b319ff62222f90f3d',
          },
          xpub: 'Ltub2YC5zuvVy5VRuws9kcJwW7U1bP6wZX26y5KtL5xYJ1DT1hqdBCeV1CK8V3LJD2dv5aGRNoEgLCz5odWD561darvkHXxexDdkvEgV8kcBW3k',
        },
        '1': {
          node: {
            public_key: '02303c4d57bf79793b5fdb7b1dd607312e8eeceb279858a2741de40bf3b2bf843f',
          },
          xpub: 'Ltub2YC5zuvVy5VRxnQ5dmBTxvnqm6oxEPgmxZ8RF3XZCrVPAkWr4ZEH6YTW7K9Mi2HGvd2c7tzCVwSSQBctNFWbSHpSZu2Vt45DDiupT7ypLRL',
        },
        '10086': {
          node: {
            public_key: '026a2fffa7b994673f781325c16b13f5a10ce1576546835f0444d9c649cbf0835b',
          },
          xpub: 'Ltub2YC5zuvVy5d59F4hBLXuordvnLHbHLxv8uxguKrSkUkFDnj2PBZuAwngXMHjMri3zezEw7J3iMfDr9EsWpgizGRgnFJ2rVdxpZni3bGGjfT',
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
            public_key: '02aec7ae3ae76efe1cd95618480e3a7a0bb203eaa45e021450947ef3b682ef3355',
          },
          xpub: 'Mtub2t28xnVEaMkQPYHBDc1peJKXhE7kSzvUF9viVE3KnCakCN6gbtR6M3AtKWDf8T53jPW9Jj8Keg3Fmb66xeoKERs7o8G4apKX8UhynHDae3Z',
        },
        '1': {
          node: {
            public_key: '02cf8123f003f81f4773ae1744e560ac3ceabaee0b3381b32de844c617ecb07716',
          },
          xpub: 'Mtub2t28xnVEaMkQR4Rt4RoGpJ2pNVgVxrkRoL1kTFwt4DtTYvVKpKeESKZb8kPGCyp736wyjbvArbEp2qEEj56ZHN2nMtwYydLHV6H2j51nBTm',
        },
        '10086': {
          node: {
            public_key: '02bb96c8e0fb15e0fc54a3c0c6df2a3c116953267013562ba3778384005568cd18',
          },
          xpub: 'Mtub2t28xnVEaMt3cG3WLyzqzhWuugQE3soiphAfiVq6UD3GX9Lf1zbeywirM3xnyM7BEYkQKA22rLaA5dm1i4fxP4AhcYSxJzomPBHGasnqydy',
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
            public_key: '02587154ffdec120989a2b2cf368e69ee96c22c0adf1159c739d0e4acad7eaa02e',
          },
          xpub: 'zpub6rYLAfP1mtcSwt65Pf5bHk7bV6BwCsxfBK6BMFZzy4ajaZNhXpgT9LjyDuEGCZxxNH4g6QxdjwNZFtB7YcYnvxe3VE3XGrGhinTj38C9Zjh',
        },
        '1': {
          node: {
            public_key: '02d04d50347e7eef1f1ee5aa031b25c4fd91ba7bb06abc23aa9dff95d6ab8fe6ec',
          },
          xpub: 'zpub6rYLAfP1mtcSzTkoyz3tiukYUbsoWReZnjNRAYXHMbzyNzfJCNAapsJWMGgRbhP9GVce1LunBZCEutp6yVvMc5q4bfabkrcU5rEadCjdeRd',
        },
        '10086': {
          node: {
            public_key: '02c774fea85b691e4f90ab7edc1661fbfc2a16b0516f3eb80aacdf905853a9a4d7',
          },
          xpub: 'zpub6rYLAfP1mtk69EYb2d5YZWnUPtRTNdVmj1AwaHBbYGCVZ7hhvdDM94EsKvhd5aQJNfxkzdqd47kpVa7tydBFRNxZMSFhCPqknXmD3DqoiYG',
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
            public_key: '0396220ec9c6b2d741efc950142971204bf0a32b7f744115d19cfa03da7e45e594',
          },
          xpub: 'dgub8rnJ1kqxPLZ9netU4aRMqPyBRNpWuCrfD7We5ebSZiYCXmPaKyGqGi592Qrdn9pbcyxJi9dXZoYg62E6ZPssRdoV9FGD4Td9WZRePRTtT8Z',
        },
        '1': {
          node: {
            public_key: '03aa87864d2200b3272963d5c8f1399b5d265f714e5dba7317636453cf06222058',
          },
          xpub: 'dgub8rnJ1kqxPLZ9po1PWuFQZh1WEhTzVCUdAdVadh7Tp8h2RVmFu5Loe1V75ciibv8GPLdeMrRZVYVTQhyW5JeoDZXHFZPvJQ6hZHmRfqZKhgM',
        },
        '10086': {
          node: {
            public_key: '0271df0988e738d883ce45853f1018ec056d25abdf3708e15ece8f192649254671',
          },
          xpub: 'dgub8rnJ1kqxPLgo2UMusSgpR7PN7DWYnJwZJaM1Hs3bL3WTtXMZyeDAU5YY5n7FjAxQ7ewJptfVVnptmtgtEvPDKuMm3V4wVXxLGdkmvfumpG4',
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
            public_key: '026f92f0117f78d71af96b7cfa1449f409de082e1b1632851b6dd373bac41e1c31',
          },
          xpub: 'dgub8rq4tNziuuSFHhZBaxNMtEBu5AHwt96Bga8rxVkeVJDLVgUEjLygsQBjgustfLYLrs7jQLqJpAVhgammxZuMbmfFKUhXsxvGyNAgAUT49cx',
        },
        '1': {
          node: {
            public_key: '0250a2128c6719a1fedb3be3d7e33d90388021acb5844e75768dcbb563a28d31fc',
          },
          xpub: 'dgub8rq4tNziuuSFJTp3mcWQ9GCsBgQkdnVvWZcHy7JtNdWdeNtxY57Kjbn3e5FX4J64XPGxBDp6XyAx9r9Pxz9tEKPmERwbE8bCx9nopE2tvJU',
        },
        '10086': {
          node: {
            public_key: '031834f531ac312612c6ebb017048d008be122131dbfd8d30029a29513965ad110',
          },
          xpub: 'dgub8rq4tNziuuZtUoRWHdsRoWdXMhZrP9JVUE5Ytxz7rvFrVMbg1La5hM55e56eRMBkj4E9HJRcwzupw8yf5RghH36mY3YTsK15VhqQEjrExfv',
        },
      },
    },
    {
      method: 'cosmosGetPublicKey',
      result: {
        0: { publicKey: '03c2d9ac34e54b0fc3a689a218a68c705149b04bd4537111002f7513b0acb5ff80' },
        1: { publicKey: '020dca3f57f2fe4adfde0cbb1306cd8106711d574cac044e261af7ec014248780b' },
        10086: { publicKey: '02689ccc373f91384ba0c2ce44f2584337bb4d9478db70e6613b9244886a4bfed8' },
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
          xpub: 'xpub6DAD6SRGfNeeTtf2UpfwZTGDqVR6aP9z5cK8iFEfzPzdThNhThtYMar6soVF8FJRNFV2nmWMmdpHyJ8c9c1MCfjP5oUx7hFVF2YF34NwZ78',
          publicKey: '02eb51197b5f4627893e3e297e32e61ad68ca109313d3178b8cd711e874a7c8a33',
        },
        1: {
          xpub: 'xpub6DAD6SRGfNeeWJR4mr1kgsb8c7FFtKM3KAh3mKJVJE4QKFRWcpkbK2U2tMjr3t4f7eYsqAHHajCQAbjGb3QAsEMESuBseQ6LfmrzXTa4QDN',
          publicKey: '0282640e38f06fa71b1ad19dd860b2ed61a3370530b9026af5bf7581ee826afef2',
        },
        10086: {
          xpub: 'xpub6DAD6SRGfNnHgYgGryQyEyTUnJ7iM1Fv1fUTVMewM73SR3k32THPtb6PFMnSZovLGnyQUz1sNB1yVTTe2xAssUqwxSX8SYQEcV42ecAaZRU',
          publicKey: '03456a5d810eed86bf866083981d20fed80a6b84ccd2f663c03f87ee8881a859e5',
        },
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-pubkey',
      result: {
        0: {
          xpub: 'xpub6FdpU3kKoHrNfef9EbiMEDmHEQC5225ZEiF8MrtakZiewx75aJPxTdJLMXozC8hJonZvjCP99tCYpEb1TQvtzixZSh1C2m4DdoZ6bSeG8yK',
          publicKey: '033af5a0e239fd7e75dcd963326ba5215e5523c488410d91f07960d2784866de34',
        },
        1: {
          xpub: 'xpub6FdpU3kKoHrNiN1e8GogzWR14tbxYyqBQ9FgWadgouUfkZH452J72kQ5EqLLtCc8mQyTJLAcvYp5WCFYPhgFFsdhVHKxxjfA5Js7D7GTArW',
          publicKey: '038188baac170388339aed1e2c0e46c189e9547dac51333c4fee91cd3405d75dca',
        },
        10086: {
          xpub: 'xpub6FdpU3kKoHz1sR11MnBL23fiCFomiCiUdJh476BjyXqUmMEFWK1qHv4srxu1BbGXFDhWUj4HCdzPVVNkoiaTrAGtFgMwTkzjTVmwBximLhn',
          publicKey: '0373e92a54bd7e101adbf6869243cac211e7506d8649e0c466edf4ca27deefd521',
        },
      },
    },
    {
      method: 'nostrGetPublicKey',
      result: {
        0: {
          npub: 'npub15g7rg3w50styyfyeuy68czrhlq9erm4rxa9s7lawn6zh5sza9w2sa7pg3n',
          publickey: 'a23c3445d47c16422499e1347c0877f80b91eea3374b0f7fae9e857a405d2b95',
        },
        1: {
          npub: 'npub13lh7sspxfmtd9jm9kwhn8hmeynmu85xmcfj7l5j6uv3ed3tp7veqvq3vqn',
          publickey: '8fefe840264ed6d2cb65b3af33df7924f7c3d0dbc265efd25ae32396c561f332',
        },
        10086: {
          npub: 'npub1kk2qdt7nqkujektp3xgv3scxgtn4d6jy08969wcv4gknf04x5zxs5ljl66',
          publickey: 'b59406afd305b92cd9618990c8c30642e756ea4479cba2bb0caa2d34bea6a08d',
        },
      },
    },
    {
      method: 'polkadotGetAddress',
      result: {
        0: { publicKey: '0x0456dde76a32986140d42f97e5b2a1216cb68c0a274bddf0b3c7d2f685233bcd' },
        1: { publicKey: '0x52997bfd494043c2b0434b3262f88e0e5aa1a1cdce4d4015c039188a05699934' },
        10086: { publicKey: '0x314605149f3112388a6a9f3b9b32796a70ba09b8dcf124a42dcdda1051de9239' },
      },
    },
    {
      method: 'xrpGetAddress',
      result: {
        0: { publicKey: '032c0f82d50a40a1ef181fbc33f35d2bbcc50b26a0e40c6caedbf9c952d70458e0' },
        1: { publicKey: '03d2dea6d0724a28a9e50c370db1edd4c748c770eef2c30dd48ba3ebced1f38c36' },
        10086: { publicKey: '0278da3617256d51a88943cc30a974a4bd10fc34ea2db11b1ec34460803f7859af' },
      },
    },
    {
      method: 'suiGetPublicKey',
      result: {
        0: { publicKey: '2a46ac3afc27e81039fa5001c88466b556c6558b4c811c8ed2ae7eeb057fd33b' },
        1: { publicKey: '265eb886d38848524b737e3ffa2d6e7409cbeb34720744e2e1ce665bfcc312b1' },
        10086: { publicKey: 'a254b772a85ebf65ac6a422dae9dfa626c63521e0485ceb8b37d9edc25f0eb81' },
      },
    },
  ],
} as PubkeyTestCaseData;
