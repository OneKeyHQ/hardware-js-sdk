import { INDEX_MARK } from '../../baseParams';
import type { AddressTestCaseData } from '../types';

export default {
  name: 'two-passphrase18-empty',
  passphrase: '',
  passphraseState: 'mgyRVtXdyGcWA8YTbDDPpMCqDxr994sZVG',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429817885',
  data: [
    {
      method: 'cardanoGetAddress',
      expectedAddress: {
        '0': 'addr1qy3tyt95lgpy2q3ceugktx9z8n9mlmj56qqnrrq6dpv6q6wf7syucaemuuaftl975q9msgtuezzet9qujrxnvx4hkgns6gvtqq',
        '30': 'addr1q8n9k7evgjsphtadldwllxxt0r84ag9xzg6xn27apjprluhwt3slqw3xz4jje7wc2ffnsg0dm5xt2x7gfm738kkp8w9srlk4qy',
        '2147483647':
          'addr1q9l6089ufgj43t7fxy897mwzsfa9acvfte98s2wdnsrp2l39jz7ptm3mhcrqxkykq474swwyy5g4tcvnw470xzs7se2sap4jw8',
      },
    },
    {
      method: 'algoGetAddress',
      expectedAddress: {
        '0': 'YMVTH5ND3G6RI77G4CYBRLTJH6KTJREBM73ETN26AVYO2PQPW7TGWFYDQQ',
        '30': 'ZV35IJPG5U46GRLXWPUFYL6MYYTIMNVFLYW7OMPPEVI2SB3VOPRHCD33HA',
        '2147483647': 'OHIFDWDHPVCEEHH6MZYGUMI6IVFHMXM6V44NITGA5B6AAY6X46YXSPUYRY',
      },
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: {
        '0': '0x5a34f499ca3a75e3361674316a47557b65d1d5ea6b5c72a4d7fa0d02a8a03993',
        '30': '0x12d478ac5e81e2ef3e3bb4f304351ec3374bff7b6807f090c05b6fc82fce6ee2',
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
        '30': '1HbRivPZYwKVATX4Gye5a4JPG5CUdSdxkz',
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
        '30': '3EB7JNvknngRqNevbNV8Eh4aaZPWGs8tDX',
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
        '30': 'bc1q68uaneu6qcd7jd92favf78h9tpdfz8fwa0lw55',
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
        '30': 'bc1p7379rdv4a7lkcx8dcesmuaym6z39p83lkxngw207x575kqfyrp0sskssa5',
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
        '30': 'DLVAs4gTadcDDZtFsRyMdDRL5vTPTEwbNc',
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
        '30': 'bitcoincash:qpl7nj9jlkywr74ny47nrhryxwhx0mwa8uqxq2tq5q',
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
        '30': 'LS1v2PcPeq7m5PAKiZ6g1UShjwfMZKCRoP',
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
        '30': 'MM2YASFUEehyKyvgnS4zqDoodPzYH5icrW',
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
        '30': 'ltc1qkj58pddf5s2tzqu8xkjd33mrs7xg9eyg7xr0wu',
        '2147483647': 'ltc1ql2kflu88qg24gafnnlmz0aa2s4jmf5wshnnnge',
      },
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: {
        '0': 'cfx:aat9jzxhhrs50jnhsg3jxk4rpmaexuwckpg1e1k048',
        '30': 'cfx:aajsn1k9p3wdrjmt0p7xwczrhmp2nwjynu6fna8r30',
        '2147483647': 'cfx:aarrz15xdgd0k1m026s4k4327a36ays3cpsky20dtj',
      },
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: {
        '0': 'cosmos1wwvzqvprvvvnveuurtlqquf577jpw8x7wu2eqf',
        '30': 'cosmos1gpcn9llkh7600kjuwcqgks5jkdaud29l9pq40f',
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
        '30': 'akash1gpcn9llkh7600kjuwcqgks5jkdaud29lg6djkn',
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
        '30': 'cro1gpcn9llkh7600kjuwcqgks5jkdaud29la6gvnc',
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
        '30': 'fetch1gpcn9llkh7600kjuwcqgks5jkdaud29lkuf3d7',
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
        '30': 'osmo1gpcn9llkh7600kjuwcqgks5jkdaud29ld6n9em',
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
        '30': 'juno1gpcn9llkh7600kjuwcqgks5jkdaud29lnnrwg4',
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
        '30': 'terra1gpcn9llkh7600kjuwcqgks5jkdaud29lr964df',
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
        '30': 'secret1gpcn9llkh7600kjuwcqgks5jkdaud29l8y5uj4',
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
        '30': 'celestia1gpcn9llkh7600kjuwcqgks5jkdaud29l5t394y',
      },
    },
    {
      method: 'evmGetAddress',
      expectedAddress: {
        '0': '0x07335d36eB33B8d95Bf11e69C2C6621214cB7282',
        '30': '0x25eBad0c712d1DDe6D9413f2E2A3e990166b2D57',
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
        '30': 'f1efwcq7wmydjf54glct7gu32hoehtu6hyxfudo5y',
        '2147483647': 'f1hgcveq4xnyrmanhbockagc2hrysxkdj2fbfugba',
      },
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: {
        '0': 'kaspa:qpm9w807nlrk4qmqv886p8zp2qc8zgu4athhxuxzdvmttyt9l3a0vz0syfma7',
        '30': 'kaspa:qz4au70pfpkvk3zjcuhzu5tlvv7k873lthqtx9j8fj6ndkwcsakvs4z0pea7h',
        '2147483647': 'kaspa:qrqz7cxlcgg03mpgcfrrtutf6j7t7lw9wrt8cmplpjt9tnvr3g5fsfr5avz9u',
      },
    },
    {
      method: 'nearGetAddress',
      expectedAddress: {
        '0': '51348eaa4b02be8293b36f031c531bf1ad9544086c05de66ae39722ba3f7b51f',
        '30': '0117b72368670701a3f4fcfa80bd2930308e13507e0bfa238daa35951d89e628',
        '2147483647': 'e9aa00dc37815de680c3f879d0fcab74fd4ba32a6a6bac377da10c71c35e1b3d',
      },
    },
    {
      method: 'nemGetAddress',
      expectedAddress: {
        '0': 'NAPYHXIQZHXYAJZMWKRNOI2JMHVNJEIBNHH54QKL',
        '30': 'NCAE2QXVZILMCHYACJZ73GKWPFHGVM3ON42MWQQQ',
        '2147483647': 'NCCM55UOMNKSPNNS36JVZMJFTGQ6BXO6UWJWJ4FZ',
      },
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: {
        '0': 'nexa:nqtsq5g5ejf9znxrdwqmm64plznv2r8fxplat995wxqape58',
        '30': 'nexa:nqtsq5g5l3r8umtyv5v358kzu5p2pwpz0snl2khagdk092da',
        '2147483647': 'nexa:nqtsq5g5mxpwvcycvhur2uy8s7kx9uragszxxcxxajcuhqrm',
      },
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: {
        '0': '1HCVtnv2U1z1TPRvWLesgow2UqoUbY55ZvLQFapYeMRvQN1',
        '30': '14D7pTdULvZpyS3ucRB5g28jsYJznAwQgGZPfFs9aqizo59b',
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
        '30': 'C6aRF2f8gBdLR4BsJyWNMngMxymbRwdke3CiK95E58m2',
        '2147483647': '7bLUHe8gHEqhWqqzwEpb478XUdPJ1EJejs2SpDA9Bk5C',
      },
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: {
        '0': '0xf7068f67e2ef549118f16ef9fba540ec',
        '30': '0x5033f88adc3167d9a08a564580ff76d1',
        '2147483647': '0x215a5b923fb02127a60456764508b9f4',
      },
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: {
        '0': 'GA344NRALDFAHNR76EFOHVL5EWQDCKSPXAYCIAD6SXOY2XRZQFMSOW5X',
        '30': 'GBYMEQVTBPKXBOL6MSOCJQX7JDNSI42HFVGCEKPZFNEKMJEY3IX2WBCF',
        '2147483647': 'GCQGJ4Z6SIKLG4QAJS5UDPXZFIFNARFNSCMSOV3LCFLJRXJLMDE6P2PQ',
      },
    },
    {
      method: 'suiGetAddress',
      expectedAddress: {
        '0': '0xf7f970bf9cae49feb551e90281fe03cb42d86b12ac37fcf15d4842620024f68a',
        '30': '0x8b92d7bf30fefd921c160b18c1de7a0800fa4b01b875f3fab1ec5d84f8538255',
        '2147483647': '0x47530b32cf1c216b4ee4b03786f32053a3717e00bcc7ca2263f03ba3be8f75ce',
      },
    },
    {
      method: 'tronGetAddress',
      expectedAddress: {
        '0': 'TLYMEB5rnhDMwfY5Jm2BabuLFfUzrgyWyL',
        '30': 'TSa2a5zTbGQ4rV5W76zVJZYFzbt3C6vKkb',
        '2147483647': 'THdRd5GWRMpf32ZnYKmPo1s2yJMvxPBmF9',
      },
    },
  ],
} as AddressTestCaseData;
