import { INDEX_MARK } from '../../baseParams';
import type { AddressTestCaseData } from '../types';

export default {
  name: 'two-passphrase24-密语1',
  passphrase: 'temp10086',
  passphraseState: 'mgGpxhbSthC4jMPvS88CYL28dXH5sb46nc',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/429490457',
  data: [
    {
      method: 'cardanoGetAddress',
      expectedAddress: {
        '0': 'addr1q8x9xglerdnmjjawrqjef47ajs5zynvry4nn4kcwpr7fnwcm2gzzdwz9elrs0crppn5j2lzv4enlmlrck9g8jc76efzqlljltr',
        '30': 'addr1q9ecdpjdlhy0jsd8dtgv0syvh43qdpxyt2tf4fjsc02x7etc0zu7s66hruwvfy7dndjl97uq0qunxqh08a9alf03qdhqcvh6pg',
        '2147483647':
          'addr1qxan22kp7unxkevq5666lttyvp6yxxlkyyju5le8cuec7zh5w6v3zvtj9w7ymjeh38ehuts0vtuh759lzhwhuay4lezqvfssnw',
      },
    },
    {
      method: 'algoGetAddress',
      expectedAddress: {
        '0': '7AJEMHDBJFVLUYP3AQCD5P4IDOA4K2M2VL43OXDDO3DOF556CUC3QFRZOQ',
        '30': '7HKONCDJP7WCVV64HIVLYK4PDIDS5K4VI2GAPQX57VGLZCDSCWFT6W5PTI',
        '2147483647': 'EWMBZ2CDECSIXIN4FXH3SETOSJJGU4ALG5UMZGNRUXHL5WWXRG3QUDHXHE',
      },
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: {
        '0': '0x1518e8776f79d361b78c44fe1d778bc0bd796524d10430e8d64389f53f88097f',
        '30': '0x60a98845d7f018baec8adecdd39926453a948f9228133e2c60a74e2939794324',
        '2147483647': '0x7e6ba9ca66d4029a5248c32819d2794b15a4ab3e853f1f078b92005ab3b49a13',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Legacy',
      params: {
        path: "m/44'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '1CBL65xaeaKPHvMhmNDUzKEpUHEi7CTShL',
        '30': '175Q5jeEvgXn5X6AHT1uFhx2FLyHMpGynH',
        '2147483647': '1CQKuHmvKDTx2WjKGQ7kTZiD7GFVd5FuY5',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Nested SegWit',
      params: {
        path: "m/49'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '34DfyrxVGYfqnGmcapQ8v9EnTEWaiP4deV',
        '30': '336Bw2SYjjuwTrAkDqJviGJQjQynaBfZbZ',
        '2147483647': '3Eewt5a1MX1d1hyUvuSYFuacx9SgmgydUz',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Native SegWit',
      params: {
        path: "m/84'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1qc25nvpj54xyg5dtxz9sa26fav4e2zw9svsms67',
        '30': 'bc1qz9w0ss45mkuj0v5fx4qk9sh55c72eqwqc0k5ce',
        '2147483647': 'bc1q3zhyt2zck08hnc7hfdv5zp7cp8rjly62l4ma92',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Taproot',
      params: {
        path: "m/86'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1pmm9lcx08gy7l9uemk6kjnyghjma4ll8zl52jwsm5l5lwncn782rs0cexz6',
        '30': 'bc1p62kx6d8pk3h675shhnze98x9pvz84jyk4ll7swpq353tu2t7clfq64k5n4',
        '2147483647': 'bc1pjkwuyy35c3tqul6e6mlqqmp00y2ssu68z6mm6s7qwxa3l6jqe6xsevlqc0',
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
        '0': 'DR3sza4yjXbe7tTPqmaMUVadcEKmdik4z7',
        '30': 'DDZNTfkvrh6jVdU58ZqvZZ7ZLVjw11C7eC',
        '2147483647': 'DT5vsnVfy8dDAxtxu9YXz8AT2MUGxrkWMA',
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
        '0': 'bitcoincash:qzzzwp8yyq35sunqnx758j53ucp4p6k9j5uj3uspxt',
        '30': 'bitcoincash:qqlh3hzldcs7en4sx0drx24sxm5cjevy5s60wxc22y',
        '2147483647': 'bitcoincash:qq90vy56qsnzgk77jthsvndchlke5nfx7c3lvrgjjz',
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
        '0': 'LfjpiUP6JpMoTWEYcnzHXWQZi6dEacMJwj',
        '30': 'LNTf6dMg8kATrBjmW2Ahp7R5gNEwVVGYQS',
        '2147483647': 'Lhpgj3EuNYLHTYdTLD1C6RZbtuGT3SuLHR',
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
        '0': 'MPxAfhHHMYYWgqqAwaKeyVaNMXh81oRuqc',
        '30': 'MCy4x5nACS5J94xHS8V7oGFTVs9xkTGQYx',
        '2147483647': 'MTC9iXSY2Qp6uVHYihAMK8diVp4b2k8VxL',
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
        '0': 'ltc1q4ufkhz55cmknal4ck4jmnfdvhp7vs3efs9y0fs',
        '30': 'ltc1qw52pnxvlvdftzl5w8zclhhc3900jrssp3xj9u9',
        '2147483647': 'ltc1qvlht63p3qplxwlmfs4wxn9p62sey7jjmknkz9x',
      },
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: {
        '0': 'cfx:aartym1hx6c0r3me401z0mfd09gca5a486z7716ytv',
        '30': 'cfx:aan8z29ekr4r8n5uzgkr9ubx39vsnhdf76vbum1s93',
        '2147483647': 'cfx:aas03sg6320c2wa7smwxj9pcr26z1hhrpead2d5dha',
      },
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: {
        '0': 'cosmos1vyusahs0v2f7p9tf5lytjt6e82h6guateertrr',
        '30': 'cosmos1hr5w7gkujhtae8jpfj96m3sd8huu0zws8p4rxl',
        '2147483647': 'cosmos14vpc24sflpzkjrp52sppk58s2ds77w9n28d4q9',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-akash',
      params: {
        hrp: 'akash',
      },
      expectedAddress: {
        '0': 'akash1vyusahs0v2f7p9tf5lytjt6e82h6guat5zwv6e',
        '30': 'akash1hr5w7gkujhtae8jpfj96m3sd8huu0zws26cyl9',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-crypto',
      params: {
        hrp: 'cro',
      },
      expectedAddress: {
        '0': 'cro1vyusahs0v2f7p9tf5lytjt6e82h6guatpztjlj',
        '30': 'cro1hr5w7gkujhtae8jpfj96m3sd8huu0zwsl6a66w',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-fetch',
      params: {
        hrp: 'fetch',
      },
      expectedAddress: {
        '0': 'fetch1vyusahs0v2f7p9tf5lytjt6e82h6guat2y20p5',
        '30': 'fetch1hr5w7gkujhtae8jpfj96m3sd8huu0zws5uu8yg',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-osmo',
      params: {
        hrp: 'osmo',
      },
      expectedAddress: {
        '0': 'osmo1vyusahs0v2f7p9tf5lytjt6e82h6guat3zsm43',
        '30': 'osmo1hr5w7gkujhtae8jpfj96m3sd8huu0zws06xnsd',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-juno',
      params: {
        hrp: 'juno',
      },
      expectedAddress: {
        '0': 'juno1vyusahs0v2f7p9tf5lytjt6e82h6guat0tqsyl',
        '30': 'juno1hr5w7gkujhtae8jpfj96m3sd8huu0zws3nkcpr',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-terra',
      params: {
        hrp: 'terra',
      },
      expectedAddress: {
        '0': 'terra1vyusahs0v2f7p9tf5lytjt6e82h6guatlaetpr',
        '30': 'terra1hr5w7gkujhtae8jpfj96m3sd8huu0zwsp90ryl',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-secret',
      params: {
        hrp: 'secret',
      },
      expectedAddress: {
        '0': 'secret1vyusahs0v2f7p9tf5lytjt6e82h6guatmuhz7l',
        '30': 'secret1hr5w7gkujhtae8jpfj96m3sd8huu0zws9yp2mr',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-celestia',
      params: {
        hrp: 'celestia',
      },
      expectedAddress: {
        '0': 'celestia1vyusahs0v2f7p9tf5lytjt6e82h6guatgnjmew',
        '30': 'celestia1hr5w7gkujhtae8jpfj96m3sd8huu0zwsktynuj',
      },
    },
    {
      method: 'evmGetAddress',
      expectedAddress: {
        '0': '0xbc34075D5a1b594a477d1F172FB007FEF986D912',
        '30': '0xCD5121d2A28190a59AA9B8c49D4AeA45dAda9A57',
        '2147483647': '0x53207B47C99A0921505Ca8Ee2c2c3E4584844E11',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ledger Live',
      params: {
        path: "m/44'/61'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '0x5E28393D50E59eD977BB73ED0939eE341dc23166',
        '2147483647': '0x9658B717776d0ff8715Af313BF103674d4774bd3',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-ETC',
      params: {
        path: "m/44'/61'/0'/0/$$INDEX$$",
      },
      expectedAddress: {
        '0': '0x5E28393D50E59eD977BB73ED0939eE341dc23166',
        '2147483647': '0x4DA279FC13E27274727736b50A2E0F973c4DF520',
      },
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: {
        '0': 'f1dhk2kl7zje23f75ksbc5wy3rdwkcapekjyblmcq',
        '30': 'f13z7kgup2t5epycijcw3kpu5zcspddt6gapfzloa',
        '2147483647': 'f1oa6x2c4eknlatzrowv45tghabj3olb2hfxlxx6y',
      },
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: {
        '0': 'kaspa:qp4vrdpufw29qff69v3kqnm0swk3weqtzty7lzc92e7qmdztx4ksyfhuxgxg4',
        '30': 'kaspa:qqergctgpv3xpckl33qspxwktt2v7l54k6ysmgt42vq739nvq508xxfmaggpc',
        '2147483647': 'kaspa:qryk02ls2gm0xn7u424fjp5jdahd4fj45rldtgscf4dy94tcz9z46l6e5eezy',
      },
    },
    {
      method: 'nearGetAddress',
      expectedAddress: {
        '0': '7cb601d4170790d031aa2ac6010a05ef39eef27c6154e99721887b94bb13f854',
        '30': 'd30368eabbec921f9aff39cfb2c58eed2b41a8bc00bf37459f9b3ac2fc67d203',
        '2147483647': 'b81504c9ef40f6a8c80c820555caa79b9a7a2ca9acae490c3b3e0e190b7f1493',
      },
    },
    {
      method: 'nemGetAddress',
      expectedAddress: {
        '0': 'NCHRBEZQDMG63UU5EISXLAALQ4I6S74MNETDQ25J',
        '30': 'NB2DYRASSFZDPPEVCSW5FMMIDUA7N6CR5EOPN5AY',
        '2147483647': 'ND2RNWFM3XQ5QAV6Q5IT3JHSWMR3JPO7JSWOGU2F',
      },
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: {
        '0': 'nexa:nqtsq5g5vj5cu0nd97rxlktvvqsrjk8a55r0g2zf8ajtswdh',
        '30': 'nexa:nqtsq5g5ahcprfc23ph63j2j2ugpvkcg2wg3jwvnf544wlyc',
        '2147483647': 'nexa:nqtsq5g5fcpdrmvnqcsuxc2ay8kepvrlwp037mwk8mk7gxng',
      },
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: {
        '0': '15ctTJc8xgmEhwG3FYg5DR443E6RZySFt7oZPQsfPFdWP5EU',
        '30': '1eaLza3bompJGeVdYSEzH7aYYAAEYdDigUZBYtkKmANCqUF',
        '2147483647': '13JvCRHhLNLwxRhmwsssKG3ahvktySk52xfBhbCvmWpJeCaw',
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
        '0': 'aZBkGK9t98sVEHMnD5C6vPBGeotqtarppaDTq6AhXbwnrtX',
        '2147483647': 'YFDVNziFpiajij6UYGzCmNhwMUNFMtfyfRqn1RS5nnk3YW4',
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
        '0': 'HCCyHgwjGWh244y4cS7yDauLCP1gLhJFzupcnAGJxpUwr3Q',
        '2147483647': 'EtEiQNW6x6QGYWhkwdv54aRzu3V5p17QqmSvxVXhE1HCf2R',
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
        '0': 'j4VwVt1b2yczo71hGZt4kvQvthzBMNZTHXZhWbfvdGEkcrDLx',
        '2147483647': 'j4TdXd8GbMJaWMW91GDGZ2FvRNgqpn2m6gQZ8urFteVwR71Xu',
      },
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: {
        '0': 'rJuCpqZW9s7oPgbX1GPGZJswWBoWE9xuC2',
        '2147483647': 'rMy1ubn1YELtHmfRXSqmvt5gAxWwFbD64s',
      },
    },
    {
      method: 'solGetAddress',
      expectedAddress: {
        '0': '9QxMSPS5G6ijXUuSf4VqoDfB8xSEykjRyRo2jLsB267e',
        '30': 'FaLGisdW1u3p9aoxzykDFhveRBFyys6DovPozzYnneNf',
        '2147483647': '25j9ioySWYsDX9P7iUosJXCEw6SZm8f3U5oiKnHcz61S',
      },
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: {
        '0': '0x07a1fe049c122a087a336be0e716b225',
        '30': '0x19a121f6b670ac8c4d9294c2dde514a1',
        '2147483647': '0xb8ff38acdacca794a1a5fe37cbce286d',
      },
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: {
        '0': 'GD4SK23B3HV4SHYTRIMSL3ELYFDQEC56MG53YDGQ3SVFWMMPSA3JCGBD',
        '30': 'GBGAVF3U7FRZ3XZNVZJPGEIZ3OLTXA3TPQYASIVOETSTKDEMJTO6T726',
        '2147483647': 'GA5G4MG56G6N6OIY5JBQPHJBNY2BMJLOB5FA4EANUKSA4D4KEMMYBF7S',
      },
    },
    {
      method: 'suiGetAddress',
      expectedAddress: {
        '0': '0xdf7925bbbda66b7397f8ee1b0c54cd5a7d0a5c48c2d0bafab36e9e9ce8480901',
        '30': '0xb0a94d317eca42bf4789df2398a3c4f33cb3f1595e71a5016a985b81f94e11a9',
        '2147483647': '0xe3713dda4a0d716b748625d7f2f68ac7ab32f57584ab2876221a16fd222c54ca',
      },
    },
    {
      method: 'tronGetAddress',
      expectedAddress: {
        '0': 'TGZKdPwyLSfq6Sji1ZGSxWhW5j7acTv7t3',
        '30': 'TMFcjvhi8yU2WAmwpWLfnAnEPFDQbumBAP',
        '2147483647': 'TKZCWFt83akRsGXhjFpLyaVSAMBxqxF3Yh',
      },
    },
  ],
} as AddressTestCaseData;
