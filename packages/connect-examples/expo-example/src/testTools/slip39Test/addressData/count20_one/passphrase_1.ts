import type { SLIP39TestCaseData } from '../../types';

export const count20OnePassphrase1: SLIP39TestCaseData = {
  id: 'count20_one_passphrase_1',
  name: 'count20_one_passphrase_1',
  description: '1-of-1 (20 words) + passphrase_1',
  passphrase: '12345',
  shares: [
    'fake kidney academic academic dwarf orange primary secret mixed auction priority daughter script smell smear judicial ceramic glen theory emphasis',
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
        "m/44'/0'/0'/0/0": '164UwQSCfgt9QKVD415tJz4eFwrLe5ePo3',
        "m/44'/0'/1'/0/0": '1KYpAsrtZPyvb3zoKHcLoKYP9LLDEMyLhm',
        "m/44'/0'/21234567'/0/0": '1GcqQDZhdr5dR46PUgPWV1WuEvQH9Ar2zY',
        "m/44'/0'/2147483646'/0/0": '1KZ1Qjk87L2s18f5m1bZy5TM67zh1kYdTj',
        "m/44'/0'/2147483647'/0/0": '17cRRxCDoS3mGaYTcAQ7LsuhGcDhvw75qq',
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
        "m/49'/0'/0'/0/0": '3GXfQ4GUoPC1xTWKEWKppepi4XKyKmMgpe',
        "m/49'/0'/1'/0/0": '37VxJRcaNAsggRfbkq9jFWYosiSHGeRnBo',
        "m/49'/0'/21234567'/0/0": '34AuQeHwBm38t36BjciuJw9Bw5bH4vJXdA',
        "m/49'/0'/2147483646'/0/0": '3KEAxxorAiapYoB8A5cqq9GWakBdsKBSkr',
        "m/49'/0'/2147483647'/0/0": '3LQrvzUMjkv8Kd1xUAMy7yfnYW2j5t1PKB',
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
        "m/84'/0'/0'/0/0": 'bc1qgnl82mwj3dj6j40zpn7nn5c244uatadnf2sfex',
        "m/84'/0'/1'/0/0": 'bc1quucmhzq8m6s6jeyukusnmjpakq4r9qw397upt9',
        "m/84'/0'/21234567'/0/0": 'bc1qwrm6fwfhvn5h68maxw2jy8h8w5dr7xmskx4r2y',
        "m/84'/0'/2147483646'/0/0": 'bc1q0mlpg2grh6zw8rh97xe73dsd97ar8qkkusq2k3',
        "m/84'/0'/2147483647'/0/0": 'bc1qyq6qlpa0sw3nnyvn89eetsauwgj2g00cepjcd2',
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
        "m/86'/0'/0'/0/0": 'bc1p27jja6g9hl0n6zghrtyt0tl7cer3u7z793lx99fy3afyf3vhf9nq97x48p',
        "m/86'/0'/1'/0/0": 'bc1p5xmn220nlquf66pl3hue08kxyj67mcsz0l6g3hv95yrpezqs4m6s525zal',
        "m/86'/0'/21234567'/0/0": 'bc1pscuqu0vwyzpkarps4a3jz5rtaymdq4rvqh5x88uljnev2kr6a58semhpls',
        "m/86'/0'/2147483646'/0/0":
          'bc1pfkhdaaemud3nq8m3au87yuurh3lfndczm43tg2hp7gqjtwdnhreqd87yfu',
        "m/86'/0'/2147483647'/0/0":
          'bc1pyex998dzw4uvm6exsm0leu2qcpwd2kte56tf7364s57a53w8se4sr7w3a5',
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
        "m/44'/3'/0'/0/0": 'DMpLpiVgJpbqNMijmz2SfdteRKu8RQFHWo',
        "m/44'/3'/1'/0/0": 'DMnKxL34NQsmmutW21N9RACz71xsVnDcNy',
        "m/44'/3'/21234567'/0/0": 'DFK7KXvNasXhKe2K56fPiP7zne6CqGz89k',
        "m/44'/3'/2147483646'/0/0": 'D8FyxxbKTuPHRvbrG6jbmWLedkfxEcm6yw',
        "m/44'/3'/2147483647'/0/0": 'DQqT6F3Moy62rMvWWBTYPTi9Exoe9bt2wd',
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
        "m/44'/145'/0'/0/0": 'bitcoincash:qp8dvyxss6y93hqq69kj8g0eddydqfuemc7q44rcaa',
        "m/44'/145'/1'/0/0": 'bitcoincash:qzkgppd7hpesmlxyv84tsavzfy7dpcupeyh8g9z6jx',
        "m/44'/145'/21234567'/0/0": 'bitcoincash:qznaxy2nt0a6ax9raaz08ttdphjekmuzjgm8t0d0pn',
        "m/44'/145'/2147483646'/0/0": 'bitcoincash:qp4elqkvucldgjrs3wh56fy098njeu45dsae0wun23',
        "m/44'/145'/2147483647'/0/0": 'bitcoincash:qqk4fz5g6qetma7dgym3kvux5w6zwaz5v5uh5dq3pq',
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
        "m/44'/2'/0'/0/0": 'LafeVh7Fu2m5CA13hkhxfoepAV9cTNVGkw',
        "m/44'/2'/1'/0/0": 'LKRE92ctME97aXvQUvcCtnddkNc9hg3yia',
        "m/44'/2'/21234567'/0/0": 'LQgcGxuMS2gaBUPKnwL7ezpQUzB9fjoKgH',
        "m/44'/2'/2147483646'/0/0": 'LcGLkYkfKviBhetinAdWNynnmAc7kssKx6',
        "m/44'/2'/2147483647'/0/0": 'LS8hkH4q5kkBY9H6KPEJt5S2rEK47iPVB4',
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
        "m/49'/2'/0'/0/0": 'M9RijxjeFBRumatBtZLcKDQT9PGcuqowrh',
        "m/49'/2'/1'/0/0": 'MD3AR8XmgG1WLeQYH8xrC9KtxiDR79q6it',
        "m/49'/2'/21234567'/0/0": 'M9jRZFEEe8JQfpMRjQBXdbRWg44HBAjxh9',
        "m/49'/2'/2147483646'/0/0": 'MLrpeQUoG24bq47Q4yCsLnNbTaMkEy8uB1',
        "m/49'/2'/2147483647'/0/0": 'ME9songLH89HEXJuTGXm1FNgfNdmEqBQUd',
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
        "m/84'/2'/0'/0/0": 'ltc1qh0pfpyazhp04zk8vgfy8makczs5k5l4nx7xy6h',
        "m/84'/2'/1'/0/0": 'ltc1qw5e2pz47jsaakzdg4nj37flf4w4j7tpr0yadhr',
        "m/84'/2'/21234567'/0/0": 'ltc1qfeytpwe0850c76fsw8masqf3s4mxt4l56zrylt',
        "m/84'/2'/2147483646'/0/0": 'ltc1qjgn7qw88j8aj7ke2n7m58f47y7qcnepqrkyhfx',
        "m/84'/2'/2147483647'/0/0": 'ltc1qtcdgxe72mksjsp0wtlxqvtay933ce2rax2r6lk',
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
        "m/44'/1900'/0'/0/0": 'NZRorKct9gbMvQeKc9uZF1RnEFWFnvUyFc',
        "m/44'/1900'/1'/0/0": 'Ndap7Qpsu2XEU5fmyUVRvtat3CiTptsiAK',
        "m/44'/1900'/21234567'/0/0": 'Nfsm9dhbgbWwDUFC3gWMk5XnQKLtFsBxzL',
        "m/44'/1900'/2147483646'/0/0": 'NPx8wfSdcAGcxzoUE2nHjQshWBXAmczSgm',
        "m/44'/1900'/2147483647'/0/0": 'NPL7NBYdic3JatFuaxp29n65hBFMDWqrUS',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ethereum',
      params: {
        path: "m/44'/60'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/60'/0'/0/0": '0xf0776334160c88c9fa673680D4eEf5C62Ad1FdfA',
        "m/44'/60'/1'/0/0": '0xe90e2CfabFA1a2696D2a3D12e9d4B4Ca3bCd8aA0',
        "m/44'/60'/21234567'/0/0": '0x12A3d4F1948Fad8EBF574BEee8059b8A6bbF7fee',
        "m/44'/60'/2147483646'/0/0": '0x938B00f2E61Dd968cAC20DF35D8BFE2c1B8eE2F7',
        "m/44'/60'/2147483647'/0/0": '0x087C309341d3F89389B2aC43C40d315Dfe82126D',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ethereum Classic',
      params: {
        path: "m/44'/61'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/61'/0'/0/0": '0x3306CEE7D2778e864707081251a6F18F29a4df3e',
        "m/44'/61'/1'/0/0": '0x8E3Abf99f1e9F5f489a34164c8b1865966A02F1B',
        "m/44'/61'/21234567'/0/0": '0xD4c269754810E3Fea3186Cb641Fab1D1E5285627',
        "m/44'/61'/2147483646'/0/0": '0xCfd8B0534300d619ade1ab547882CcF05c8cA372',
        "m/44'/61'/2147483647'/0/0": '0x687918e027fCBAd86c2871190d9eB3623D262153',
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
        "m/44'/118'/0'/0/0": 'cosmos1te7q6knnk9mf5eqnsytgv8yla4mkhsl2eaqql9',
        "m/44'/118'/1'/0/0": 'cosmos1j6axuwrgvr66xe3fg7hjsf8m477xfkpgnyc23q',
        "m/44'/118'/21234567'/0/0": 'cosmos1t269lmtz58q80psfll5md9ku8sg3c8pqg6la8s',
        "m/44'/118'/2147483646'/0/0": 'cosmos1ptp300tqafntzne47y6557mqpn0hmssz6lm9z9',
        "m/44'/118'/2147483647'/0/0": 'cosmos1h7dzxsfww7l9n6tpkul27quagamgly5lfg4chd',
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
        "m/44'/118'/0'/0/0": 'akash1te7q6knnk9mf5eqnsytgv8yla4mkhsl25xd8xl',
        "m/44'/118'/1'/0/0": 'akash1j6axuwrgvr66xe3fg7hjsf8m477xfkpg7l4dg6',
        "m/44'/118'/21234567'/0/0": 'akash1t269lmtz58q80psfll5md9ku8sg3c8pq9pj672',
        "m/44'/118'/2147483646'/0/0": 'akash1ptp300tqafntzne47y6557mqpn0hmsszhykzml',
        "m/44'/118'/2147483647'/0/0": 'akash1h7dzxsfww7l9n6tpkul27quagamgly5lynclwh',
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
        "m/44'/118'/0'/0/0": 'cro1te7q6knnk9mf5eqnsytgv8yla4mkhsl2pxger5',
        "m/44'/118'/1'/0/0": 'cro1j6axuwrgvr66xe3fg7hjsf8m477xfkpgtlsnd3',
        "m/44'/118'/21234567'/0/0": 'cro1t269lmtz58q80psfll5md9ku8sg3c8pqsphymp',
        "m/44'/118'/2147483646'/0/0": 'cro1ptp300tqafntzne47y6557mqpn0hmsszzynu75',
        "m/44'/118'/2147483647'/0/0": 'cro1h7dzxsfww7l9n6tpkul27quagamgly5l3naptu',
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
        "m/44'/118'/0'/0/0": 'fetch1te7q6knnk9mf5eqnsytgv8yla4mkhsl22qfyaj',
        "m/44'/118'/1'/0/0": 'fetch1j6axuwrgvr66xe3fg7hjsf8m477xfkpgqe3wnh',
        "m/44'/118'/21234567'/0/0": 'fetch1t269lmtz58q80psfll5md9ku8sg3c8pqm8ke98',
        "m/44'/118'/2147483646'/0/0": 'fetch1ptp300tqafntzne47y6557mqpn0hmsszfzjpqj',
        "m/44'/118'/2147483647'/0/0": 'fetch1h7dzxsfww7l9n6tpkul27quagamgly5l64uu46',
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
        "m/44'/118'/0'/0/0": 'osmo1te7q6knnk9mf5eqnsytgv8yla4mkhsl23xnsfh',
        "m/44'/118'/1'/0/0": 'osmo1j6axuwrgvr66xe3fg7hjsf8m477xfkpgmlt68j',
        "m/44'/118'/21234567'/0/0": 'osmo1t269lmtz58q80psfll5md9ku8sg3c8pqqpvd3z',
        "m/44'/118'/2147483646'/0/0": 'osmo1ptp300tqafntzne47y6557mqpn0hmsszjyg45h',
        "m/44'/118'/2147483647'/0/0": 'osmo1h7dzxsfww7l9n6tpkul27quagamgly5lpnxgpl',
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
        "m/44'/118'/0'/0/0": 'juno1te7q6knnk9mf5eqnsytgv8yla4mkhsl200rmce',
        "m/44'/118'/1'/0/0": 'juno1j6axuwrgvr66xe3fg7hjsf8m477xfkpg9km3ku',
        "m/44'/118'/21234567'/0/0": 'juno1t269lmtz58q80psfll5md9ku8sg3c8pq7guxqv',
        "m/44'/118'/2147483646'/0/0": 'juno1ptp300tqafntzne47y6557mqpn0hmsszvdc79e',
        "m/44'/118'/2147483647'/0/0": 'juno1h7dzxsfww7l9n6tpkul27quagamgly5ll6krs3',
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
        "m/44'/118'/0'/0/0": 'terra1te7q6knnk9mf5eqnsytgv8yla4mkhsl2le6qa9',
        "m/44'/118'/1'/0/0": 'terra1j6axuwrgvr66xe3fg7hjsf8m477xfkpg4qz2nq',
        "m/44'/118'/21234567'/0/0": 'terra1t269lmtz58q80psfll5md9ku8sg3c8pqw79a9s',
        "m/44'/118'/2147483646'/0/0": 'terra1ptp300tqafntzne47y6557mqpn0hmsszump9q9',
        "m/44'/118'/2147483647'/0/0": 'terra1h7dzxsfww7l9n6tpkul27quagamgly5l0v0c4d',
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
        "m/44'/118'/0'/0/0": 'secret1te7q6knnk9mf5eqnsytgv8yla4mkhsl2mc5fze',
        "m/44'/118'/1'/0/0": 'secret1j6axuwrgvr66xe3fg7hjsf8m477xfkpg3pvrvu',
        "m/44'/118'/21234567'/0/0": 'secret1t269lmtz58q80psfll5md9ku8sg3c8pq2lt56v',
        "m/44'/118'/2147483646'/0/0": 'secret1ptp300tqafntzne47y6557mqpn0hmsszc60vle',
        "m/44'/118'/2147483647'/0/0": 'secret1h7dzxsfww7l9n6tpkul27quagamgly5ltdp323',
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
        "m/44'/118'/0'/0/0": 'celestia1te7q6knnk9mf5eqnsytgv8yla4mkhsl2gh3s9g',
        "m/44'/118'/1'/0/0": 'celestia1j6axuwrgvr66xe3fg7hjsf8m477xfkpgzwf6td',
        "m/44'/118'/21234567'/0/0": 'celestia1t269lmtz58q80psfll5md9ku8sg3c8pqeswdaa',
        "m/44'/118'/2147483646'/0/0": 'celestia1ptp300tqafntzne47y6557mqpn0hmsszt424cg',
        "m/44'/118'/2147483647'/0/0": 'celestia1h7dzxsfww7l9n6tpkul27quagamgly5lczygdq',
      },
    },
    {
      method: 'suiGetAddress',
      name: 'suiGetAddress',
      params: {
        path: "m/44'/784'/$$INDEX$$'/0'/0'",
      },
      expectedAddress: {
        "m/44'/784'/0'/0'/0'": '0xd5fe4f37f6e495ad51028eba8954963d07de356dcaa4f98f1bab57317f9e5aea',
        "m/44'/784'/1'/0'/0'": '0x29906c3e83efe479f2077539d35d857948c95aee3f25aa41558da6b18d830a80',
        "m/44'/784'/21234567'/0'/0'":
          '0x348d366fd383dcc8e2ab5e74c0159e787be6abe2d20d7ad13026726f65f9479e',
        "m/44'/784'/2147483646'/0'/0'":
          '0x1173332c0552bfac5694a5aa6c98b6b85d06b31c3d7e9ed138d86676324ec112',
        "m/44'/784'/2147483647'/0'/0'":
          '0xd6c12a10181e149c8a4d5a917afb158cd27d8f2acf331ba5250e42bd4a3b595e',
      },
    },
    {
      method: 'xrpGetAddress',
      name: 'xrpGetAddress',
      params: {
        path: "m/44'/144'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/144'/0'/0/0": 'rnWp71fi7KLsxNAYkWesdJF7RsBZGnJfyL',
        "m/44'/144'/1'/0/0": 'rHK7hTcu8sA1UNqitQrTrwtrcAGBC7XaXK',
        "m/44'/144'/21234567'/0/0": 'rHVdo5coArrFtANNavK2N5qyFzzP7t2nKc',
        "m/44'/144'/2147483646'/0/0": 'rpjt8u4FaiYqnyMTyLL3WGLyHm8VCu4s8i',
        "m/44'/144'/2147483647'/0/0": 'rLmSybD6xMdWWFbNHBc1G6PK9go32saKLz',
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
          'BFC585b878b52329b1375c9b531b337eab134691277996b8cbc4236678ddcb91c8d1d46',
        "m/44'/728'/1'/0'/0'":
          'BFC19cc773522e501614f044515e651603d85ad80f6daa5dd08c0a8cced816bd5fdf752',
        "m/44'/728'/21234567'/0'/0'":
          'BFC983c8099b13a8d9f90657ce6c7376bed064c617cbb07938eac9fc08ff1ee0d3d9d20',
        "m/44'/728'/2147483646'/0'/0'":
          'BFC46b8ed0be3fb5e14e9e564513b14b4f5ebdf12c8bd3bd9e27f92ecb7d78500fb8123',
        "m/44'/728'/2147483647'/0'/0'":
          'BFCb4155c175ecd4bb72769be3763bbb39ec05363024a17cba728ebeab87a67e77b8707',
      },
    },
    {
      method: 'alephiumGetAddress',
      name: 'alephiumGetAddress',
      params: {
        path: "m/44'/1234'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/1234'/0'/0/0": '1FC2GiEv7qtW5VsusngWMmvnjETNc3Ttqta7P2Z8sGyuv',
        "m/44'/1234'/1'/0/0": '12qi11pn5wZfhYiqPGAdneEtyZLAmqwjZYYW9JJJUjdUZ',
        "m/44'/1234'/21234567'/0/0": '1p9EHM5bADH8ivn5Rn9fE7iKnrSddzYiihsynGFe6BJd',
        "m/44'/1234'/2147483646'/0/0": '1EGT8ABNmBrkCt1dXyFc2mhop2Sznq7EpqZLdpMw7TEdF',
        "m/44'/1234'/2147483647'/0/0": '178CDDcsnADuDTTiKtHXEgxZ25TfWKyfRNMXDiQmwfpr6',
      },
    },
    {
      method: 'algoGetAddress',
      name: 'algoGetAddress',
      params: {
        path: "m/44'/283'/$$INDEX$$'/0'/0'",
      },
      expectedAddress: {
        "m/44'/283'/0'/0'/0'": '6CCBWQSJJ7VHQSRGTJUX64G7FGYHQSNQLFGZ2EMGNYEPUXYL65LUPZDL5U',
        "m/44'/283'/1'/0'/0'": 'KQ6ETFXJ7VLEW3HY4UT4KGDDT7BKVNSOFLHQQZ3XHW2SDRQHWS7XSTT2QE',
        "m/44'/283'/21234567'/0'/0'": 'S4POUFEC77GOLCNTW6B3MLNA4FWMPIIGZH3OL5FISF3O6CYQQAUQ54D2YQ',
        "m/44'/283'/2147483646'/0'/0'":
          'B6PZGNRYNXQR3ITA4KSPKQBAO537IFYT6PMLFKSNNYYIO7MA75ZG2EY2BY',
        "m/44'/283'/2147483647'/0'/0'":
          '24QX3DA3TPSWUVHGU64V4EE6Y2FXHJIUGYRNAXDWCCIO3XKNVRHS2S4BBQ',
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
        "m/44'/607'/0'": 'UQDgGq7khKMhJsvYyNdG1xZFZpcMbZch-LqJTrxArh_FGntR',
        "m/44'/607'/1'": 'UQD1_SxxyOmzqLkvWjaHpcWH9zUfJq7H_kkVkaV3r78G85-D',
        "m/44'/607'/21234567'": 'UQDtyZaeaVk4K21qZEml4Nod02-THmeVjewWvFI075cEoL2L',
        "m/44'/607'/2147483646'": 'UQDHTfJ77G6j8vf7RyQ0MIbECBnTQNusZGxdImlao57Xf53o',
        "m/44'/607'/2147483647'": 'UQBty7Mcg9yETItDH2E799pOcJc7WwofAvv8Diab63ESkR6b',
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
        "m/44'/309'/0'/0/0": 'ckb1qyqgdfjhzh0jjt8ey98qs7m09k4ynl2dhx8q4swy63',
        "m/44'/309'/1'/0/0": 'ckb1qyqv67zuvuwsrm5fhpqn0dwgg6ll3js5dqsshl67j7',
        "m/44'/309'/21234567'/0/0": 'ckb1qyqxgxuca5c38ck9xrda8g65sjwaadkaav8sagt6ct',
        "m/44'/309'/2147483646'/0/0": 'ckb1qyq8rgw2q4ppfrl6h3wg9kw7y6glxgxh0y6qvvs67y',
        "m/44'/309'/2147483647'/0/0": 'ckb1qyqt4yqlg7e5cv3fr9pfjq4kdsqjtd208nus4y467u',
      },
    },
    {
      method: 'nexaGetAddress',
      name: 'nexaGetAddress',
      params: {
        path: "m/44'/29223'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/29223'/0'/0/0": 'nexa:nqtsq5g5awavj73d3p368ps0y3t3tmhymjg9lzwx24q87j9l',
        "m/44'/29223'/1'/0/0": 'nexa:nqtsq5g5r3hmny9qjpauexpce9h43vgskp2ydl6fdfa6n0f0',
        "m/44'/29223'/21234567'/0/0": 'nexa:nqtsq5g52jz22hxgat2eksnlptzswpm3a70tktp8mufqdl36',
        "m/44'/29223'/2147483646'/0/0": 'nexa:nqtsq5g5z6pjndscacyqzgye556szwpftw6kp6xvdajuz8na',
        "m/44'/29223'/2147483647'/0/0": 'nexa:nqtsq5g5n5n30cq6yukj03p2fwsrfnag84x294jg9rd28ttr',
      },
    },
    {
      method: 'xrpGetAddress',
      name: 'xrpGetAddress',
      params: {
        path: "m/44'/144'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/144'/0'/0/0": 'rnWp71fi7KLsxNAYkWesdJF7RsBZGnJfyL',
        "m/44'/144'/1'/0/0": 'rHK7hTcu8sA1UNqitQrTrwtrcAGBC7XaXK',
        "m/44'/144'/21234567'/0/0": 'rHVdo5coArrFtANNavK2N5qyFzzP7t2nKc',
        "m/44'/144'/2147483646'/0/0": 'rpjt8u4FaiYqnyMTyLL3WGLyHm8VCu4s8i',
        "m/44'/144'/2147483647'/0/0": 'rLmSybD6xMdWWFbNHBc1G6PK9go32saKLz',
      },
    },
    {
      method: 'scdoGetAddress',
      name: 'scdoGetAddress',
      params: {
        path: "m/44'/541'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/541'/0'/0/0": '1S0122d0a8660d7538180b87a057f29500addde5a1',
        "m/44'/541'/1'/0/0": '1S01f406e1030523750ebbc6897bbb3161e1df2d31',
        "m/44'/541'/21234567'/0/0": '1S01a778945d67d9e9939c327aabca9519e26acec1',
        "m/44'/541'/2147483646'/0/0": '1S0100fef1c2ec0dc565f473b12e038cbb3fedf151',
        "m/44'/541'/2147483647'/0/0": '1S014cc602e696c70f20b16ee8642b80e4003d9391',
      },
    },
  ],
};
