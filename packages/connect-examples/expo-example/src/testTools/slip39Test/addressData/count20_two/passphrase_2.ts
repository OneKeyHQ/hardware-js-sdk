import type { SLIP39TestCaseData } from '../../types';

export const count20TwoPassphrase2: SLIP39TestCaseData = {
  id: 'count20_two_passphrase_2',
  name: 'count20_two_passphrase_2',
  description: '2-of-3 (20 words each) + passphrase_2',
  passphrase: 'onekey',
  shares: [
    'network vexed academic acid alive forbid database equation average advocate golden careful exhaust dance texture satisfy lair negative earth flash',
    'network vexed academic agency calcium memory elegant merchant welcome oral evidence bulb union company suitable spend loud miracle story withdraw',
  ],
  data: [
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Legacy',
      params: {
        path: "m/44'/0'/$$INDEX$$'/0/0",
        coin: 'btc',
      },
      expectedAddress: {
        "m/44'/0'/0'/0/0": '14C8N7C67nByMjWLebPenhX7JTKa83WHKY',
        "m/44'/0'/1'/0/0": '125BtC83562Apve7uLSN1PY7QcvCRNWuKy',
        "m/44'/0'/21234567'/0/0": '13bFxoFKrMabcRA7V8rDFfEwe2fU85sGLv',
        "m/44'/0'/2147483646'/0/0": '16nQehtb2VbnzZobBBva7V2SZ5pjVFosWf',
        "m/44'/0'/2147483647'/0/0": '133cyRKDmnpqjK9ummDpCEAgDK92ZwMXhw',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Nested SegWit',
      params: {
        path: "m/49'/0'/$$INDEX$$'/0/0",
        coin: 'btc',
        scriptType: 'SPENDP2SHWITNESS',
      },
      expectedAddress: {
        "m/49'/0'/0'/0/0": '33MbzcDWWgdnJ1mNqETpLJqq94N6ek39rt',
        "m/49'/0'/1'/0/0": '35Uu21Zi81YmU1wbM4xQhZ5HJtwrLepJDd',
        "m/49'/0'/21234567'/0/0": '3JE9zR1h4ibr7QwnxNjh8D6qoqMt7bHxfK',
        "m/49'/0'/2147483646'/0/0": '3H1vPw6QXVF86BjAd4s26USchTUbCXM4S7',
        "m/49'/0'/2147483647'/0/0": '386TdaCyiYXt41fCEWsMUAKqoUTUnH3aGS',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Native SegWit',
      params: {
        path: "m/84'/0'/$$INDEX$$'/0/0",
        coin: 'btc',
        scriptType: 'SPENDWITNESS',
      },
      expectedAddress: {
        "m/84'/0'/0'/0/0": 'bc1qy0wxzq5xyrn7yzvujv3r7ygtt5vhq55fw2hj2f',
        "m/84'/0'/1'/0/0": 'bc1qhaapn6j79k4qsepjulsjkr2gkqqge92vhmmc5l',
        "m/84'/0'/21234567'/0/0": 'bc1qw9jjyw7hzklhjacjpmashvt2r47tm7mahr6n7e',
        "m/84'/0'/2147483646'/0/0": 'bc1q2s748z98g3e2ksg3lcy36knsegp3zyzdt9tgm6',
        "m/84'/0'/2147483647'/0/0": 'bc1qc0v9hu9l60y275c0d0kk9k8ylq8nlnzne7fwla',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Taproot',
      params: {
        path: "m/86'/0'/$$INDEX$$'/0/0",
        coin: 'btc',
        scriptType: 'SPENDTAPROOT',
      },
      expectedAddress: {
        "m/86'/0'/0'/0/0": 'bc1pzxjlsg66qm87zaal78s97388laqt3glra7jqpfnwga824y7smdgq5kr0u8',
        "m/86'/0'/1'/0/0": 'bc1pgsqhen0cxxw3px6meup2drm9act95xcr968a0txn2hnzsm0l57xq0zwsc6',
        "m/86'/0'/21234567'/0/0": 'bc1pytwgh4zuuvnn3c9z794k84zkzhzlwmfcg2cywux5rhrxr6376uvs7lqwu3',
        "m/86'/0'/2147483646'/0/0":
          'bc1prevfhgjzpe6hn4gk9vs40hhdnk5w6xlc7nga6xz7mtx5jj6vdq5s39hqd5',
        "m/86'/0'/2147483647'/0/0":
          'bc1p8vx4fwde7vrlmu8mvk6rvhgh0wknvtrc7nvtamj6zm0x7hrfum0qk9ysen',
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
        "m/44'/3'/0'/0/0": 'D8B44P3aFThS7isXikRPxHEnKk7p3dfxF9',
        "m/44'/3'/1'/0/0": 'D5HUNMdnasre21opdReN5crNPspuSe2GYd',
        "m/44'/3'/21234567'/0/0": 'DTjdYvgiGTDaGFAntzZg7GfKMzpjnGr9sh',
        "m/44'/3'/2147483646'/0/0": 'DDXGCD44hyuCVMoupvQgmXbmFHkCKamstm',
        "m/44'/3'/2147483647'/0/0": 'DB7jvknJ7hkL23mpeZ4k86farxMrBv5WoH',
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
        "m/44'/145'/0'/0/0": 'bitcoincash:qrrur4yzxfatm87kfpy0epsu7hzh0rjrqvwvd6486u',
        "m/44'/145'/1'/0/0": 'bitcoincash:qpcm0s7azwasems04ydjzljdth04wt79aq5xf9ufgn',
        "m/44'/145'/21234567'/0/0": 'bitcoincash:qru7slk0kqlvzuwzvsr6z5c79tgvv0tuhq7d370a0r',
        "m/44'/145'/2147483646'/0/0": 'bitcoincash:qzy0cth2gpxlkc40at0dvp0h4pfzlkzdtg0uk6w5pj',
        "m/44'/145'/2147483647'/0/0": 'bitcoincash:qzehgxkvcdwn886lc3uzed7ujksvtnpw3cv4y80yzy',
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
        "m/44'/2'/0'/0/0": 'LbEG5rLbRC4YpDdUjyUr5bgWYmukbXt9de',
        "m/44'/2'/1'/0/0": 'LYkZGKM4WYL9KT93ALP1SouTqqsa1ZvTBG',
        "m/44'/2'/21234567'/0/0": 'Lg6wszDimfHfn6YjqcPUfmSNG2ecaLoiEo',
        "m/44'/2'/2147483646'/0/0": 'LKrTwoiFwhL7T75KEohsF4yrGYDtejdL9J',
        "m/44'/2'/2147483647'/0/0": 'LKSKadLfs3pjNiKR7cm3PbfCh5oEGtGmTG',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-LTC Nested SegWit',
      params: {
        path: "m/49'/2'/$$INDEX$$'/0/0",
        coin: 'ltc',
        scriptType: 'SPENDP2SHWITNESS',
      },
      expectedAddress: {
        "m/49'/2'/0'/0/0": 'MHnFJTGFn21c2PB8MXw8WjkcShs783UM86',
        "m/49'/2'/1'/0/0": 'M9o5eTFunC32by4F9UxcKdGDNcEB367ehE',
        "m/49'/2'/21234567'/0/0": 'MWEtQkpkJgv8g36cCVcLrHeKahhRTGtTrN',
        "m/49'/2'/2147483646'/0/0": 'MAs1qqatGDX6DQ9qXzHfNj56BsfLjVsBzE',
        "m/49'/2'/2147483647'/0/0": 'MRfvPSMHeHYKMb3naRvmxBomB4cbU18SXK',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-LTC Native SegWit',
      params: {
        path: "m/84'/2'/$$INDEX$$'/0/0",
        coin: 'ltc',
        scriptType: 'SPENDWITNESS',
      },
      expectedAddress: {
        "m/84'/2'/0'/0/0": 'ltc1q0mlt8xwrmcj2m9ge5v47vj07v2dx3lekwz76lk',
        "m/84'/2'/1'/0/0": 'ltc1q0gehhv49n050mq9h4d0nn9q58g4gr6aqnp70ze',
        "m/84'/2'/21234567'/0/0": 'ltc1qm584t3ql6uz8g0t7fzlhh6mzflzd7w48vca5js',
        "m/84'/2'/2147483646'/0/0": 'ltc1qk6wrv94fesk5jsx7j33kdggq9jesalg0fl5kl7',
        "m/84'/2'/2147483647'/0/0": 'ltc1qqju0cjekcuxrrku3hdxqgt7qf8tsh86x7fec4j',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Neurai',
      params: {
        path: "m/44'/1900'/$$INDEX$$'/0/0",
        coin: 'neurai',
      },
      expectedAddress: {
        "m/44'/1900'/0'/0/0": 'Nc29aK4N13bjXnkLG8RP1hZE3LaS9PnnUp',
        "m/44'/1900'/1'/0/0": 'Ne1A2Pw8999y1BznoU9S6bnx6qSs4BK8iP',
        "m/44'/1900'/21234567'/0/0": 'NYF4Q3FfpmfFzFvvvZMu9Gu3XyNaF4AhtP',
        "m/44'/1900'/2147483646'/0/0": 'NTFTmigCTXpAsq3ug6mE1aNUwLXvKBq6Ro',
        "m/44'/1900'/2147483647'/0/0": 'NPbgff5V5cFUTNY6zoFQGCUmQ7juuVCCCE',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ethereum',
      params: {
        path: "m/44'/60'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/60'/0'/0/0": '0xF13F61FBB08369580E0808155ae2f2B905Da5E49',
        "m/44'/60'/1'/0/0": '0x3753ca190eC6a2f966483E4031eDcB90E5108BE4',
        "m/44'/60'/21234567'/0/0": '0x7847D6B35820C8C23d72Bd7580A8B8727d79ec37',
        "m/44'/60'/2147483646'/0/0": '0xB05d930Be3F7812561c3AE6235Ea53F530c69357',
        "m/44'/60'/2147483647'/0/0": '0x45EcEFDED5dEe57717f423956C1EB1a5a2224bE6',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ethereum Classic',
      params: {
        path: "m/44'/61'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/61'/0'/0/0": '0xecF74A38766E584e285Cd569FC7AcC357d09FCdA',
        "m/44'/61'/1'/0/0": '0xD3837E1fDBF55E81ECBa964a68F143Fcac746Fb9',
        "m/44'/61'/21234567'/0/0": '0x4711da3Afb7FbD5Ef7DE6d1d8D4c5475Bc42c672',
        "m/44'/61'/2147483646'/0/0": '0xba6A776577f8214E6b9fe6777c66186de871CDE4',
        "m/44'/61'/2147483647'/0/0": '0x9ECECeddf5DAAdB24B41Ab91Bd52c397e25233c4',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-cosmos',
      params: {
        hrp: 'cosmos',
        path: "m/44'/118'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/118'/0'/0/0": 'cosmos1nc3pahqtw96yqah9cjmg0qaq4wv8vx37gvzwc0',
        "m/44'/118'/1'/0/0": 'cosmos12h54n5gzuq8ga7yh496uupm00q3jhptelnsuyf',
        "m/44'/118'/21234567'/0/0": 'cosmos1w3yy83u36x0s76er0lqp8ad7kvdekrp4lflgmt',
        "m/44'/118'/2147483646'/0/0": 'cosmos13yma2hz8um4k0jl4ll3drm7a74dyuhjcuw2cxy',
        "m/44'/118'/2147483647'/0/0": 'cosmos1yndw3tw0jlek9jr75ylv8re8nthze335yrjz3y',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-akash',
      params: {
        hrp: 'akash',
        path: "m/44'/118'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/118'/0'/0/0": 'akash1nc3pahqtw96yqah9cjmg0qaq4wv8vx379h0fp4',
        "m/44'/118'/1'/0/0": 'akash12h54n5gzuq8ga7yh496uupm00q3jhptejgaman',
        "m/44'/118'/21234567'/0/0": 'akash1w3yy83u36x0s76er0lqp8ad7kvdekrp4jjj0z3',
        "m/44'/118'/2147483646'/0/0": 'akash13yma2hz8um4k0jl4ll3drm7a74dyuhjc348ll7',
        "m/44'/118'/2147483647'/0/0": 'akash1yndw3tw0jlek9jr75ylv8re8nthze335fcl9g7',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-crypto',
      params: {
        hrp: 'cro',
        path: "m/44'/118'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/118'/0'/0/0": 'cro1nc3pahqtw96yqah9cjmg0qaq4wv8vx37sh2hy7',
        "m/44'/118'/1'/0/0": 'cro12h54n5gzuq8ga7yh496uupm00q3jhpte8gc9cc',
        "m/44'/118'/21234567'/0/0": 'cro1w3yy83u36x0s76er0lqp8ad7kvdekrp48jh386',
        "m/44'/118'/2147483646'/0/0": 'cro13yma2hz8um4k0jl4ll3drm7a74dyuhjcy4zp64',
        "m/44'/118'/2147483647'/0/0": 'cro1yndw3tw0jlek9jr75ylv8re8nthze335uc6md4',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-fetch',
      params: {
        hrp: 'fetch',
        path: "m/44'/118'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/118'/0'/0/0": 'fetch1nc3pahqtw96yqah9cjmg0qaq4wv8vx37m3t26c',
        "m/44'/118'/1'/0/0": 'fetch12h54n5gzuq8ga7yh496uupm00q3jhptevwecx7',
        "m/44'/118'/21234567'/0/0": 'fetch1w3yy83u36x0s76er0lqp8ad7kvdekrp4v5kveu',
        "m/44'/118'/2147483646'/0/0": 'fetch13yma2hz8um4k0jl4ll3drm7a74dyuhjc0nruyn',
        "m/44'/118'/2147483647'/0/0": 'fetch1yndw3tw0jlek9jr75ylv8re8nthze335h7mxnn',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-osmo',
      params: {
        hrp: 'osmo',
        path: "m/44'/118'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/118'/0'/0/0": 'osmo1nc3pahqtw96yqah9cjmg0qaq4wv8vx37qh37wa',
        "m/44'/118'/1'/0/0": 'osmo12h54n5gzuq8ga7yh496uupm00q3jhptehgrvjm',
        "m/44'/118'/21234567'/0/0": 'osmo1w3yy83u36x0s76er0lqp8ad7kvdekrp4hjvcde',
        "m/44'/118'/2147483646'/0/0": 'osmo13yma2hz8um4k0jl4ll3drm7a74dyuhjc54egsk',
        "m/44'/118'/2147483647'/0/0": 'osmo1yndw3tw0jlek9jr75ylv8re8nthze335vcpj8k',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-juno',
      params: {
        hrp: 'juno',
        path: "m/44'/118'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/118'/0'/0/0": 'juno1nc3pahqtw96yqah9cjmg0qaq4wv8vx3777p4ln',
        "m/44'/118'/1'/0/0": 'juno12h54n5gzuq8ga7yh496uupm00q3jhptefpn8r4',
        "m/44'/118'/21234567'/0/0": 'juno1w3yy83u36x0s76er0lqp8ad7kvdekrp4fmunuh',
        "m/44'/118'/2147483646'/0/0": 'juno13yma2hz8um4k0jl4ll3drm7a74dyuhjc2ufrpc',
        "m/44'/118'/2147483647'/0/0": 'juno1yndw3tw0jlek9jr75ylv8re8nthze335j33ekc',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-terra',
      params: {
        hrp: 'terra',
        path: "m/44'/118'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/118'/0'/0/0": 'terra1nc3pahqtw96yqah9cjmg0qaq4wv8vx37wgcw60',
        "m/44'/118'/1'/0/0": 'terra12h54n5gzuq8ga7yh496uupm00q3jhpteeh2uxf',
        "m/44'/118'/21234567'/0/0": 'terra1w3yy83u36x0s76er0lqp8ad7kvdekrp4ed9get',
        "m/44'/118'/2147483646'/0/0": 'terra13yma2hz8um4k0jl4ll3drm7a74dyuhjc62scyy',
        "m/44'/118'/2147483647'/0/0": 'terra1yndw3tw0jlek9jr75ylv8re8nthze335z8gzny',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-secret',
      params: {
        hrp: 'secret',
        path: "m/44'/118'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/118'/0'/0/0": 'secret1nc3pahqtw96yqah9cjmg0qaq4wv8vx372fk89n',
        "m/44'/118'/1'/0/0": 'secret12h54n5gzuq8ga7yh496uupm00q3jhpteaky4e4',
        "m/44'/118'/21234567'/0/0": 'secret1w3yy83u36x0s76er0lqp8ad7kvdekrp4avtpxh',
        "m/44'/118'/2147483646'/0/0": 'secret13yma2hz8um4k0jl4ll3drm7a74dyuhjc7t73mc',
        "m/44'/118'/2147483647'/0/0": 'secret1yndw3tw0jlek9jr75ylv8re8nthze335xxxtvc',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-celestia',
      params: {
        hrp: 'celestia',
        path: "m/44'/118'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/118'/0'/0/0": 'celestia1nc3pahqtw96yqah9cjmg0qaq4wv8vx37exn7zz',
        "m/44'/118'/1'/0/0": 'celestia12h54n5gzuq8ga7yh496uupm00q3jhptewepv7y',
        "m/44'/118'/21234567'/0/0": 'celestia1w3yy83u36x0s76er0lqp8ad7kvdekrp4wrwcpx',
        "m/44'/118'/2147483646'/0/0": 'celestia13yma2hz8um4k0jl4ll3drm7a74dyuhjcdymguf',
        "m/44'/118'/2147483647'/0/0": 'celestia1yndw3tw0jlek9jr75ylv8re8nthze3354frjtf',
      },
    },
    {
      method: 'suiGetAddress',
      name: 'suiGetAddress',
      params: {
        path: "m/44'/784'/$$INDEX$$'/0'/0'",
      },
      expectedAddress: {
        "m/44'/784'/0'/0'/0'": '0x00904ce2f42fb6cc5bc8b2e54746ca0d3e4823a63a0d2f392561db0b61ccaae2',
        "m/44'/784'/1'/0'/0'": '0x071fdf059f6cca0c142189a4f24be55a7f0bda63f4ff324660cb6b4b8327fc0a',
        "m/44'/784'/21234567'/0'/0'":
          '0xa8c1db73076b02fea2ccc934f0c0b7716e4cda2e7415887222b476010b93acaa',
        "m/44'/784'/2147483646'/0'/0'":
          '0xb7ad414a2a21c994ad40c26284bf2dc88045ffbae9c8abbb11fbcc6a0a0109c5',
        "m/44'/784'/2147483647'/0'/0'":
          '0x864e025c9e502eab83c0b8740ba1e5c7e1da1310df2ee254a0b289e850b64119',
      },
    },
    {
      method: 'xrpGetAddress',
      name: 'xrpGetAddress',
      params: {
        path: "m/44'/144'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/144'/0'/0/0": 'rfJgYqqiUeXUoxLdwP1udZkGQqcVHoj719',
        "m/44'/144'/1'/0/0": 'rJKRhjtkqzNFBmnN4WYGzVnpi1SydWRyoE',
        "m/44'/144'/21234567'/0/0": 'rJCZBobbUEcLhYVMan9EPXGvVWY2CgYQFv',
        "m/44'/144'/2147483646'/0/0": 'r4WZ1e3nYUtRh9gHughJs1gQ1vnF1J2niY',
        "m/44'/144'/2147483647'/0/0": 'rnpXtDVpAxxGr3dLZx9Xw8w44Q6hHmQZXY',
      },
    },
    {
      method: 'benfenGetAddress',
      name: 'benfenGetAddress',
      params: {
        path: "m/44'/728'/$$INDEX$$'/0'/0'",
      },
      expectedAddress: {
        "m/44'/728'/0'/0'/0'":
          'BFC483a5bf3eec5c42c0bd4e3cd419306945acb904a14b320ddc86456c76cf81b76141c',
        "m/44'/728'/1'/0'/0'":
          'BFC3131f5ec869b08e278c60c2b4e2eb4259e5068a412acef80bd84db2bec63bd6decb7',
        "m/44'/728'/21234567'/0'/0'":
          'BFCe02bb6e1230a8ec974d2939abcb608896c88d76de2bf02363e2e95110e049b1dd680',
        "m/44'/728'/2147483646'/0'/0'":
          'BFCd422221e87f0235cf3552b5cc8dc8aab201736e3481750f77c6a3e1db9b65563b0fe',
        "m/44'/728'/2147483647'/0'/0'":
          'BFC9ce71c738ac1b4603913c54cfd754849d0e202fa0c314f1f201317e647ff8d9bd2f9',
      },
    },
    {
      method: 'alephiumGetAddress',
      name: 'alephiumGetAddress',
      params: {
        path: "m/44'/1234'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/1234'/0'/0/0": '1HoLhvnsSSQLAS9fYLhM82B1s5ghWTiGac7khTiS2HTZ5',
        "m/44'/1234'/1'/0/0": '1Cg57m5G6J2EjfRFoRmQvHQu7NjLnsHWZ9zH2hvWiH4SS',
        "m/44'/1234'/21234567'/0/0": '1KaQ68wvrYYXbShJYRWZCVLZYLHgGpsdBFfCHWkhT6Nu',
        "m/44'/1234'/2147483646'/0/0": '194cMZycsS4vPW81BGDRg1TQhf3dayui4VHQxBCqJpa7f',
        "m/44'/1234'/2147483647'/0/0": '135nLS9YXog65XVjuiGC8WTMMzBSawQcCDF4TNUUTYmxw',
      },
    },
    {
      method: 'algoGetAddress',
      name: 'algoGetAddress',
      params: {
        path: "m/44'/283'/$$INDEX$$'/0'/0'",
      },
      expectedAddress: {
        "m/44'/283'/0'/0'/0'": 'JTZWJWFSE3JN6NN3OAMEP32XWTUZNZHT2HQO23IN6RIFPFGQ37FSFISS5I',
        "m/44'/283'/1'/0'/0'": 'OES7KBWQZ6VV2YKZK4XCGAYWE5UN6TEQRBVY4ANLHK3FWJ4HQSILIXDISQ',
        "m/44'/283'/21234567'/0'/0'": 'KUNE36CFEHSB7KITDRHJPY5FLX4BW3Y4QEJ5ILLMC3ZZHQISGSAQE76SUA',
        "m/44'/283'/2147483646'/0'/0'":
          'ZE5TA7VQT6I7677ZTHPMNPOI4MVIF3WUBIY3OQAHNA5XHY6HDDEUP3LBS4',
        "m/44'/283'/2147483647'/0'/0'":
          'H4PU537GZMCONETYDSS4FOKJNPWRD2GGB3QI7AZZPNV7DXC72L6TZLCKUA',
      },
    },
    {
      method: 'tonGetAddress',
      name: 'tonGetAddress',
      params: {
        path: "m/44'/607'/$$INDEX$$'",
        walletVersion: 3,
        isBounceable: false,
        isTestnetOnly: false,
        workchain: 0,
        walletId: 698983191,
      },
      expectedAddress: {
        "m/44'/607'/0'": 'UQDRGa0pKFKTyqwjD96wLsQQGi_C0ykDg1pO_8NMcLS-xHq5',
        "m/44'/607'/1'": 'UQCONh4BrPkcNFJmLSMgj6NBL48o3J49QhULVO7Finq6fXWc',
        "m/44'/607'/21234567'": 'UQAJ4m33Qi5IdecqQdyOY0tcB1K-q9qhdoj07EUp0FYW5mj2',
        "m/44'/607'/2147483646'": 'UQAJgtpD5F8JMkXhvp_4y0yuiwi4ryAk529BlLlPo91eWQuT',
        "m/44'/607'/2147483647'": 'UQBgs19afNk8_JEcY4-wFmjbgAlevh9JcJa7DjdKo5YYQtx2',
      },
    },
    {
      method: 'nervosGetAddress',
      name: 'nervosGetAddress',
      params: {
        path: "m/44'/309'/$$INDEX$$'/0/0",
        network: 'ckb',
      },
      expectedAddress: {
        "m/44'/309'/0'/0/0": 'ckb1qyqrma720t8dt4sjzkf46cya52zcyvesdgdslrhh0f',
        "m/44'/309'/1'/0/0": 'ckb1qyqwxdrc03j0x34vfzwgtwlycer3hav72qfq8hmk9z',
        "m/44'/309'/21234567'/0/0": 'ckb1qyqgphxav2kywsmnwzte6f7vr84vr4tscqsqx8l68z',
        "m/44'/309'/2147483646'/0/0": 'ckb1qyqx735vjz2nh6gdsavz607jmqkrh86rgq9qrvf6ny',
        "m/44'/309'/2147483647'/0/0": 'ckb1qyq2v5ctr3s5tf4mf28j00aqln2hlfm0p4ysr04nyj',
      },
    },
    {
      method: 'nexaGetAddress',
      name: 'nexaGetAddress',
      params: {
        path: "m/44'/29223'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/29223'/0'/0/0": 'nexa:nqtsq5g5pwf6z0gx3lmcrw8szf6ej05wl00770qdrsazherr',
        "m/44'/29223'/1'/0/0": 'nexa:nqtsq5g5prd2vvejcuzkux9z68jskxdrw33hlddy3q6uft5w',
        "m/44'/29223'/21234567'/0/0": 'nexa:nqtsq5g5znkwelx2kzf0gum4mstlngpz2xl3c35f8qyp7upa',
        "m/44'/29223'/2147483646'/0/0": 'nexa:nqtsq5g5yffsflcjmzwh7hr006s95t6fhjhf08l633ugv9f0',
        "m/44'/29223'/2147483647'/0/0": 'nexa:nqtsq5g58403afedmtehfe72al0ffvnyer30uqrprpfqan6e',
      },
    },
    {
      method: 'xrpGetAddress',
      name: 'xrpGetAddress',
      params: {
        path: "m/44'/144'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/144'/0'/0/0": 'rfJgYqqiUeXUoxLdwP1udZkGQqcVHoj719',
        "m/44'/144'/1'/0/0": 'rJKRhjtkqzNFBmnN4WYGzVnpi1SydWRyoE',
        "m/44'/144'/21234567'/0/0": 'rJCZBobbUEcLhYVMan9EPXGvVWY2CgYQFv',
        "m/44'/144'/2147483646'/0/0": 'r4WZ1e3nYUtRh9gHughJs1gQ1vnF1J2niY',
        "m/44'/144'/2147483647'/0/0": 'rnpXtDVpAxxGr3dLZx9Xw8w44Q6hHmQZXY',
      },
    },
    {
      method: 'scdoGetAddress',
      name: 'scdoGetAddress',
      params: {
        path: "m/44'/541'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/541'/0'/0/0": '1S01c82992a7ba3be75b53db0a2335c8a10fd649c1',
        "m/44'/541'/1'/0/0": '1S01fb72b440c45bccbe7177a548fe6336ee2b1d71',
        "m/44'/541'/21234567'/0/0": '1S0100b49bcfaba46dddfa645f54bf79e94cc921e1',
        "m/44'/541'/2147483646'/0/0": '1S0168a35cc797c9061b2e494d15342d2fb347f991',
        "m/44'/541'/2147483647'/0/0": '1S016c0df8b898dae06053522976a0800579dd3d91',
      },
    },
  ],
};
