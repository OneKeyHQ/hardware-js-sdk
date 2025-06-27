import { INDEX_MARK } from '../../baseParams';
import { PubkeyTestCaseData } from '../types';

export default {
  name: 'two-passphrase24-empty',
  passphrase: '',
  passphraseState: 'n2XDwPTRoTrLUxu25L6XDnyDBuDeXhjmoz',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429359364',
  data: [
    {
      method: 'cardanoGetPublicKey',
      result: {
        '0': {
          xpub: '63a464052027e8e3790f25dd7b4f469b6710820b402b20d5da200ae98b45362bc4c1f8b4d7828d9d605f4337c35fe3aa5b3d0a05df36c7f84e04439ca2545827',
        },
        '100': {
          xpub: '9802b00a957997017ec686829f94cd74cfde83afb837fdc0401ee93018a3743aabae7d1c9d8db00a66dffba046127ba24bb470cca999211e8fb05037a0f0d98d',
        },
        '2147483647': {
          xpub: 'fe9e5c22101a3d5cb3f0a6c619a8e38b1e72bfbf86246a2efbb32dd8eb135b212a4735df5ba111cbcc7b979f0a1d195b4c4daf412085d040b37daf1290488394',
        },
      },
    },
    {
      method: 'aptosGetPublicKey',
      result: {
        '0': {
          publicKey: '38465d91aa4ebde5fb6729ce218de85189955bb482e4ed28b73d5b377c4d79e8',
        },
        '100': {
          publicKey: '4b2b839a9130a93e0aa85b8fe97498161035489321cac89ccbe70eb1f68cd42d',
        },
        '2147483647': {
          publicKey: '205e28f9b6eeee0c1ed4c11ae760a6af669db8959476dd00269b120cb1ccc22c',
        },
      },
    },
    {
      method: 'btcGetPublicKey',
      name: 'btcGetPublicKey-pubkey',
      result: {
        '0': {
          node: {
            public_key: '03b15acebedd876b1dc992acd683f3d0c94048f08f9583247fdb062a62872ab197',
          },
          xpub: 'xpub6GA4sb59mg7fxLtZFPW4NWorGSgKkG4wnCu4jw7yFfgtDvs3vE9LfFxYvRUgDtfAAdpLWjKDzPAXAvHDHgvEzhkegfGSY5RoHrQcyxaEWrQ',
        },
        '100': {
          node: {
            public_key: '03b71f963af5d86478c47435a3b6b10a8e754f59da18eb7bd33d239f44692f4cee',
          },
          xpub: 'xpub6GA4sb59mg7kNKWzVoxEQowGC69M4m7iNnZezVvRme2Jx5VghgW2hQiEYYbXCyPL1uxLhDr6WrMFf3UCVVXP3Z17UqAwfsoqAKvazrx55QA',
        },
        '2147483647': {
          node: {
            public_key: '030ba32a7a49783f23c74b54fd334d2a3474f67866c96025b65a5b1899560e6755',
          },
          xpub: 'xpub6GA4sb5J7Lee5xsxVUUzaWVwwK5AjsSyYb8UevcmhWzdb41SeUtenfdey4r2hzKrgZE1oXJoQXtdbUgn9LWBCHPZ9feGNdxzqFo5unUn3xz',
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
            public_key: '03ee9f4fc2e3c7a4233cc96ab0ad6b71f22567970fc1944896bcca365e25817702',
          },
          xpub: 'xpub6DEhxDPPZQsaTHuKKL1nYnP5aMmyk1gMm5K5cxM5VjMxjAVLwa7fixeTrbHZ6TSvT3Di5skXwhZUqG9FA1hgUiuf46BqKJWiAAMBXaR4bB5',
        },
        '100': {
          node: {
            public_key: '027916cae4615ddc0678148f052a447e93e409dcb85552f4223f69be882266e6a4',
          },
          xpub: 'xpub6DEhxDPPZQses25YQuVBSRGfWJ1JkSZmwXXqYWWG5EWGWSfF21mtmYq4PheSW589NoKRSVDKF9AvvAFv7KVGwTDviYMcG2R9FHgBMGPAQxN',
        },
        '2147483647': {
          node: {
            public_key: '03648e281f983faa26dc65559502a4cf78ba5c15cb6be4c2527d5ab8b4843b432f',
          },
          xpub: 'xpub6DEhxDPXu5QYb7TPv8DiDL8mmnZdE7TSEztmSTNJdXT5kjddJZYpuQF4LPkkc5Strgj13scAuSWWNpqk1BSFe9CVzgYM5mBFmopVV8NHZzq',
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
            public_key: '0389f4b6c5d24e3c5d7dc134a461cc0ac8c27450be7d76f6bd45c7425b8e4d4d7f',
          },
          xpub: 'tpubDCvmPuJWTYeDrMJevJkMucMGgrwC9AX2akntMN99Ziyu7KKkYV96Y6MoJP1APNjdzkpqzbNTDaMx3X6b2A9JrtF2ruxyq8hz9XUHE5egA5s',
        },
        '100': {
          node: {
            public_key: '0328c4aef72476d1ece785e9196b2b8750d7725ff9d887cde23faf58d91da3946c',
          },
          xpub: 'tpubDCvmPuJWTYeJEQvb4NZTKJpsEmG2D1okUExdgiBMGgfHjy4S3YXzkTXgpKvLohv35Wp6mcmM9MDGRS34Y3mrKMdLSqvkrNc9o8w28n1W87p',
        },
        '2147483647': {
          node: {
            public_key: '02f68ec36ee85ef5aff53e87be4e2b21b22705dcf1ec41806a1d912ad7121c9f2c',
          },
          xpub: 'tpubDCvmPuJeoDBBy5G8y8xWMGEqYcucX1sBtpjxTqqyKjY8CFxGo1uu3N8JkyR2vj4baHjLMvbCn7S7bi2xLFPYUuPfNThVYQqyJQbyh1RMqDB',
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
            public_key: '0384d92349bc74029c3aef6039ca5ce07d4aab1f67fa4ec1f7f556cadf3c54c28f',
          },
          xpub: 'xpub6BxVKTDo5rmCfWjV9ebSYzrUeVa7G4aTppn9F37MZn2wkkLqPQj483351iLEEW83AkUXq1mv9oKij56jAaNzpycLUaAJCCjkKms6LnUxhtv',
        },
        '100': {
          node: {
            public_key: '02b129fcd320102ddb332019095d18aaf33cdb2aa502d64ceed4f9ccebc4a66dea',
          },
          xpub: 'xpub6BxVKTDo5rmH4K7xqRS6BvYHR52roqufXuXfhApvDXYXmNVjHHJ8GB5LZHq5vQB2mYzjMigAbc81wDD82uaimsrRNipdgmfxbF8i6FsqECf',
        },
        '2147483647': {
          node: {
            public_key: '027ba3636b651099c068d00a555add7c5f3e0885ef0b03a8650649b59fa59897c3',
          },
          xpub: 'xpub6BxVKTDwRXJApcTJcTazWs2p43XWuPeDBxQP7rrYiaq7QM8gy7KFobghVUo6BfcF7RXrefnvq4cwMNV1divLwRhhzZpv2SEHZCnUF5tf4Et',
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
            public_key: '02df90b7ffad633765448e8cc24914a140d0d500a8bf548ccb0111cb2cd40b7bdf',
          },
          xpub: 'ypub6XUaxLRpEB95T38MFvdyfEzxpy7HBDq1suPLFA5RNZF427pg1xjoVfqoYSfYL5cUbdRrkAYF6YdoqpoR72Mk6ut7S9NmpsLEaSvKryniTkW',
        },
        '100': {
          node: {
            public_key: '036881b6d6dd756316522c37c5d773df4fbc931504efeb8aeb2d6063300bb11c65',
          },
          xpub: 'ypub6XUaxLRpEB99p1EqdDPZQ7igvMFsjg6wvCZgssSmFQGsjLGG9NXs8DR4XUpymNTPjeHRYFxQeKpYrLD1cyndPGmAxBWMHoNZLgaZMdu2cdM',
        },
        '2147483647': {
          node: {
            public_key: '0334a6692e96202f0cdedde51898be9a383a6a17fb96cd6a138fbefa2e7c579cd7',
          },
          xpub: 'ypub6XUaxLRxZqg3ZUmdAD7a2JAmW7QBYLfx8GaH6Ds7PP54gxjtCXta9fQdiS9oRJk6HaJBD3fJjSaZkipQgZKLDdWkAvdQjhs24xHBiDhyuFL',
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
            public_key: '033bc11e73356462a2ec1db11137cd964bdb5f931a82a487898374c0e723228e3c',
          },
          xpub: 'zpub6r3z44qwabd4ojKi9h6jZczAfLM9mxpaoT9MVAifoBeFj1QYLRxr5WFnQwvd5MnvCegxq8JMw2GQQKc432YvGnWmov53PpFSaN227UszR1k',
        },
        '100': {
          node: {
            public_key: '037e2b564cf3f6d871d7c65210c4eec18382f620450735bd195de07927b9b1671e',
          },
          xpub: 'zpub6r3z44qwabd9DFNdqWhheQzxfTvCt6BoPwKuaTZcDuZa7z26W5YvZbxxfbdyN1bVM2QCFg4bn3C39GBkCC4PaLSsJZ97ojnm8u8RzS9mVvu',
        },
        '2147483647': {
          node: {
            public_key: '0323a05476e17275eb6d4f4b52bedb6919d099e37dc08b1fbe71542fa27ca31577',
          },
          xpub: 'zpub6r3z44r5vGA2vSy4mtLz5uVSq5zFkkuEfvJzc5mhG1aH6Hw5rDQ7tNcJbsFoebbF8d745HVPsgYghrR2i7kU3NhDerzECgDKbpRwnndxAAB',
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
            public_key: '03aea7d6ef8fc49101cbbb837a5035fb9d1de8ac70b08af569b088386f1c109d1f',
          },
          xpub: 'xpub6C4qnQHZRGEPdznU7mDgzsWoGnxLPFNcs1ZDTgamEYdhrrPse56vsZwfTDKxcwvxuav1ifvh4LugD7SgsCzgyXo44c5AP736qLaWQtHBR7y',
        },
        '100': {
          node: {
            public_key: '020284a71253a2ca34fceb233e643e85ac8b2f7d7e26556143a95e1560c7242f36',
          },
          xpub: 'xpub6C4qnQHZRGEU39kpGdHG6KjHkwGQJRPLLKbA8pyBCLvRsG5QZgzWX2dpPTqMsCpd9eADLQNQzjT3jsKeyT2TbVV23A5hZyK7H3p388YVbeS',
        },
        '2147483647': {
          node: {
            public_key: '02ec5aa9628ed1adba0a69490b10b04d32e35f0374fb239426ec80559ce95c2e8d',
          },
          xpub: 'xpub6C4qnQHhkvmMn9ME2CuzdA3av3bynFAijpnHPouPdQHaivP5ZsHj9u74nkdFT9M6xMhLfKMBdE5x1ESqBnXmAREfx4zvcSW14jMky2qt1Uj',
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
            public_key: '026a04e3186b132704e94276f277ddf26f01eea63280465848b3b438950341fe01',
          },
          xpub: 'Ltub2YojHSubGjKcNv5J4TTwk6Nj3k8amFrbsj42PdXBCL9pftPfXXxbVJojKwWp2Gg2VSaQyRmLEHgSuPvrezAZpf3jjarspjihjSifKWDkzaM',
        },
        '100': {
          node: {
            public_key: '0232d45883a0dcbee09aff4002dcba8fc4c98962c87253012d3aa150b13a6b72f5',
          },
          xpub: 'Ltub2YojHSubGjKgkS2Fj9UXPdtDPW3L8m6CVycxeL4HtZ3kmTXu1d6wyhJ2UMYjbTaZMZ8cFh8Jj9Y2fySDsnEqzVBwg5RksSza57aC8vWXswL',
        },
        '2147483647': {
          node: {
            public_key: '030c8590043a3c32b03fe92c13c58bab40cb8456cf3e525ccb961b92959a8ecd56',
          },
          xpub: 'Ltub2YojHSujcPraWdKpAEJa43aES8rKJZyFXb11NKsGH8JxosGN2hZiu9dhtNMPmy3u4BFQ3HEqWPEFUPskZPHzxFesreXAB2QQqHAc4SjhuKw',
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
            public_key: '025821adae31fa9c03e2d17f92b078614f8202ad8f9656617a37ec28e4347755a0',
          },
          xpub: 'Mtub2s7dYZtnDihWCDJCJwJid5X9mM5Sig9Cx2qsu1FF8T1knECNf9EkUP3wuXzpCJtSTgZ9QLQHNYwqSzJ8Lw4q8m4747L1kMmDKX6xaCDD31q',
        },
        '100': {
          node: {
            public_key: '020620f3210806da6fdb7a86c311cc7112ce00ede8028a933c59baab084ab8defe',
          },
          xpub: 'Mtub2s7dYZtnDihaagETqpKGWb61bE7t6EHKXsQK7W9pndrE7JPfjLsHqy5RHeNtNwv8WdGJ5UBsvW19uwPDoDzD1nYsaEZoA4rzFAk17vX1Soh',
        },
        '2147483647': {
          node: {
            public_key: '025096a034d380c4d14da12610a009442af3a57fa07210cc5beae11d5e293d6005',
          },
          xpub: 'Mtub2s7dYZtvZPEUKemrpbMrDoDfr1FybygjMrC6XR8sjpgSbBcQSoEqrP4gzbSxkeV3ZLWX4h9j1J1UsQHCt2RZ1tkXiV3inHrMBqMeWZKM8ru',
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
            public_key: '02bfa7c9322889f91c6e90421694754ae25119a405b6dab4e3016e9c276977c91b',
          },
          xpub: 'zpub6rC9iYB8ByK4NPz9eeEjZMX2oXa28uL46UWBpw6CybrzTGEwgzTMU2pz81SqY2MN2pVeEgenXzmGMf6KqhPLEuJsujcWcwdG8shTo9FJa7Y',
        },
        '100': {
          node: {
            public_key: '03fb5336d87ad105bc8c3cad184c0e901f6a37b6523cbbdc683e83cef48cd7d200',
          },
          xpub: 'zpub6rC9iYB8ByK8mSuAFvAc8GbN4aZoLSMJ3wMupaDg57GzqLyA4A6bKv2aHQLASPahKNdc7oENWaG5ahMcQrGwSeW8v73Xr8TVszQDFKKeZv5',
        },
        '2147483647': {
          node: {
            public_key: '02bbfde231ac1093d6148b9d5dfc0b9fc017a4c5f0edabb615597039dafe499bfc',
          },
          xpub: 'zpub6rC9iYBGXdr2XjZ7U4gXm55jv7dG3W51hyuV3vMoQKsFyv8JQhgEgXSAZybSQ4LiQEWnQUpJJ8Y6JiRobmbemBtpryn6HWPu8NLu7k5eTrt',
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
            public_key: '0243fda1a20833637fc91dc49f53bf9888796721ed923642a208ffac89e985aa90',
          },
          xpub: 'dgub8rUrufTtMNiawRsmTbDSPGbK1fTsjymrDodWnH9FYT55TNsdtRnDave3AFvHJidxynWwgGosvwPmrUnYNEr2CpiTHYesqqtqU4m94YHHNep',
        },
        '100': {
          node: {
            public_key: '0247a919b9651464f9608a9c554506533a18d077b1ff9a905849aa3a209cc438d7',
          },
          xpub: 'dgub8rUrufTtMNifLsYcB4oAFZB5jTEEvGakGKBHuAqbQZcCkNFMST93GQXU4Ztm5FzqasmGs4REc8q8uig8mKrqGpeSvimtL6VtxxkFwL4amXq',
        },
        '2147483647': {
          node: {
            public_key: '0283d6a05e1e01a133e29e8157da03f4d10d80a3884f70b3ed21f3bc54b5acd7c1',
          },
          xpub: 'dgub8rUrufU2h3FZ3yJqMKdh13P1QsaPdCkqKJ93o6CwGtDLuB6dE9H4k75c2PzMD3i9atS1Zu5tsYfM1NsfkiGcTYgXsGNUv7wWbKXrRcHoNBa',
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
            public_key: '0393b0671eb69430936e73ecd162b5f8db38bf4282ab5b86f649250d444ae8edc3',
          },
          xpub: 'dgub8sUZMxU4PdCQZCYngzahNfQN9hR6ZqT1i4Gq9mixQLcoh4HNUvNKMnTBR41Wsj7R1DLUWwMFQG7Vo87PwsYA72G74xiXGyRZZiMeVU32iuZ',
        },
        '100': {
          node: {
            public_key: '02a97c8c031982053e249d88ea6a8961ca6e258a33b05ead3fb7e001dadd7ba054',
          },
          xpub: 'dgub8sUZMxU4PdCUw58udVgj17jWuFgraQfmVXmyrTGosMeAPeAMwGtuc97KR1QBHw5hoP2Th67DY9u7ucdvuX67ENvFYMbrCgRLTASaATzHbQj',
        },
        '2147483647': {
          node: {
            public_key: '0271bf8267b557bdaa9af8e45a9c75e713687a5ecdc29da8d2b68eaed8d4024796',
          },
          xpub: 'dgub8sUZMxUCjHjNgfRuyNpVuuk1sixxP4t8SkQ9nrPupFyZxAyS8MEeeqDLF6Je2ddmxnpuPiBn7j8g5QpEeWsRWaWMgkVG4Wop8i4XdFfyqqu',
        },
      },
    },
    {
      method: 'cosmosGetPublicKey',
      result: {
        '0': {
          publicKey: '035fa0ce7b5fa7a5ddaaba44b3dadb6fc078632acf7b83625db4177a2a83eb44e5',
        },
        '100': {
          publicKey: '02b6886ddd1115280770d1844ec53c3e0b8c160197cf0a1d332e29d2707c66b5bd',
        },
        '2147483647': {
          publicKey: '031c21a809af98ea6fda6e08d4b2962542ffdc78f2c46ab5df459fe937efd2707a',
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
          xpub: 'xpub6BpnhhdW6g52kBnschto3AxxrdL9T9UQYew8Xy8uqv8dgnELqAw5regP5vKLop8gozM6tsLk47QC2PvfCKSFqeUVz4zMBZPFbsLQVot5t6J',
          publicKey: '03952fe53d31df701f273f316ae4da0be1a8d7cc5aa3fca11fabbc1f503fbf307c',
        },
        '100': {
          xpub: 'xpub6BpnhhdW6g57AHw3PMdXJy5kRFE6y5RY6rstaxRbo2tToKF6kUYS4SRX3TRqsqQ9bgbshDFLMgawEbnQXr26kpeabGpF4sABz87Gfwg7523',
          publicKey: '03e01bf983769d29a41c822c5abaa08ed1c13921555ba15bc2443ac87c5bb5ad57',
        },
        '2147483647': {
          xpub: 'xpub6BpnhhdeSLbzuh57tz7neAd8wGese2aQYD7Bryqkc4ADQMsNRy6SVK8y8ANnpe6YXYH5EP4wnWAveNGbdkUZDnzFhRLxiwPgo7uQYpCe3QQ',
          publicKey: '03ac0d471adea9f254b820f860d5993156a82b2db687d9acfcbafaa77f1eabf693',
        },
      },
    },
    {
      method: 'evmGetPublicKey',
      name: 'evmGetPublicKey-pubkey',
      result: {
        '0': {
          xpub: 'xpub6GmcuhAjVkj5mWpgZbQHWoRFfpGPi5iXuD8iT63eUNP2sHQif2qCCWSw7HwVavZgYY96XGHNaCqtJePCvjB662wpNsQJNrDsCG72xgNiCqQ',
          publicKey: '0225d7816c851683d92269891502cc0a75dc0628dc05da88018fdfa8adbd328fe6',
        },
        '100': {
          xpub: 'xpub6GmcuhAjVkjA82HMQ4EnfCUZym1dcvRXCrp51FEfT7NXUCNLEJMEMVquiJHJo8SHHLEgbHb8txvkxKLGWpfiSp98dSuVxZccCP5YxV6DmX8',
          publicKey: '038cd0bb771b14d41f772a83f0f05d4c5730228686f2ce41973945e7029124d547',
        },
        '2147483647': {
          xpub: 'xpub6GmcuhAsqRG3tDixSsjy9We4fL676EYYc6UW89VsksyWYYurAqw3AR1zZc67mQb1httnKsw4mavQ3d5ted1geKzEXxCPEjn4tnTubMDHsr7',
          publicKey: '039d1e401af63c7f6be041a134bbd8f2612a240f46b59739a2fb417805f6475b16',
        },
      },
    },
    {
      method: 'nostrGetPublicKey',
      result: {
        '0': {
          npub: 'npub1k7h3h7ufw8dq045403qlzqtz408zfg7an79glz85nnwax090n8yqcyxg2s',
          publickey: 'b7af1bfb8971da07d6957c41f10162abce24a3dd9f8a8f88f49cddd33caf99c8',
        },
        '100': {
          npub: 'npub1swggtqgy969wf6fsw7xz3w497xs7wxtujnh3fr9ha3wgvqcmrzrqtvw0gd',
          publickey: '83908581042e8ae4e930778c28baa5f1a1e7197c94ef148cb7ec5c86031b1886',
        },
        '2147483647': {
          npub: 'npub1d45k4r2v3vvqku24v9m2mm6z0zlc2ely6qegzqvay9vt2h54ex5qtp5a8e',
          publickey: '6d696a8d4c8b180b71556176adef4278bf8567e4d03281019d2158b55e95c9a8',
        },
      },
    },
    {
      method: 'polkadotGetAddress',
      result: {
        '0': {
          publicKey: '0xa60a29f8431ae46009c75312d10ff92649c2b17cc039ca3deac7611949aba897',
        },
        '100': {
          publicKey: '0x9e6b9556d4917c24c1af2b4b83ecd9a237c2207b7067d0fdff571943fb2195eb',
        },
        '2147483647': {
          publicKey: '0xf030f7c9668a5015cd4fc28efed27d823e794f021ad293296c76555df772d324',
        },
      },
    },
    {
      method: 'xrpGetAddress',
      result: {
        '0': {
          publicKey: '03e8ce09b1d2be9d4d099fbb627517ada3bc094842b8cc5ff45709bf4f98fd80ee',
        },
        '100': {
          publicKey: '0245c862a0a69ec07206515dda87d7d3cb7b1c485088e9074e568655aee190d760',
        },
        '2147483647': {
          publicKey: '0245162cf4537392eb223dfd4ac0cc91ee0954186bd5ee1230903962ecbe7595d9',
        },
      },
    },
    {
      method: 'suiGetPublicKey',
      result: {
        '0': {
          publicKey: '11fe30ca3d73f8255b536b0f00be13f5ab80a8fd80d47b8c06c90f16c3f27225',
        },
        '100': {
          publicKey: '0e2778cb1c03a7eb7dc4dd1cf115d2bff0faeda8f81228b9c986b689bbc3d0bf',
        },
        '2147483647': {
          publicKey: '2b4160e776b9d4a92841fc91451eecc15b26a034c7e9dba842b9cf3094292c81',
        },
      },
    },
  ],
} as PubkeyTestCaseData;
