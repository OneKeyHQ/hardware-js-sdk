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
        0: 'addr1qxhhdsde4m9zqzsdcp0r7uu74w58cg3rlqsuay36yhwyxxzretve85zpyxzcfvgfwuk0lexdlrpp0qyste3unmcckvhszmlcnq',
        30: 'addr1q8pugr8fauve7q2du4qd6kj54yhngnshj3p53af58a0su4c9laqz8xxzvee3wypn5unyy8pstrx7ax02d7y4jdljtggqgmvyjg',
        2147483647:
          'addr1qyquvlrl0cv0cye0l9p9w08re2v8rz6949leu9702nu2m0m3wddg97tfx074rjw2e40rnjg72hnq673lmcqdgs2uqqjq3ea05s',
      },
    },
    {
      method: 'algoGetAddress',
      expectedAddress: {
        0: 'XCNCWL2UVSQ22GS2XQKMBT7U2OYMAAJTW4FKOUFHSUEZFQTTUVAX7HXFTE',
        30: 'YN6EFO7UJT5NK6GZ6CIG527GFTAUDMLVP2Z6U4VEF5LVRCVL2E366V4LPY',
        2147483647: '27G52A2OGWFROKE7KQIQILJDRJE2ZV75JTGL7UBKRJ6MWMDFNXL5CZWMRM',
      },
    },
    {
      method: 'aptosGetAddress',
      expectedAddress: {
        0: '0xab7043e373c12d3a5b259718fb4775d22f62535482793867d20b2c1afcaca84b',
        30: '0x7f47b9a80ddf1defff285eaac81097c022d8ddbfbc387a98c13abf25d7fdf644',
        2147483647: '0x458cd709cdb10501795a2f87177e822a87b915d56884e0d04e3e53f4037fb895',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Legacy',
      params: {
        path: `m/44'/0'/${INDEX_MARK}'/0/0`,
      },
      expectedAddress: {
        0: '1CEPnHbQ7VumTJgCo82cxqcuJhDiQKe1NY',
        30: '194jp3C6VQd7yhLRK2qwY5wKy7PUhNy9EK',
        2147483647: '1PT8Qe43uG9dmqEEvZFLhP4M2FJvU9vRUR',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Nested SegWit',
      params: {
        path: `m/49'/0'/${INDEX_MARK}'/0/0`,
      },
      expectedAddress: {
        0: '3KQss93Mn49iyjJad3QD8n9dqyTV23zE9j',
        30: '3FV9zbHLSbCLp7Q4Lpe5P86DUHK7awuXJU',
        2147483647: '3NtR3cgJXLdjT5HjrwpWDHE5JPZ722BdpG',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Native SegWit',
      params: {
        path: `m/84'/0'/${INDEX_MARK}'/0/0`,
      },
      expectedAddress: {
        0: 'bc1qv2zm83y5q4l0dhrc6tchkmj3q97kwyxxy6gkjt',
        30: 'bc1qv3tx67rxf2std2t2jgt9srpasajks9gklpf6th',
        2147483647: 'bc1qncea8t9v3x9t488urq9uwxcu7pyagu8p6l7gyc',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Taproot',
      params: {
        path: `m/86'/0'/${INDEX_MARK}'/0/0`,
      },
      expectedAddress: {
        0: 'bc1ppuksfx3xwnjxc8c689e2lddqh8r47frrd6rm32tjrmfltfmmutmq7ceygk',
        30: 'bc1pq86asdcjj5hd0arct3ptshesyt6lz55e6stfjv2h528km9ryt9lqgdakrl',
        2147483647: 'bc1p98axy6acg82p83827846f5w7njuewlexc2jucm8c8drstpv4f7aqgc6u36',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-Doge',
      params: {
        path: `m/44'/3'/${INDEX_MARK}'/0/0`,
        coin: 'doge',
      },
      expectedAddress: {
        0: 'DPrjiHm6aYmGrkbu8kfgJELGMCspRow1Yq',
        30: 'DDThbkXCo8uB31kCahb4DH9v5DRDTzWLiA',
        2147483647: 'DUDEMAqxN9tJVvdNZZ72BQAoYzWZL4Yb67',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-BCH',
      params: {
        path: `m/44'/145'/${INDEX_MARK}'/0/0`,
        coin: 'bch',
      },
      expectedAddress: {
        0: 'bitcoincash:qpgxr82pwc0d8z3dcu3hcng5v7snt0eyyyk66wj5mg',
        30: 'bitcoincash:qrh3pff0ee3fkk0vw6npl5luhqar3ev5tsxnstzrrl',
        2147483647: 'bitcoincash:qrqdxpmvlrykznam8p4fjlky0289spde7y94a2qlwa',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-LTC Legacy',
      params: {
        path: `m/44'/2'/${INDEX_MARK}'/0/0`,
        coin: 'ltc',
      },
      expectedAddress: {
        0: 'LbnBj1X9Z9Vdcf2r9xPzvSZwpJQWpx8URY',
        30: 'LSs6296XRon5UG3zFYU1EUD64uKR8cnk66',
        2147483647: 'LdrSuTEk6adrht6381uHhDrZ8NhPYiiTw1',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-LTC Nested SegWit',
      params: {
        path: `m/49'/2'/${INDEX_MARK}'/0/0`,
        coin: 'ltc',
      },
      expectedAddress: {
        0: 'MKZQZecmZeTvBuUKzSYWwpg1wusbTTj4vq',
        30: 'MRSLKh5H8ZWYA6x9y5yxeGMey58uPJs5Yj',
        2147483647: 'MK2rbpn14Qgg3qK5bAS8dVqmw8CU8nNco1',
      },
    },
    {
      method: 'btcGetAddress',
      name: 'btcGetAddress-LTC Native SegWit',
      params: {
        path: `m/84'/2'/${INDEX_MARK}'/0/0`,
        coin: 'ltc',
      },
      expectedAddress: {
        0: 'ltc1qh53mpwkyw3xt5lhd5hchj2vn03m8pu7nmgj7n0',
        30: 'ltc1qwyx8wwjrffzhnap04uat2wk4s9l7dzzzlftx9j',
        2147483647: 'ltc1q6ehct38zx0ahan4m2xypvcrv32f0m9zfl3p0gg',
      },
    },
    {
      method: 'confluxGetAddress',
      expectedAddress: {
        0: 'cfx:aajbu57n73kf4trnrw2eaa8yhwe8h9kghu1wvsvdpj',
        30: 'cfx:aanf5sjaj80sx7gfvju10d7whpb6g859njgy2sgf7n',
        2147483647: 'cfx:aak0twww2d113y3fknkxejyzgxf54ybadpwd46kpz5',
      },
    },
    {
      method: 'cosmosGetAddress',
      expectedAddress: {
        0: 'cosmos140vfyw4g46z7e527ugphhj3z4m5flwjqpydc5t',
        30: 'cosmos10wcasgzyut2fhgvxzqq7k4ynzx96k0rv0agfpx',
        2147483647: 'cosmos1tpymqxy5emhfypchsl9dh9n9u7gw7w6hw55d2t',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-akash',
      params: {
        hrp: 'akash',
      },
      expectedAddress: {
        0: 'akash140vfyw4g46z7e527ugphhj3z4m5flwjqvlqld3',
        30: 'akash10wcasgzyut2fhgvxzqq7k4ynzx96k0rvzx9wcu',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-crypto',
      params: {
        hrp: 'cro',
      },
      expectedAddress: {
        0: 'cro140vfyw4g46z7e527ugphhj3z4m5flwjqel9pg6',
        30: 'cro10wcasgzyut2fhgvxzqq7k4ynzx96k0rvhxqsah',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-fetch',
      params: {
        hrp: 'fetch',
      },
      expectedAddress: {
        0: 'fetch140vfyw4g46z7e527ugphhj3z4m5flwjqjeyuku',
        30: 'fetch10wcasgzyut2fhgvxzqq7k4ynzx96k0rvuqpdr3',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-osmo',
      params: {
        hrp: 'osmo',
      },
      expectedAddress: {
        0: 'osmo140vfyw4g46z7e527ugphhj3z4m5flwjqfl7gze',
        30: 'osmo10wcasgzyut2fhgvxzqq7k4ynzx96k0rv8xmeh5',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-juno',
      params: {
        hrp: 'juno',
      },
      expectedAddress: {
        0: 'juno140vfyw4g46z7e527ugphhj3z4m5flwjqhkwrnh',
        30: 'juno10wcasgzyut2fhgvxzqq7k4ynzx96k0rve0tjx6',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-terra',
      params: {
        hrp: 'terra',
      },
      expectedAddress: {
        0: 'terra140vfyw4g46z7e527ugphhj3z4m5flwjq8qhckt',
        30: 'terra10wcasgzyut2fhgvxzqq7k4ynzx96k0rvfejfrx',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-secret',
      params: {
        hrp: 'secret',
      },
      expectedAddress: {
        0: 'secret140vfyw4g46z7e527ugphhj3z4m5flwjqrpe3fh',
        30: 'secret10wcasgzyut2fhgvxzqq7k4ynzx96k0rvdcuqu6',
      },
    },
    {
      method: 'cosmosGetAddress',
      name: 'cosmosGetAddress-celestia',
      params: {
        hrp: 'celestia',
      },
      expectedAddress: {
        0: 'celestia140vfyw4g46z7e527ugphhj3z4m5flwjqswugwx',
        30: 'celestia10wcasgzyut2fhgvxzqq7k4ynzx96k0rv7heemt',
      },
    },
    {
      method: 'evmGetAddress',
      expectedAddress: {
        0: '0x503Ea88252630003647384E2459F7c92A3FEe128',
        30: '0xB723F656A1E889dcf64813Cc7Dc88bC8F8364Ac8',
        2147483647: '0x1C00B5178Bb2C12b51457980637460bC239e4132',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ledger Live',
      params: {
        path: `m/44'/61'/${INDEX_MARK}'/0/0`,
      },
      expectedAddress: {
        0: '0xe9a96566239EE5db9DAb988D12444800D46054FE',
        2147483647: '0x147A795c1BC346bA0d042d9697CA58e3b3585a34',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-ETC',
      params: {
        path: `m/44'/61'/0'/0/${INDEX_MARK}`,
      },
      expectedAddress: {
        0: '0xe9a96566239EE5db9DAb988D12444800D46054FE',
        2147483647: '0xAEC540C189fFa7B3Ef50f28d21c01D4F176a2eB2',
      },
    },
    {
      method: 'filecoinGetAddress',
      expectedAddress: {
        0: 'f1gcjpr2tsy72rglyi6jodmejz2jj2errnruiinei',
        30: 'f14ocm6a4icww52dpizv34unskkbnk5sufsyjxxba',
        2147483647: 'f1ihvrn6qi3vs4adxqjxil2jkb5nbyv5lwo3pzhoi',
      },
    },
    {
      method: 'kaspaGetAddress',
      expectedAddress: {
        0: 'kaspa:qrp2ug96grcms7jtmtk0gmu02vyr0f5ujez7tkthau8ep4sp8qrw6qv590zst',
        30: 'kaspa:qps886cxusuz2wgzg6nfuwy6wwpxgklgjvf94hqt0j5d4regmxp3qkke7mgde',
        2147483647: 'kaspa:qqsg6rnerhcpytms9927jw4wl6x2tdr74dzpu480gh292z7apy48u67lxmsje',
      },
    },
    {
      method: 'nearGetAddress',
      expectedAddress: {
        0: '2de8e948d313ec80939d92d80726a22483b2974355605a6e8d1d0b7ea5bbc6ec',
        30: 'd3e4934bb79ba06dfeb29a7e925ffbe37932c9821ff70efe9b66a33a21be70f2',
        2147483647: 'f58964ed72d1c0a58adef914db65efaed490b4f88624283a88779bf10bf653c6',
      },
    },
    {
      method: 'nemGetAddress',
      expectedAddress: {
        0: 'NDWDDNEVTIO2TG4CLCFSBZ7OLMVOLOIE3M5J6TSM',
        30: 'NCLRL2MBQG4MLHUDZIAE3MOLGNJ5WK43J36YVER3',
        2147483647: 'NDC3N3OREKGMJ7I3GYE733WLDD5IDUQRJEBWUILJ',
      },
    },
    {
      method: 'nexaGetAddress',
      expectedAddress: {
        0: 'nexa:nqtsq5g56jl86kjr0uf828hdl2g3jhknnchjrvyh95anyh84',
        30: 'nexa:nqtsq5g56kwqklq5md43sv29g335ku804kdcfj2vmx524gkx',
        2147483647: 'nexa:nqtsq5g5etzzam5dc96ryywlfguwj344h74aupq37nkp0ulc',
      },
    },
    {
      method: 'polkadotGetAddress',
      expectedAddress: {
        0: '16AGdX4BKpi6FNPnwmJtQrLbBZ9PMqzoCqhbgYMmbujTNeRP',
        30: '14dTucpnEV5GLba4TzfD8Ab6vCYiT71PiCUcbKHNjY3EKe42',
        2147483647: '15VBLKwvc66bQNLg1EJEihqsyBDs2ap74C36BRgq4pajGNRV',
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
        0: 'b6ZvUmCFH5j2fR7URi1JMfiQyrrdm9Q9YUFkxaGvBhtnS6U',
        2147483647: 'aRUdHewXYUEBfMzXthMcDB1CbwLJVxhztokFquLP6ZAg3KG',
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
        0: 'Hjb9W8z6QTYZVCikq4wAesSUXRyUDFqaioruueNXcvRwJkq',
        2147483647: 'H4VrK2jNfr3iV9bpJ4HUWNjG9WT8x59S59MQnyRzXmhq8Vz',
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
        0: 'j4WUt4E35LkweeSq2G6ha7rDRrKEKAS1prHbYtoQjUtrZqsHv',
        2147483647: 'j4Vonm2vpd2L9oSmuKZgvRhiidwJnqAq8hdw3PgjnwohqjJKe',
      },
    },
    {
      method: 'xrpGetAddress',
      expectedAddress: {
        0: 'rGSV5ySeX6ftbvw71x3kMK2Lf37iX4r5a2',
        2147483647: 'rBKFYGHDBchE67Ng3Yt9PYCjQiuqbfNcES',
      },
    },
    {
      method: 'solGetAddress',
      expectedAddress: {
        0: '46dT17fNdLTak5LN3KnHJMSiChhiXw8dfVoWwcJjmjAH',
        30: 'J5sdM9wX7cqMQoX7ZeYJUeUNKtpGHEwM8fcsHejvBqJ2',
        2147483647: 'HE78QPtCrsNbJbAE3FSM9igQzvJchG7z3Xjei8qgqFwk',
      },
    },
    {
      method: 'starcoinGetAddress',
      expectedAddress: {
        0: '0xb40179b63e29ddd731a39ae0f005600c',
        30: '0x6649bd18d3dd325afa9bf036811216c2',
        2147483647: '0xf22caa4c284984d814436b52d08f2e59',
      },
    },
    {
      method: 'stellarGetAddress',
      expectedAddress: {
        0: 'GDN3A6446V7TH2CB32J3J5DWDGUOCH55PDJ4GPUOFGCAR6CYIDAXRAF6',
        30: 'GAPYB3RDHA374U7X6HPWHTCU4HJR52FSPADTBIPVMGLSLALHFZXGVTZN',
        2147483647: 'GAVJ7CEYWIMZ63Y2HLKGPUITSG5YB3TT5ZNVSSH7UZFABU2SSBBMVMVL',
      },
    },
    {
      method: 'suiGetAddress',
      expectedAddress: {
        0: '0xc5145700a294bf69375d651ca97a34ddb6c2e2ad758633fba3334bb7c2e7a103',
        30: '0xbd1897326f5a9087109e11b3e3431b170c40a81f1b95c82c923fc29d7e107c07',
        2147483647: '0xb96b2e8c1c2fa11e081a6162700e1f2b421bcfa0bb61b62a12df1ee5510ce4ef',
      },
    },
    {
      method: 'tronGetAddress',
      expectedAddress: {
        0: 'TDgJvSgc2YrEaPM7j681rDH1rKmVhuREBA',
        30: 'TPgzUANbQBwBZMSveccPfSuL8JNpTSUEFN',
        2147483647: 'TRHTunHUuBLnu9VQWmjmAWVaYkX2urbxSm',
      },
    },
  ],
} as AddressTestCaseData;
