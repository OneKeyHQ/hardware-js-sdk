import { INDEX_MARK } from '../../baseParams';
import type { AddressTestCaseData } from '../types';

export default {
  name: 'three-passphrase18-empty',
  description: '助记词详见 https://onekeyhq.atlassian.net/wiki/spaces/ONEKEY/pages/428114271',
  passphrase: '',
  passphraseState: 'n2BKLUzeWAiE1WTVWoLgshKW3sqdiaECWE',
  data: [
    {
      method: 'cardanoGetAddress',
      expectedAddress: {
        '0': 'addr1qxhhdsde4m9zqzsdcp0r7uu74w58cg3rlqsuay36yhwyxxzretve85zpyxzcfvgfwuk0lexdlrpp0qyste3unmcckvhszmlcnq',
        '1': 'addr1qxd0k3nfus4ptdku2lj4n400m7nm5n3ftqrr36j7wd8fej84rxe9zzvjslulzm79xqv6xsazvrdkgq5ngl0kuqmd4etsek5cxd',
        '30': 'addr1q8pugr8fauve7q2du4qd6kj54yhngnshj3p53af58a0su4c9laqz8xxzvee3wypn5unyy8pstrx7ax02d7y4jdljtggqgmvyjg',
        '2147483646':
          'addr1qyfer3jncr0kz4m2jv8d0zl3m8rsf8vu9jkf32wqnedj5k6kjtexk5zjrmkxey7tgzvgxu8nupur4yzwp7acpjtevvjs0tz65u',
        '2147483647':
          'addr1qyquvlrl0cv0cye0l9p9w08re2v8rz6949leu9702nu2m0m3wddg97tfx074rjw2e40rnjg72hnq673lmcqdgs2uqqjq3ea05s',
      },
    },
    {
      method: 'algoGetAddress',
      expectedAddress: {
        '0': 'XCNCWL2UVSQ22GS2XQKMBT7U2OYMAAJTW4FKOUFHSUEZFQTTUVAX7HXFTE',
        '1': 'F7WN5UQNVEWASJ6MMO7TLB27T3FAC7XREAOWW53XLOYTM5NBIIVY3WQ62Y',
        '30': 'YN6EFO7UJT5NK6GZ6CIG527GFTAUDMLVP2Z6U4VEF5LVRCVL2E366V4LPY',
        '2147483646': 'XJNGNVU3C6G4FJTQSCBGHO7IWO7AB27YRW6KBLG42SKUJKPDSEGMPDM2RY',
        '2147483647': '27G52A2OGWFROKE7KQIQILJDRJE2ZV75JTGL7UBKRJ6MWMDFNXL5CZWMRM',
      },
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: {
        '0': '0xab7043e373c12d3a5b259718fb4775d22f62535482793867d20b2c1afcaca84b',
        '1': '0x88e4a439cc46cb2e3ab8c636a15b3f2490918d98464356dd4ae2ea6bceba7561',
        '30': '0x7f47b9a80ddf1defff285eaac81097c022d8ddbfbc387a98c13abf25d7fdf644',
        '2147483646': '0xebfc76fffd429f7f765740cd5347b35e9dc90a8336cb1a39dee479d82f523087',
        '2147483647': '0x458cd709cdb10501795a2f87177e822a87b915d56884e0d04e3e53f4037fb895',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Legacy',
      params: {
        path: "m/44'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '1CEPnHbQ7VumTJgCo82cxqcuJhDiQKe1NY',
        '1': '1CN21jZAXWBJDDFjyPS6dWoy8orgP9AVwZ',
        '30': '194jp3C6VQd7yhLRK2qwY5wKy7PUhNy9EK',
        '2147483646': '1A8Z2vyqfNz5yw71y5XXUr9Z6CpcMQWnrd',
        '2147483647': '1PT8Qe43uG9dmqEEvZFLhP4M2FJvU9vRUR',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Nested SegWit',
      params: {
        path: "m/49'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '3KQss93Mn49iyjJad3QD8n9dqyTV23zE9j',
        '1': '348XW6CHY5M6uvfYVr33es2ZokC8opDuB7',
        '30': '3FV9zbHLSbCLp7Q4Lpe5P86DUHK7awuXJU',
        '2147483646': '36WejMS5j4tB8KSLPVgzbUtYF7Zktwb5F2',
        '2147483647': '3NtR3cgJXLdjT5HjrwpWDHE5JPZ722BdpG',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Native SegWit',
      params: {
        path: "m/84'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1qv2zm83y5q4l0dhrc6tchkmj3q97kwyxxy6gkjt',
        '1': 'bc1qeqdmlvvv982dc9q6ms0j8dcsnrtamutgu4uyuv',
        '30': 'bc1qv3tx67rxf2std2t2jgt9srpasajks9gklpf6th',
        '2147483646': 'bc1qcw79y59n45y5zwttjvlwkfl70mrzkljyvp2tfd',
        '2147483647': 'bc1qncea8t9v3x9t488urq9uwxcu7pyagu8p6l7gyc',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Taproot',
      params: {
        path: "m/86'/0'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'bc1ppuksfx3xwnjxc8c689e2lddqh8r47frrd6rm32tjrmfltfmmutmq7ceygk',
        '1': 'bc1pdvhfsdt5ykr8v4sta98xf4n2hdsyj5sdq80h8waxalz5fpyy2mqqfhzhqh',
        '30': 'bc1pq86asdcjj5hd0arct3ptshesyt6lz55e6stfjv2h528km9ryt9lqgdakrl',
        '2147483646': 'bc1pcypewmqjyw0507kpx4302p4zd6uyuusw8lcl66gyt4qltr00kyeqvf2la6',
        '2147483647': 'bc1p98axy6acg82p83827846f5w7njuewlexc2jucm8c8drstpv4f7aqgc6u36',
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
        '0': 'DPrjiHm6aYmGrkbu8kfgJELGMCspRow1Yq',
        '1': 'D5KLXLH4vH8gZ8RttYo7ehc6cq2akcv5Wy',
        '30': 'DDThbkXCo8uB31kCahb4DH9v5DRDTzWLiA',
        '2147483646': 'DGaKnW6tRxq2wYn2uaBuJuPvH4irCBmcW4',
        '2147483647': 'DUDEMAqxN9tJVvdNZZ72BQAoYzWZL4Yb67',
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
        '0': 'bitcoincash:qpgxr82pwc0d8z3dcu3hcng5v7snt0eyyyk66wj5mg',
        '1': 'bitcoincash:qpy5sgaxxrefe9erh9l63d5p5y6qwjmhds8m3zrrkv',
        '30': 'bitcoincash:qrh3pff0ee3fkk0vw6npl5luhqar3ev5tsxnstzrrl',
        '2147483646': 'bitcoincash:qrlr5hhcxxry7f6uqlznfz3w0vxq6xqhnq9uyryrac',
        '2147483647': 'bitcoincash:qrqdxpmvlrykznam8p4fjlky0289spde7y94a2qlwa',
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
        '0': 'LbnBj1X9Z9Vdcf2r9xPzvSZwpJQWpx8URY',
        '1': 'LR1Lo3E3j9ZJ4ckyZ7eW4ZRd1R7kRm7Awd',
        '30': 'LSs6296XRon5UG3zFYU1EUD64uKR8cnk66',
        '2147483646': 'LRPECpvY7CtDSCwhABVpxVxWXeJRefJzJa',
        '2147483647': 'LdrSuTEk6adrht6381uHhDrZ8NhPYiiTw1',
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
        '0': 'MKZQZecmZeTvBuUKzSYWwpg1wusbTTj4vq',
        '1': 'MLbeLmJHmGxfNjzVjUzQprG5w7YJXpYdyL',
        '30': 'MRSLKh5H8ZWYA6x9y5yxeGMey58uPJs5Yj',
        '2147483646': 'MNCCeXMswpe3ZLBCqDy9cKQXvveAbYUk4X',
        '2147483647': 'MK2rbpn14Qgg3qK5bAS8dVqmw8CU8nNco1',
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
        '0': 'ltc1qh53mpwkyw3xt5lhd5hchj2vn03m8pu7nmgj7n0',
        '1': 'ltc1qqluc96kxcgfr7lgqrl09d5zrmq03wzslkrjhn9',
        '30': 'ltc1qwyx8wwjrffzhnap04uat2wk4s9l7dzzzlftx9j',
        '2147483646': 'ltc1q8qv2wpr6cjfslfmnfz8kz6tq4f3e52862gdll8',
        '2147483647': 'ltc1q6ehct38zx0ahan4m2xypvcrv32f0m9zfl3p0gg',
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
        '0': 'NP8pJqFiWuKo3BtstjWdFXaKxRGGq6Ffr3',
        '1': 'Nb1eqPo9ks61uFLB3PhPvgxMD4udsUPwr1',
        '30': 'NdnZaiHAjJ2UXVTXxhbNxDiA93z5z1ivzr',
        '2147483646': 'NitsTven3LHC3KbLQFLytv2d47KZLCUMhy',
        '2147483647': 'NMXdcBc1262pwaDkAxanEUyc7pPJLzdn4B',
      },
    },
    {
      method: 'nervosGetAddress',
      name: 'nervosGetAddress',
      params: {
        path: "m/44'/309'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': 'ckb1qyqpqe4u8kldu22h6wfxsevds87um6czqzwsskhkrk',
        '1': 'ckb1qyqr4qj0p9y4v798856vfzsca7uxeyj68dwqamp9qt',
        '30': 'ckb1qyq9hvyqqhgs46qhsdzlu4yx00qj54urlq7sc4zud7',
        '2147483646': 'ckb1qyq8tzlky0vhl86pcfwqelgxngkz35j803dsexs8c9',
        '2147483647': 'ckb1qyq8x0cnz84nflkx4nqqw2eal4fkd949q3ss8y473w',
      },
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: {
        '0': 'cfx:aajbu57n73kf4trnrw2eaa8yhwe8h9kghu1wvsvdpj',
        '1': 'cfx:aaj1b8sjcaa915zf4pk59ap7yb1djhh8jewjywptg9',
        '30': 'cfx:aanf5sjaj80sx7gfvju10d7whpb6g859njgy2sgf7n',
        '2147483646': 'cfx:aajwtjtbre9t36vur0taaw63pksdcw08g2ta10k11y',
        '2147483647': 'cfx:aak0twww2d113y3fknkxejyzgxf54ybadpwd46kpz5',
      },
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: {
        '0': 'cosmos140vfyw4g46z7e527ugphhj3z4m5flwjqpydc5t',
        '1': 'cosmos12wpskua8efy3g800tc3jz82eza7hcgax2wlqx9',
        '30': 'cosmos10wcasgzyut2fhgvxzqq7k4ynzx96k0rv0agfpx',
        '2147483646': 'cosmos1fzpk3nnl3tw8w46a5w5kgaxg8g2xd75s5sn5qn',
        '2147483647': 'cosmos1tpymqxy5emhfypchsl9dh9n9u7gw7w6hw55d2t',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-akash',
      params: {
        hrp: 'akash',
      },
      expectedAddress: {
        '0': 'akash140vfyw4g46z7e527ugphhj3z4m5flwjqvlqld3',
        '1': 'akash12wpskua8efy3g800tc3jz82eza7hcgax84j8ll',
        '30': 'akash10wcasgzyut2fhgvxzqq7k4ynzx96k0rvzx9wcu',
        '2147483646': 'akash1fzpk3nnl3tw8w46a5w5kgaxg8g2xd75set7nef',
        '2147483647': 'akash1tpymqxy5emhfypchsl9dh9n9u7gw7w6hr0e2n3',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-crypto',
      params: {
        hrp: 'cro',
      },
      expectedAddress: {
        '0': 'cro140vfyw4g46z7e527ugphhj3z4m5flwjqel9pg6',
        '1': 'cro12wpskua8efy3g800tc3jz82eza7hcgaxj4he65',
        '30': 'cro10wcasgzyut2fhgvxzqq7k4ynzx96k0rvhxqsah',
        '2147483646': 'cro1fzpk3nnl3tw8w46a5w5kgaxg8g2xd75svtmduz',
        '2147483647': 'cro1tpymqxy5emhfypchsl9dh9n9u7gw7w6hk0u5k6',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-fetch',
      params: {
        hrp: 'fetch',
      },
      expectedAddress: {
        '0': 'fetch140vfyw4g46z7e527ugphhj3z4m5flwjqjeyuku',
        '1': 'fetch12wpskua8efy3g800tc3jz82eza7hcgaxenkyyj',
        '30': 'fetch10wcasgzyut2fhgvxzqq7k4ynzx96k0rvuqpdr3',
        '2147483646': 'fetch1fzpk3nnl3tw8w46a5w5kgaxg8g2xd75s8d6szy',
        '2147483647': 'fetch1tpymqxy5emhfypchsl9dh9n9u7gw7w6hafafgu',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-osmo',
      params: {
        hrp: 'osmo',
      },
      expectedAddress: {
        '0': 'osmo140vfyw4g46z7e527ugphhj3z4m5flwjqfl7gze',
        '1': 'osmo12wpskua8efy3g800tc3jz82eza7hcgaxz4vssh',
        '30': 'osmo10wcasgzyut2fhgvxzqq7k4ynzx96k0rv8xmeh5',
        '2147483646': 'osmo1fzpk3nnl3tw8w46a5w5kgaxg8g2xd75sutqykp',
        '2147483647': 'osmo1tpymqxy5emhfypchsl9dh9n9u7gw7w6hx08aue',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-juno',
      params: {
        hrp: 'juno',
      },
      expectedAddress: {
        '0': 'juno140vfyw4g46z7e527ugphhj3z4m5flwjqhkwrnh',
        '1': 'juno12wpskua8efy3g800tc3jz82eza7hcgaxuuumpe',
        '30': 'juno10wcasgzyut2fhgvxzqq7k4ynzx96k0rve0tjx6',
        '2147483646': 'juno1fzpk3nnl3tw8w46a5w5kgaxg8g2xd75szzs080',
        '2147483647': 'juno1tpymqxy5emhfypchsl9dh9n9u7gw7w6hcxhkdh',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-terra',
      params: {
        hrp: 'terra',
      },
      expectedAddress: {
        '0': 'terra140vfyw4g46z7e527ugphhj3z4m5flwjq8qhckt',
        '1': 'terra12wpskua8efy3g800tc3jz82eza7hcgaxv29qy9',
        '30': 'terra10wcasgzyut2fhgvxzqq7k4ynzx96k0rvfejfrx',
        '2147483646': 'terra1fzpk3nnl3tw8w46a5w5kgaxg8g2xd75sj5f5zn',
        '2147483647': 'terra1tpymqxy5emhfypchsl9dh9n9u7gw7w6hgswdgt',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-secret',
      params: {
        hrp: 'secret',
      },
      expectedAddress: {
        '0': 'secret140vfyw4g46z7e527ugphhj3z4m5flwjqrpe3fh',
        '1': 'secret12wpskua8efy3g800tc3jz82eza7hcgaxgttfme',
        '30': 'secret10wcasgzyut2fhgvxzqq7k4ynzx96k0rvdcuqu6',
        '2147483646': 'secret1fzpk3nnl3tw8w46a5w5kgaxg8g2xd75sk48aa0',
        '2147483647': 'secret1tpymqxy5emhfypchsl9dh9n9u7gw7w6hv3qyhh',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-celestia',
      params: {
        hrp: 'celestia',
      },
      expectedAddress: {
        '0': 'celestia140vfyw4g46z7e527ugphhj3z4m5flwjqswugwx',
        '1': 'celestia12wpskua8efy3g800tc3jz82eza7hcgaxmywsug',
        '30': 'celestia10wcasgzyut2fhgvxzqq7k4ynzx96k0rv7heemt',
        '2147483646': 'celestia1fzpk3nnl3tw8w46a5w5kgaxg8g2xd75s96zy67',
        '2147483647': 'celestia1tpymqxy5emhfypchsl9dh9n9u7gw7w6hl79asx',
      },
    },
    {
      method: 'dnxGetAddress',
      expectedAddress: {
        '0': 'XwojzZuk7qSigtoHHLiEtkb8F85ei6jNfVhqX8Njen1p6M17KgoBjgKG1CMMwbAmeRCiEGGhGxVn61PkZ3HNLRAn1eX5XdKQD',
        '1': 'Xwnw4JKJspR7d1isLoRXEb8CEVSQGAnn7euqGebUMZhb57uHXHCpZNgNzPdz4ieaCASxPAEwqjajdDXuLjBNrVkX1EL4XSA1Z',
        '30': 'XwnwvwCa5vZ878X8aLZX3bP39wAcKevdEViWqrc9KrPYHVDBYzoL6YwczTbRMnyTD8Q9SbWKpgYvD783ak5vmP4d1euTm6Eq5',
        '2147483646':
          'XwoZUwLnJnDbrujdN8ZAJ4DevmbyRC9wD7WoaiGqmPCDboLboLPXUUiKviUJ3B91syVbJfE3eDZu5dDXDuGLHnTC2qXTwFDSF',
        '2147483647':
          'XwoEeACwQGzj9jr6s6EsQSEaJLb742HiwYjABSHqaKi61BzMmTXVQSn3zRfj6gqD1zQQdkNqrLF64JQb93KDqozo1Nzz4nvYE',
      },
    },
    {
      method: 'evmGetAddress',
      expectedAddress: {
        '0': '0x503Ea88252630003647384E2459F7c92A3FEe128',
        '1': '0x616131a4a70107701B00aD90B88e2D80746203c8',
        '30': '0xB723F656A1E889dcf64813Cc7Dc88bC8F8364Ac8',
        '2147483646': '0x0e0163313681E800815225121e1207453A460236',
        '2147483647': '0x1C00B5178Bb2C12b51457980637460bC239e4132',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ledger Live',
      params: {
        path: "m/44'/61'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        '0': '0xe9a96566239EE5db9DAb988D12444800D46054FE',
        '1': '0x17138CeBF928FCC90d396624B76C3e83fd162797',
        '30': '0x987A50FBEbf0151635e8420eC762Ab2A83161461',
        '2147483646': '0x1F8f69aAde3D27A07e826fd0E66b1e38AE493d53',
        '2147483647': '0x147A795c1BC346bA0d042d9697CA58e3b3585a34',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-ETC',
      params: {
        path: "m/44'/61'/0'/0/$$INDEX$$",
      },
      expectedAddress: {
        '0': '0xe9a96566239EE5db9DAb988D12444800D46054FE',
        '1': '0xEe0C867D233B62c8f6Fdd4bdf7Ce9F92b2136877',
        '30': '0xB77298e47e651be968E8B70Cb6370190C37D8f62',
        '2147483646': '0xc2AbBF90B634180abe9128120366A01a1Dd05b54',
        '2147483647': '0xAEC540C189fFa7B3Ef50f28d21c01D4F176a2eB2',
      },
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: {
        '0': 'f1gcjpr2tsy72rglyi6jodmejz2jj2errnruiinei',
        '1': 'f1joeh4izv7qej5aeqvgx4pzwwcseanncqpzfrpuq',
        '30': 'f14ocm6a4icww52dpizv34unskkbnk5sufsyjxxba',
        '2147483646': 'f1ovhdqu3yzxdkaw5ylf4l2kvut54b77dmwdgnlsi',
        '2147483647': 'f1ihvrn6qi3vs4adxqjxil2jkb5nbyv5lwo3pzhoi',
      },
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: {
        '0': 'kaspa:qrp2ug96grcms7jtmtk0gmu02vyr0f5ujez7tkthau8ep4sp8qrw6qv590zst',
        '1': 'kaspa:qrcx557p3za38z9szv23msqlz5pj03tuywza9v8ejl5p99zvkjpdy0f2zth7w',
        '30': 'kaspa:qps886cxusuz2wgzg6nfuwy6wwpxgklgjvf94hqt0j5d4regmxp3qkke7mgde',
        '2147483646': 'kaspa:qryqf29ntw9f6vvhyujegu47r9e035y800ccpf4jv8vhhajxugafuw7h4xrss',
        '2147483647': 'kaspa:qqsg6rnerhcpytms9927jw4wl6x2tdr74dzpu480gh292z7apy48u67lxmsje',
      },
    },
    {
      method: 'nearGetAddress',
      expectedAddress: {
        '0': '2de8e948d313ec80939d92d80726a22483b2974355605a6e8d1d0b7ea5bbc6ec',
        '1': 'cf5d5bdd6ef3b99cfbbef0ce3b622de8b628f39efbb5b34f6c87bc6fe7f1c7e3',
        '30': 'd3e4934bb79ba06dfeb29a7e925ffbe37932c9821ff70efe9b66a33a21be70f2',
        '2147483646': 'dbcb7e2dddef1aa867328674a635c0ba829892d0cabd93ef8306c03b0501521e',
        '2147483647': 'f58964ed72d1c0a58adef914db65efaed490b4f88624283a88779bf10bf653c6',
      },
    },
    {
      method: 'nemGetAddress',
      expectedAddress: {
        '0': 'NDWDDNEVTIO2TG4CLCFSBZ7OLMVOLOIE3M5J6TSM',
        '1': 'NDK6D3XLPI6S6DYTCS2AFNKRBNGSMG4EUE3WHHW2',
        '30': 'NCLRL2MBQG4MLHUDZIAE3MOLGNJ5WK43J36YVER3',
        '2147483646': 'NAZU5IW5IOFI7BXX2TDR4KPJKVCBBHJVP65AXE6C',
        '2147483647': 'NDC3N3OREKGMJ7I3GYE733WLDD5IDUQRJEBWUILJ',
      },
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: {
        '0': 'nexa:nqtsq5g56jl86kjr0uf828hdl2g3jhknnchjrvyh95anyh84',
        '1': 'nexa:nqtsq5g5wdqz4s9md5zmau4pxe5ktn0dc7p45lvxfmfnmxpc',
        '30': 'nexa:nqtsq5g56kwqklq5md43sv29g335ku804kdcfj2vmx524gkx',
        '2147483646': 'nexa:nqtsq5g5tumduu285uh0jl3psjpj5l0shftnxlh3gahju4z4',
        '2147483647': 'nexa:nqtsq5g5etzzam5dc96ryywlfguwj344h74aupq37nkp0ulc',
      },
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: {
        '0': '16AGdX4BKpi6FNPnwmJtQrLbBZ9PMqzoCqhbgYMmbujTNeRP',
        '1': '1PtXtGmBFKEJmRFHp2v5GEgijVkk8e9L2EydJcYGkpdXArt',
        '30': '14dTucpnEV5GLba4TzfD8Ab6vCYiT71PiCUcbKHNjY3EKe42',
        '2147483646': '14haHxbnxEAb4D8Bm3vLt4TbCLtriwFJbPyYGsjYkFUHDbzz',
        '2147483647': '15VBLKwvc66bQNLg1EJEihqsyBDs2ap74C36BRgq4pajGNRV',
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
        '0': 'b6ZvUmCFH5j2fR7URi1JMfiQyrrdm9Q9YUFkxaGvBhtnS6U',
        '1': 'WLBpqyn6hgs64SZpUS2xmZoxADE23nkGj1dhiq3b2o4vomh',
        '30': 'ZZmCaXo9wSu7tbNzf4L1fvE9dGBj29zeuFGfjVt3p1fjCTt',
        '2147483646': 'ZdsavJosgYDqW9WHiKTmZniRmcKzrPuY6kCMHx44XSidLk2',
        '2147483647': 'aRUdHewXYUEBfMzXthMcDB1CbwLJVxhztokFquLP6ZAg3KG',
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
        '0': 'Hjb9W8z6QTYZVCikq4wAesSUXRyUDFqaioruueNXcvRwJkq',
        '1': 'CyD3sMZwq4gctEB6snxq4mY1hnLrVuBhuMErfu9CU1c5hv7',
        '30': 'GCnRbub14pieiNzH4RFsy7xDAqJZUGS65aspgZyfFECtPAy',
        '2147483646': 'GGtowgbiov3NKw7a7gPdrzSVKBSqJWLyH5oWF29fxfFnJXT',
        '2147483647': 'H4VrK2jNfr3iV9bpJ4HUWNjG9WT8x59S59MQnyRzXmhq8Vz',
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
        '0': 'j4WUt4E35LkweeSq2G6ha7rDRrKEKAS1prHbYtoQjUtrZqsHv',
        '1': 'j4RiVxbFfCBYnhqrUc9RbnG7XPVagYifAyU8vqZfW9jwjzLCr',
        '30': 'j4Ux5LKogFRJpjg1HnL3tqATwaxdeFh2RMeNZoaLLcXALnpe1',
        '2147483646': 'j4V2BifagyAQ9THZR5PK2b4LRs6ynXXGLEqsVV8nWdEbPgq9Y',
        '2147483647': 'j4Vonm2vpd2L9oSmuKZgvRhiidwJnqAq8hdw3PgjnwohqjJKe',
      },
    },
    {
      method: 'polkadotGetAddress',
      name: 'polkadotGetAddress-manta',
      params: {
        prefix: '77',
        network: 'manta',
      },
      expectedAddress: {
        '0': 'dfbiHT26i6NCJrNAFtTu5wtCq4enB3hPZJcHoXLaXTN9RGbTY',
        '1': 'dfWwuMPKHwnoSumBiEWd7cJ6vbq8YRz2uRnqBU6qJ8DEbRB9k',
        '30': 'dfaBUj7sK12ZUwbLXQhFQfCTLoJBW8xQ9oy4pS7W8azTCDVtx',
        '2147483646': 'dfaFb7TeKimeofCtehkWYR6Kq5SXeQne4hAZk7fxJbhtF7XM6',
        '2147483647': 'dfb3C9pzTNdap1N78wvtSFji7rGreiSCs9xdJ2DuavGzhAC2V',
      },
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: {
        '0': 'rGSV5ySeX6ftbvw71x3kMK2Lf37iX4r5a2',
        '1': 'rpC6Njd36GMyKFVXdQqCHMvvQKX9tzc9Nx',
        '30': 'raYocLTzWmiqud843jsTsYJ3aT6eynuUNs',
        '2147483646': 'rGJAACDJmhZ9f2pdeiiMrDKMJwychD1Lvu',
        '2147483647': 'rBKFYGHDBchE67Ng3Yt9PYCjQiuqbfNcES',
      },
    },
    {
      method: 'solGetAddress',
      expectedAddress: {
        '0': '46dT17fNdLTak5LN3KnHJMSiChhiXw8dfVoWwcJjmjAH',
        '1': 'APUgr7fiB6NYZDjD6vAMPsJsvkBT5emYBAjNcW5yDgWQ',
        '30': 'J5sdM9wX7cqMQoX7ZeYJUeUNKtpGHEwM8fcsHejvBqJ2',
        '2147483646': '3m7EXuqAmHeGYikMHcDU7uL3WnruQmZSD9Umv6ak5e4L',
        '2147483647': 'HE78QPtCrsNbJbAE3FSM9igQzvJchG7z3Xjei8qgqFwk',
      },
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: {
        '0': '0xb40179b63e29ddd731a39ae0f005600c',
        '1': '0x98672d95b890c80339bc9ebccaa0ab52',
        '30': '0x6649bd18d3dd325afa9bf036811216c2',
        '2147483646': '0x4f0eb6270c2b5b5b6d956917cf617c38',
        '2147483647': '0xf22caa4c284984d814436b52d08f2e59',
      },
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: {
        '0': 'GDN3A6446V7TH2CB32J3J5DWDGUOCH55PDJ4GPUOFGCAR6CYIDAXRAF6',
        '1': 'GAQMGQ33V3QT25RTV2ISCCC4OCNVVREF4OPFESE7TZQVLRVMKI2XIXTW',
        '30': 'GAPYB3RDHA374U7X6HPWHTCU4HJR52FSPADTBIPVMGLSLALHFZXGVTZN',
        '2147483646': 'GAMCRU5MRMRKNYRJOTNB5KOCYOPUVWKXRJ7NEWREGWOAWU36COYVJAP6',
        '2147483647': 'GAVJ7CEYWIMZ63Y2HLKGPUITSG5YB3TT5ZNVSSH7UZFABU2SSBBMVMVL',
      },
    },
    {
      method: 'suiGetAddress',
      expectedAddress: {
        '0': '0xc5145700a294bf69375d651ca97a34ddb6c2e2ad758633fba3334bb7c2e7a103',
        '1': '0xfb8531094478a8b5ae24790f71efa690d928097076d8b077a38e5842f78c92a0',
        '30': '0xbd1897326f5a9087109e11b3e3431b170c40a81f1b95c82c923fc29d7e107c07',
        '2147483646': '0xc9f175fc0594f47ec204987d1641f9daf8babbb24b1eba79270d978a2aebb648',
        '2147483647': '0xb96b2e8c1c2fa11e081a6162700e1f2b421bcfa0bb61b62a12df1ee5510ce4ef',
      },
    },
    {
      method: 'tronGetAddress',
      expectedAddress: {
        '0': 'TDgJvSgc2YrEaPM7j681rDH1rKmVhuREBA',
        '1': 'TLGZL3Ww1oUNyBcFGpm153nMzA5vuWurHc',
        '30': 'TPgzUANbQBwBZMSveccPfSuL8JNpTSUEFN',
        '2147483646': 'TKciubBBXXGPBnxHsrjKjqP9Kef7E1HTpw',
        '2147483647': 'TRHTunHUuBLnu9VQWmjmAWVaYkX2urbxSm',
      },
    },
    {
      method: 'benfenGetAddress',
      expectedAddress: {
        '0': 'BFC30f7e71df92d63d524e98aea15a106a63f5f18223776a1e810b0fb4327d99b8dd101',
        '1': 'BFC0ed930f0c49924d6e4f62880a474f03f3bd4d60a20424f5b6e80fd0d387018b22894',
        '30': 'BFCada2b8aec4f0f561bc86b5646bd65d80444dc25538eb8d4c93ca4e6bc1d41ac96865',
        '2147483646': 'BFC085052bc29615c966efbca4f04e7b8af6419558f9af817af186a2ddfe3bbd37fd46b',
        '2147483647': 'BFC29185aca50b33e1f65b562df6892f2c2c2b85ded61bf8cdba13d05d829bf521f2719',
      },
    },
    {
      method: 'neoGetAddress',
      expectedAddress: {
        '0': 'NLBCLnHo9t6XjKQvDCTh5BC92X4FUHUW51',
        '1': 'NVFWehdL9w43ao6UVoF3xyzSQGD9DvGKmB',
        '30': 'NgCv44W8sQ4hEsc4ReSGxU82FzJp5Xcf9q',
        '2147483646': 'NiLGEW8QQAfNjxutvV8cAkMhtVs32y7jBw',
        '2147483647': 'NTv3bp6s4ZzP97UhbQDF4ZPa2x5h63fxGh',
      },
    },
  ],
} as AddressTestCaseData;
