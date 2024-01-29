import { INDEX_MARK } from '../../baseParams';
import type { AddressTestCaseData } from '../types';

export default {
  name: 'one-passphrase24-empty',
  passphrase: '',
  passphraseState: 'mgyRVtXdyGcWA8YTbDDPpMCqDxr994sZVG',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429392156',
  data: [
    {
      method: 'cardanoGetAddress',
      expectedAddress: {
        '0': 'addr1qy3tyt95lgpy2q3ceugktx9z8n9mlmj56qqnrrq6dpv6q6wf7syucaemuuaftl975q9msgtuezzet9qujrxnvx4hkgns6gvtqq',
        '10': 'addr1q8l9774wpnvp6uvnytfzsj9n6dprh5npmf8k28tcnrwfzxr6lgmsya94y7qkmhufawxghq2akyrc48d9nvmmcup4k68salvla4',
        '2147483647':
          'addr1q9l6089ufgj43t7fxy897mwzsfa9acvfte98s2wdnsrp2l39jz7ptm3mhcrqxkykq474swwyy5g4tcvnw470xzs7se2sap4jw8',
      },
    },
    {
      method: 'algoGetAddress',
      expectedAddress: {
        '0': 'YMVTH5ND3G6RI77G4CYBRLTJH6KTJREBM73ETN26AVYO2PQPW7TGWFYDQQ',
        '10': 'GYNOECCRMNNALFDUWCXC5OG5ARYMDMXIWOGPPUAW3ADM4GQLDXTNQRLFRQ',
        '2147483647': 'OHIFDWDHPVCEEHH6MZYGUMI6IVFHMXM6V44NITGA5B6AAY6X46YXSPUYRY',
      },
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: {
        '0': '0x5a34f499ca3a75e3361674316a47557b65d1d5ea6b5c72a4d7fa0d02a8a03993',
        '10': '0xf9b38b3f500e733d1cead7fc3d8e702985a5b9719592815ab3ef119d202719d7',
        '2147483647': '0x236ce74e5c6dd9ef21f4f7628f37399c23139741107fceb860e187496c1a2ed4',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Legacy',
      params: {
        path: "m/44'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '1AbPs6wKNLmhPEqvVGXo2mCeQbt3ac1u31',
        '10': '1Jtk7A4uFN9w7QQA9eegChmKr7SMFTJ8ht',
        '2147483647': '1EwLSxfbWPjDvQG3GSbUBeGgEpZHBKXJWy',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Nested SegWit',
      params: {
        path: "m/49'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '3PDLusYsYKdTFpjAxmetJUkMbu1rzj7wvG',
        '10': '3FV5seQFS857GgiLt4w4M18c8LpmTbYoWv',
        '2147483647': '37kM3tAh5sqs91ZRHV8MjRxczMDncU7iip',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Native SegWit',
      params: {
        path: "m/84'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1q0lfpz3emnspkyjf9yxxnzr0ysuuu7x3ptn5une',
        '10': 'bc1qvayl7xtug9232wqkjnxg0u0eqt2u7mq08fmgnj',
        '2147483647': 'bc1q4v8u6wqhha5ls4ugplcywhq7v2ppkfyd8yg64y',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Taproot',
      params: {
        path: "m/86'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1ppeyn6km76kphw5la5jesjrvukdp4rngusvxp663xaglyk5zkdjlsnkxfnc',
        '10': 'bc1pr8x3akhm9lwte2nksz9mfu5vj59x7kesy4eyxkfgq5hm8xev5mys3pznkw',
        '2147483647': 'bc1p6a6ekmht3d0r7qd6p28p9zzalevu6e6lsh5qddp29s3k2zyhh65sdenkhw',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Doge',
      params: {
        path: "m/44'/3'/$$INDEX$$'/0/0",
        coin: 'doge',
      },
      expectedAddress: {
        '0': 'DBNWmpqPyaWnevetUokkUzgaZrECTSTmY6',
        '10': 'D7uBMxFXjg2o3Kd8EXbfLmXZGdAhRtxYZ2',
        '2147483647': 'DDiEhDBREr41951UhEPpGXTPPaS2bNPqHB',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-BCH',
      params: {
        path: "m/44'/145'/$$INDEX$$'/0/0",
        coin: 'bch',
      },
      expectedAddress: {
        '0': 'bitcoincash:qzr4w7zjl9d70l9xjug3dgwjwaupzcjcj56a5qx3gg',
        '10': 'bitcoincash:qpps29tkffe44q345nf8ppnu5rm3m4wmduqs8fjvxl',
        '2147483647': 'bitcoincash:qqj2c20c8kphz89k9v9h46v9xukmmpwg5qsnyhn5x9',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-LTC Legacy',
      params: {
        path: "m/44'/2'/$$INDEX$$'/0/0",
        coin: 'ltc',
      },
      expectedAddress: {
        '0': 'LVJxyFkFoUFAGZG4cLNN9oa32XePqLvzp1',
        '10': 'LiKBYDdPz98XxxF8XWPeGn4GG11xafEUKw',
        '2147483647': 'LPBp8MDUxK8DbQseGm6k9DaddaoYow5xJ3',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-LTC Nested SegWit',
      params: {
        path: "m/49'/2'/$$INDEX$$'/0/0",
        coin: 'ltc',
      },
      expectedAddress: {
        '0': 'MNoWdPBXnhsG2D4DQ89GTks98X9GitEP8z',
        '10': 'MTzS5VCExtiRfQepwWJMjy3iqneBa5xhWU',
        '2147483647': 'MNdHavxPR1n1jg3hkjE3d4uCaLYgJhuiag',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-LTC Native SegWit',
      params: {
        path: "m/84'/2'/$$INDEX$$'/0/0",
        coin: 'ltc',
      },
      expectedAddress: {
        '0': 'ltc1qj80p6hp90d9lmw0c9hrv4yh9uudzy33elfdx5e',
        '10': 'ltc1qgan64h0qhkg5dp55huyky7x6jt2v9mkwd2rges',
        '2147483647': 'ltc1ql2kflu88qg24gafnnlmz0aa2s4jmf5wshnnnge',
      },
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: {
        '0': 'cfx:aat9jzxhhrs50jnhsg3jxk4rpmaexuwckpg1e1k048',
        '10': 'cfx:aangy4yet910416t9mc3tbdpvan43a45wp2t07zjcb',
        '2147483647': 'cfx:aarrz15xdgd0k1m026s4k4327a36ays3cpsky20dtj',
      },
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: {
        '0': 'cosmos1wwvzqvprvvvnveuurtlqquf577jpw8x7wu2eqf',
        '10': 'cosmos1c7u5umpzcure358caevfhjtd05hnt3vl6q3905',
        '2147483647': 'cosmos18920zsy6l5zn3czvh3dy8zgr6dznecgmdcfkrk',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-akash',
      params: {
        hrp: 'akash',
      },
      expectedAddress: {
        '0': 'akash1wwvzqvprvvvnveuurtlqquf577jpw8x7r887en',
        '10': 'akash1c7u5umpzcure358caevfhjtd05hnt3vlhmuzkw',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-crypto',
      params: {
        hrp: 'cro',
      },
      expectedAddress: {
        '0': 'cro1wwvzqvprvvvnveuurtlqquf577jpw8x7k8zquc',
        '10': 'cro1c7u5umpzcure358caevfhjtd05hnt3vlzmeun9',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-fetch',
      params: {
        hrp: 'fetch',
      },
      expectedAddress: {
        '0': 'fetch1wwvzqvprvvvnveuurtlqquf577jpw8x7apraz7',
        '10': 'fetch1c7u5umpzcure358caevfhjtd05hnt3vlfacpdr',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-osmo',
      params: {
        hrp: 'osmo',
      },
      expectedAddress: {
        '0': 'osmo1wwvzqvprvvvnveuurtlqquf577jpw8x7x8efkm',
        '10': 'osmo1c7u5umpzcure358caevfhjtd05hnt3vljmz4ex',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-juno',
      params: {
        hrp: 'juno',
      },
      expectedAddress: {
        '0': 'juno1wwvzqvprvvvnveuurtlqquf577jpw8x7cwfz84',
        '10': 'juno1c7u5umpzcure358caevfhjtd05hnt3vlvjj7gg',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-terra',
      params: {
        hrp: 'terra',
      },
      expectedAddress: {
        '0': 'terra1wwvzqvprvvvnveuurtlqquf577jpw8x7gcsezf',
        '10': 'terra1c7u5umpzcure358caevfhjtd05hnt3vluyt9d5',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-secret',
      params: {
        hrp: 'secret',
      },
      expectedAddress: {
        '0': 'secret1wwvzqvprvvvnveuurtlqquf577jpw8x7ve7sa4',
        '10': 'secret1c7u5umpzcure358caevfhjtd05hnt3vlc99vjg',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-celestia',
      params: {
        hrp: 'celestia',
      },
      expectedAddress: {
        '0': 'celestia1wwvzqvprvvvnveuurtlqquf577jpw8x7lkmf6y',
        '10': 'celestia1c7u5umpzcure358caevfhjtd05hnt3vlt2q44e',
      },
    },
    {
      method: 'evmGetAddress',
      expectedAddress: {
        '0': '0x07335d36eB33B8d95Bf11e69C2C6621214cB7282',
        '10': '0x5f0E93b269A8393CaeaeC2E440dece2ADB421839',
        '2147483647': '0x8FfCDaa3FD0c5234c21d1FADFCa05e8577e917AB',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ledger Live',
      params: {
        path: "m/44'/61'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '0x0BC95B209f77e7B014D8e71107De6D0FD412F028',
        '2147483647': '0x888a0A06Cb96eB4722Df183D72c53d517b936a8F',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-ETC',
      params: {
        path: "m/44'/61'/0'/0/$$INDEX$$",
      },
      expectedAddress: {
        '0': '0x0BC95B209f77e7B014D8e71107De6D0FD412F028',
        '2147483647': '0x03Fb19A4771fe92915976e97E6C7483Ce90fD095',
      },
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: {
        '0': 'f1aglbysgvhdfiubz7jebr3yg2p3bwqkolsl6wtva',
        '10': 'f1imdpr33kxrzipgjoinjkep7z5jyqdrminvyxpqa',
        '2147483647': 'f1hgcveq4xnyrmanhbockagc2hrysxkdj2fbfugba',
      },
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: {
        '0': 'kaspa:qpm9w807nlrk4qmqv886p8zp2qc8zgu4athhxuxzdvmttyt9l3a0vz0syfma7',
        '10': 'kaspa:qrwegdh03d2lhyd5y7aufdzwgm0xwtey6zzljehuuc33p7mrml6tca0yzf6pl',
        '2147483647': 'kaspa:qrqz7cxlcgg03mpgcfrrtutf6j7t7lw9wrt8cmplpjt9tnvr3g5fsfr5avz9u',
      },
    },
    {
      method: 'nearGetAddress',
      expectedAddress: {
        '0': '51348eaa4b02be8293b36f031c531bf1ad9544086c05de66ae39722ba3f7b51f',
        '10': '5bbdc33f43785d84b954f5a9018d0f4419bdd51be8ffd1946752d33c7442f642',
        '2147483647': 'e9aa00dc37815de680c3f879d0fcab74fd4ba32a6a6bac377da10c71c35e1b3d',
      },
    },
    {
      method: 'nemGetAddress',
      expectedAddress: {
        '0': 'NAPYHXIQZHXYAJZMWKRNOI2JMHVNJEIBNHH54QKL',
        '10': 'NBO7CQTDRUPMZW4KATJIXOORRYXPBDB675DS6S72',
        '2147483647': 'NCCM55UOMNKSPNNS36JVZMJFTGQ6BXO6UWJWJ4FZ',
      },
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: {
        '0': 'nexa:nqtsq5g5ejf9znxrdwqmm64plznv2r8fxplat995wxqape58',
        '10': 'nexa:nqtsq5g56zecfuv9ucgexu0c6ve6q4uz4tp7jhtnynmq6um8',
        '2147483647': 'nexa:nqtsq5g5mxpwvcycvhur2uy8s7kx9uragszxxcxxajcuhqrm',
      },
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: {
        '0': '1HCVtnv2U1z1TPRvWLesgow2UqoUbY55ZvLQFapYeMRvQN1',
        '10': '14KtYCiPz352t7VFcayVCdLjcfV7fcmbLX4br4ow6ubX9HU9',
        '2147483647': '1upmafHSGSTTkuLUWNpRRT81LmcapEwXzMsTJwHzmbMvghZ',
      },
    },
    {
      method: 'polkadotGetAddress',
      name: 'polkadotGetAddress-astar',
      params: {
        prefix: '5',
        network: 'astar',
      },
      expectedAddress: {
        '0': 'WDVnrVvwvPcnkQkTAjmmC94FuZGkWgg2GgzUfoKrvKsKyP4',
        '2147483647': 'Wr84YNJMip6F3vf1AmwJvnFEmV5rjPYUh8XXj9oK3ZoL8xg',
      },
    },
    {
      method: 'polkadotGetAddress',
      name: 'polkadotGetAddress-kusama',
      params: {
        prefix: '2',
        network: 'kusama',
      },
      expectedAddress: {
        '0': 'CrX1ssio3mSKaCMja6hdVLnKT8Paxo7TT2bdcsRUMYQV4Hk',
        '2147483647': 'DV9HZk6CrBumsiGHa8sBDyyJK4ChBVyusU8ggDtvUnLVMc8',
      },
    },
    {
      method: 'polkadotGetAddress',
      name: 'polkadotGetAddress-joystream',
      params: {
        prefix: '126',
        network: 'joystream',
      },
      expectedAddress: {
        '0': 'j4Rbovbmp3QFYQXpfEqjLaggmhEvjHBZ6j1pHcWdnRdUYPFwf',
        '2147483647': 'j4SESCHeBTCg1rqLZnqmW8RKxg6rYPQFyBSFpfZzFskiUPfCh',
      },
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: {
        '0': 'rNwJhxMjfmXXVZSr5jhCmCPhXH6FoDh6gZ',
        '2147483647': 'rMHqft3y6EFR6VNxbsF1fAAwTKoWcwTxMs',
      },
    },
    {
      method: 'solGetAddress',
      expectedAddress: {
        '0': 'C6qsVWHrbaM1fHJPS19i6xdY9Wp3K1GWsuvVSGC9iths',
        '10': 'B938Dc498i3WvMRSziCr1PGew4GEcKGDjyCYQ2LxnwZg',
        '2147483647': '7bLUHe8gHEqhWqqzwEpb478XUdPJ1EJejs2SpDA9Bk5C',
      },
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: {
        '0': '0xf7068f67e2ef549118f16ef9fba540ec',
        '10': '0xa8855de44dc5d7ff2fad9f7a6d8b6fa7',
        '2147483647': '0x215a5b923fb02127a60456764508b9f4',
      },
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: {
        '0': 'GA344NRALDFAHNR76EFOHVL5EWQDCKSPXAYCIAD6SXOY2XRZQFMSOW5X',
        '10': 'GA3UP4LCT5SYVLRNC25GXLESYX642PJMCBC6G3YMFZVATZOL5Y2PC5H7',
        '2147483647': 'GCQGJ4Z6SIKLG4QAJS5UDPXZFIFNARFNSCMSOV3LCFLJRXJLMDE6P2PQ',
      },
    },
    {
      method: 'suiGetAddress',
      expectedAddress: {
        '0': '0xf7f970bf9cae49feb551e90281fe03cb42d86b12ac37fcf15d4842620024f68a',
        '10': '0x650effb34b98489be37ef95c892c3c524d0780378afa80325f8cedd2d13d7417',
        '2147483647': '0x47530b32cf1c216b4ee4b03786f32053a3717e00bcc7ca2263f03ba3be8f75ce',
      },
    },
    {
      method: 'tronGetAddress',
      expectedAddress: {
        '0': 'TLYMEB5rnhDMwfY5Jm2BabuLFfUzrgyWyL',
        '10': 'TAg91PHTjrhdo2PZsGuyXMEJMzZhCNeFo9',
        '2147483647': 'THdRd5GWRMpf32ZnYKmPo1s2yJMvxPBmF9',
      },
    },
  ],
} as AddressTestCaseData;
