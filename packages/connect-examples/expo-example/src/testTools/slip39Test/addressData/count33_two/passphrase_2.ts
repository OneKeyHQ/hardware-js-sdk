import type { SLIP39TestCaseData } from '../../types';

export const count33TwoPassphrase2: SLIP39TestCaseData = {
  id: 'count33_two_passphrase_2',
  name: 'count33_two_passphrase_2',
  description: '2-of-3 (33 words each) + passphrase_2',
  passphrase: 'onekey',
  shares: [
    'yoga racism academic acid average silent year kind package pitch bracelet desert aide guilt render belong density forbid spark benefit trend junior fake dough silver spray adequate western liberty hearing strike prepare various',
    'yoga racism academic agency antenna aircraft nervous biology buyer invasion satoshi angry darkness skin guilt market fatal violence item platform painting width involve marathon parking duration pancake wildlife should execute silver metric oven',
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
        "m/44'/0'/0'/0/0": '1Bqu3CMfn9VHW2dX6hpFA65zTMQycaa8iR',
        "m/44'/0'/1'/0/0": '1DdYQCkci9vXPmujkYV8JjkFNBRmPTtDJx',
        "m/44'/0'/21234567'/0/0": '1GwjNzzgHUacw67GBDs1YvVX7DxDvS9zww',
        "m/44'/0'/2147483646'/0/0": '13Vtf8JWo2qXSUJh2xqguyn9NLwSxiQ6p8',
        "m/44'/0'/2147483647'/0/0": '1NG41SbbLSrSi8sW9s8wBC8ZjzTJgm16oZ',
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
        "m/49'/0'/0'/0/0": '3Pgd7Qs3oHcCymCsBnX7UwdzaKtoQg3owd',
        "m/49'/0'/1'/0/0": '3AaTB9bycqNHrcvfeoS1RhgR4rXqS1koDS',
        "m/49'/0'/21234567'/0/0": '3MF9x1WPLvxZr3cDfskeWLHHTw2bsqi5ym',
        "m/49'/0'/2147483646'/0/0": '3BgTZAm685HDCiXkkzRtMyE6zQbdmGsdQf',
        "m/49'/0'/2147483647'/0/0": '3L2JSvjmTr22n5iLnT68pJCLTQSKgrW39b',
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
        "m/84'/0'/0'/0/0": 'bc1qhk6c3lh4rfxykfd9ru0h2dpwu57yr8u4qk3nx5',
        "m/84'/0'/1'/0/0": 'bc1q0rx0lelr5pk6nhqgsd45mywd7fcxjw83v33hyh',
        "m/84'/0'/21234567'/0/0": 'bc1q3vg6zc8r3epdm8payww04u3694xlw6dj8apz86',
        "m/84'/0'/2147483646'/0/0": 'bc1qn9g8me6ctfsrg3g4xl7pc7p7j29u87zdmkh9sa',
        "m/84'/0'/2147483647'/0/0": 'bc1qxka43p3um7cthr2nxwtl9xyvfquqqy8mg8r559',
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
        "m/86'/0'/0'/0/0": 'bc1prhx8qn4576xhae66pammvewmjja5y4xylft7takhye0mek69x2esc8eppe',
        "m/86'/0'/1'/0/0": 'bc1p46tj5ucwfg6zpqccddrm834pjjsjsvp8ex36hxy4ekf8hrq0r4eqyxxrz0',
        "m/86'/0'/21234567'/0/0": 'bc1pcr5x4496s26myvl4ynf7j2l8v8pnemuknlch55l6kqgkpukd4lzq3etnuz',
        "m/86'/0'/2147483646'/0/0":
          'bc1pg83y7acu85kwn7ctda5zer8rudj0j6nkvfr4qde95myt8qu8rugsw26rsf',
        "m/86'/0'/2147483647'/0/0":
          'bc1prpe0n2gv2pmwtzjsl9tzntychhum7sw40dedxpdu2dlcgj20khzq0d9ykv',
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
        "m/44'/3'/0'/0/0": 'DRxLCdH1mLgy4khG93ShPj5E4H2EFvcyQ5',
        "m/44'/3'/1'/0/0": 'D7paf9QnrGM1Njj31txEmL1z4SHXyPCtGi',
        "m/44'/3'/21234567'/0/0": 'D8piZgz2CYVRrMBZ7ZCDWe1ETQNqHyWgCv',
        "m/44'/3'/2147483646'/0/0": 'D6MK7582Ums8zNXuZncxcFLbVSgwS21Esj',
        "m/44'/3'/2147483647'/0/0": 'DKRM1YbPXGVu7QhogRP19vQHn4tXaDv4n1',
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
        "m/44'/145'/0'/0/0": 'bitcoincash:qq7weldnqgxsjzm45qys8zpt55e2ffgtcq3t2az7m0',
        "m/44'/145'/1'/0/0": 'bitcoincash:qqajy2c2p8ly900wx3cz89m0p9stk8gq7vl3qwqe4y',
        "m/44'/145'/21234567'/0/0": 'bitcoincash:qzntwffjypkae7tnwqpgl90z3sevx2fvrujz9ahhrj',
        "m/44'/145'/2147483646'/0/0": 'bitcoincash:qrmxpsm3u070u0c8z4tu5a0c62cl306qksz278jrww',
        "m/44'/145'/2147483647'/0/0": 'bitcoincash:qpzyse2z8pjs0z2vzag3nuchqy9ku39qvcpsl2anwk',
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
        "m/44'/2'/0'/0/0": 'LVBVQKZbhik7LtniPMrKUTCQZmadSfyE9d',
        "m/44'/2'/1'/0/0": 'LTcfpbj8mSkB4rni7MHbM1AVTvFxFgVYtJ',
        "m/44'/2'/21234567'/0/0": 'Lf1VVF2sHcaW9Y2H1rGiUeci48KaaBTMdj',
        "m/44'/2'/2147483646'/0/0": 'LNKnMYU3e3g2Bp9Gc5JBXqmeFEFaSAUh8Z',
        "m/44'/2'/2147483647'/0/0": 'LeuXxBgMsuLJ1x9DhosTwLuvsXfeyWB3tY',
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
        "m/49'/2'/0'/0/0": 'MDNu1FewRMbhn1jczS2G7RcF5vZPzTmVzL',
        "m/49'/2'/1'/0/0": 'MFyZbvo2qvhcNN6nXnZqHQv7sDrXq98M8j',
        "m/49'/2'/21234567'/0/0": 'MTVUTEeptUgJmdkApPKzriMKpNei9p82eV',
        "m/49'/2'/2147483646'/0/0": 'M9zJEhAsaxCTEh5q9teZaDa8oW1Jw8xLQm',
        "m/49'/2'/2147483647'/0/0": 'MKr54XJtQz5ichZc4H4od1TyoaDSMgP1qz',
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
        "m/84'/2'/0'/0/0": 'ltc1q8f2zt8j35u6vny69mxwtm37tdcdvjlgjp0l67g',
        "m/84'/2'/1'/0/0": 'ltc1q8j6e2m9nl6x2k77tvplg3acncmfhufuzl2lv72',
        "m/84'/2'/21234567'/0/0": 'ltc1qqwfjc7eklnsekutek859d27mtum5srwy5c0yew',
        "m/84'/2'/2147483646'/0/0": 'ltc1qvu3nrwt2fr7m3sunt0rf6nmnlxqqn782qcqewq',
        "m/84'/2'/2147483647'/0/0": 'ltc1qwqa44me7gcj6842tfgrlyq8nnxeuu2q0r7ehuu',
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
        "m/44'/1900'/0'/0/0": 'NLcXiEZoJ3uhhTEEQHh7CgRorQVjbg38JQ',
        "m/44'/1900'/1'/0/0": 'NUchPgHP3qyvR36KkA4XGRy25G83bCHaJs',
        "m/44'/1900'/21234567'/0/0": 'NRymY6CLqmJLWumLJ1JWCAiLpaj1o4hUAd',
        "m/44'/1900'/2147483646'/0/0": 'NWduiBLt44k8HbEbwmC6qnUgHb9bGeKYtV',
        "m/44'/1900'/2147483647'/0/0": 'NiFGtnV5ph2G5MmNyisaJBM4QuYuaULHLp',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ethereum',
      params: {
        path: "m/44'/60'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/60'/0'/0/0": '0xA2dA93334273786b9D3A72238ebC41C4c7661003',
        "m/44'/60'/1'/0/0": '0xd1dEd8930b24Fa5E329e26a5416E4AEfE0e6F8A8',
        "m/44'/60'/21234567'/0/0": '0x877e52DA4908e0FeFC427977Cde4513D53B7eaF6',
        "m/44'/60'/2147483646'/0/0": '0xB7b411f3bEB57C4c78B957c8a680Bab054EeEA11',
        "m/44'/60'/2147483647'/0/0": '0x39d032e430beF0e1E189D4BA13E32504230Aa498',
      },
    },
    {
      method: 'evmGetAddress',
      name: 'evmGetAddress-Ethereum Classic',
      params: {
        path: "m/44'/61'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/61'/0'/0/0": '0x6462ff0a9178589bE44EC9126F51A8C78CDF9F5B',
        "m/44'/61'/1'/0/0": '0x1B16eDc9FBE9B03B2645daA36D8a3f7BF6CFa166',
        "m/44'/61'/21234567'/0/0": '0x08D43CC54B0bbD9f6123D1B4ab094e55CD4dE717',
        "m/44'/61'/2147483646'/0/0": '0x13952E645132472EA731719453061258142B251D',
        "m/44'/61'/2147483647'/0/0": '0x500AbC8924b24afFe6EfB76B711aF982C0D7b6C0',
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
        "m/44'/118'/0'/0/0": 'cosmos1zcz3lck070hdnva598lf9tf6rqshwz8z7twnur',
        "m/44'/118'/1'/0/0": 'cosmos1h2jf5y9jw5wgwcz5zdcft9jmrc9xzhgdxf5vqw',
        "m/44'/118'/21234567'/0/0": 'cosmos1fa99rd2qzptekhxkg5afxlgddv8652gd57rvvy',
        "m/44'/118'/2147483646'/0/0": 'cosmos1apdm5sn7mkx5n45dqeaazz75svjlt6szvgdsl0',
        "m/44'/118'/2147483647'/0/0": 'cosmos1f5jdlgfrf06kcyhc0gkv372kmxan2xz9mgzk0j',
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
        "m/44'/118'/0'/0/0": 'akash1zcz3lck070hdnva598lf9tf6rqshwz8znsr59e',
        "m/44'/118'/1'/0/0": 'akash1h2jf5y9jw5wgwcz5zdcft9jmrc9xzhgdtjete5',
        "m/44'/118'/21234567'/0/0": 'akash1fa99rd2qzptekhxkg5afxlgddv8652gde9wt47',
        "m/44'/118'/2147483646'/0/0": 'akash1apdm5sn7mkx5n45dqeaazz75svjlt6szpnqhx4',
        "m/44'/118'/2147483647'/0/0": 'akash1f5jdlgfrf06kcyhc0gkv372kmxan2xz9kn03kg',
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
        "m/44'/118'/0'/0/0": 'cro1zcz3lck070hdnva598lf9tf6rqshwz8zxsx2qj',
        "m/44'/118'/1'/0/0": 'cro1h2jf5y9jw5wgwcz5zdcft9jmrc9xzhgd7ju4ul',
        "m/44'/118'/21234567'/0/0": 'cro1fa99rd2qzptekhxkg5afxlgddv8652gdv9t4s4',
        "m/44'/118'/2147483646'/0/0": 'cro1apdm5sn7mkx5n45dqeaazz75svjlt6sz5n9fr7',
        "m/44'/118'/2147483647'/0/0": 'cro1f5jdlgfrf06kcyhc0gkv372kmxan2xz9rn20nr',
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
        "m/44'/118'/0'/0/0": 'fetch1zcz3lck070hdnva598lf9tf6rqshwz8zdk8h75',
        "m/44'/118'/1'/0/0": 'fetch1h2jf5y9jw5wgwcz5zdcft9jmrc9xzhgd45agze',
        "m/44'/118'/21234567'/0/0": 'fetch1fa99rd2qzptekhxkg5afxlgddv8652gd8r2gwn',
        "m/44'/118'/2147483646'/0/0": 'fetch1apdm5sn7mkx5n45dqeaazz75svjlt6szl4y5ac',
        "m/44'/118'/2147483647'/0/0": 'fetch1f5jdlgfrf06kcyhc0gkv372kmxan2xz9g4tjd9',
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
        "m/44'/118'/0'/0/0": 'osmo1zcz3lck070hdnva598lf9tf6rqshwz8zksar23',
        "m/44'/118'/1'/0/0": 'osmo1h2jf5y9jw5wgwcz5zdcft9jmrc9xzhgdwj8uku',
        "m/44'/118'/21234567'/0/0": 'osmo1fa99rd2qzptekhxkg5afxlgddv8652gdu9su6k',
        "m/44'/118'/2147483646'/0/0": 'osmo1apdm5sn7mkx5n45dqeaazz75svjlt6szyn7qfa',
        "m/44'/118'/2147483647'/0/0": 'osmo1f5jdlgfrf06kcyhc0gkv372kmxan2xz9nn3xeq',
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
        "m/44'/118'/0'/0/0": 'juno1zcz3lck070hdnva598lf9tf6rqshwz8zgedgml',
        "m/44'/118'/1'/0/0": 'juno1h2jf5y9jw5wgwcz5zdcft9jmrc9xzhgdsmhh8j',
        "m/44'/118'/21234567'/0/0": 'juno1fa99rd2qzptekhxkg5afxlgddv8652gdzvqhtc',
        "m/44'/118'/2147483646'/0/0": 'juno1apdm5sn7mkx5n45dqeaazz75svjlt6sz66wtcn',
        "m/44'/118'/2147483647'/0/0": 'juno1f5jdlgfrf06kcyhc0gkv372kmxan2xz9d6pdgw',
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
        "m/44'/118'/0'/0/0": 'terra1zcz3lck070hdnva598lf9tf6rqshwz8zc05n7r',
        "m/44'/118'/1'/0/0": 'terra1h2jf5y9jw5wgwcz5zdcft9jmrc9xzhgdqdwvzw',
        "m/44'/118'/21234567'/0/0": 'terra1fa99rd2qzptekhxkg5afxlgddv8652gdj6evwy',
        "m/44'/118'/2147483646'/0/0": 'terra1apdm5sn7mkx5n45dqeaazz75svjlt6sz2vhsa0',
        "m/44'/118'/2147483647'/0/0": 'terra1f5jdlgfrf06kcyhc0gkv372kmxan2xz9avckdj',
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
        "m/44'/118'/0'/0/0": 'secret1zcz3lck070hdnva598lf9tf6rqshwz8zuw66pl',
        "m/44'/118'/1'/0/0": 'secret1h2jf5y9jw5wgwcz5zdcft9jmrc9xzhgdyvq9aj',
        "m/44'/118'/21234567'/0/0": 'secret1fa99rd2qzptekhxkg5afxlgddv8652gdkmh93c',
        "m/44'/118'/2147483646'/0/0": 'secret1apdm5sn7mkx5n45dqeaazz75svjlt6szwdeezn',
        "m/44'/118'/2147483647'/0/0": 'secret1f5jdlgfrf06kcyhc0gkv372kmxan2xz9edkljw',
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
        "m/44'/118'/0'/0/0": 'celestia1zcz3lck070hdnva598lf9tf6rqshwz8z0plrxw',
        "m/44'/118'/1'/0/0": 'celestia1h2jf5y9jw5wgwcz5zdcft9jmrc9xzhgdhr9u6r',
        "m/44'/118'/21234567'/0/0": 'celestia1fa99rd2qzptekhxkg5afxlgddv8652gd95jukf',
        "m/44'/118'/2147483646'/0/0": 'celestia1apdm5sn7mkx5n45dqeaazz75svjlt6szazuq9z',
        "m/44'/118'/2147483647'/0/0": 'celestia1f5jdlgfrf06kcyhc0gkv372kmxan2xz92znx4l',
      },
    },
    {
      method: 'suiGetAddress',
      name: 'suiGetAddress',
      params: {
        path: "m/44'/784'/$$INDEX$$'/0'/0'",
      },
      expectedAddress: {
        "m/44'/784'/0'/0'/0'": '0x4aa8506d1a1a16819023d92d23bb6e503a984f51b1b452e2c5de9ee4f98e3fad',
        "m/44'/784'/1'/0'/0'": '0xedc61d7fa1c914dadae378db78bec735e0f0991cbec5a36054e693c216c5e4d3',
        "m/44'/784'/21234567'/0'/0'":
          '0xae37d7eccff7433eed26c0a68c87504bef657486b30736dbdf687136df9d07cb',
        "m/44'/784'/2147483646'/0'/0'":
          '0x51a16dc83c286c62ef6650f3a30d812fda136e41579ded5afb5bcd0c3bf1223e',
        "m/44'/784'/2147483647'/0'/0'":
          '0x3d908bc03752c698c356cc8e348bcce90c2cec9854491216fae3b982030b4e2d',
      },
    },
    {
      method: 'xrpGetAddress',
      name: 'xrpGetAddress',
      params: {
        path: "m/44'/144'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/144'/0'/0/0": 'rhYSsU4QrGstnSVRYY3sV6R6VwDuW17rfw',
        "m/44'/144'/1'/0/0": 'rEvSmAB6mD7gEmJmtWSbUKQzr3GxHRrcQ7',
        "m/44'/144'/21234567'/0/0": 'rE1KDstfVTFopLt961G7PTWRgb3qFMWPFe',
        "m/44'/144'/2147483646'/0/0": 'rfJcBWjkDPx4WBX3zLktcBwWcyQLJwTptN',
        "m/44'/144'/2147483647'/0/0": 'rszJBA3N1fXb3BbbWv2oNQtjTED1MgkmhM',
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
          'BFCf2f9f2cc4ea7e96cadab5464ed00550cf9071b5738ac2664d3b7bbcd41c24697573b',
        "m/44'/728'/1'/0'/0'":
          'BFCefd4c2c9f59715d92961b7c6760647facef593c956912ddb0627127f85aedad21051',
        "m/44'/728'/21234567'/0'/0'":
          'BFC588d10bdf8ca2eee50fef85d00bdb4d8087dc10a15d2295ec0e3b4d64d7ca5fac7e9',
        "m/44'/728'/2147483646'/0'/0'":
          'BFC75b1422218dbcc8bf8c9cbaabc9293bf2c64b4174952f2021ee96b62a89b53e17c39',
        "m/44'/728'/2147483647'/0'/0'":
          'BFC27c940550c453c2b13cd68e2f949606552dfdc2756f5393ff4a71a7e08ec8d8f5580',
      },
    },
    {
      method: 'alephiumGetAddress',
      name: 'alephiumGetAddress',
      params: {
        path: "m/44'/1234'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/1234'/0'/0/0": '1HuyB6hEbaPNBQMjBZs6g42YW8oVb1adS5F6TUE4BFYNR',
        "m/44'/1234'/1'/0/0": '18DdeSg1jvHHADHKaghmhYoAz9HpjTnu6BmRhzsyxVGot',
        "m/44'/1234'/21234567'/0/0": '1HpsUXQPS7EjcCUhNpFAX13SvBCLAB6e9kDFsZYYKCUcH',
        "m/44'/1234'/2147483646'/0/0": '18cTjpGUdK6yd8GoUxn5KmBuZwSeGfKGkTzwtqNvS69tc',
        "m/44'/1234'/2147483647'/0/0": '1D8UoR4pg4RBAu7xU64GLKYjWMnX3DkuGFmhBr2WLKCnT',
      },
    },
    {
      method: 'algoGetAddress',
      name: 'algoGetAddress',
      params: {
        path: "m/44'/283'/$$INDEX$$'/0'/0'",
      },
      expectedAddress: {
        "m/44'/283'/0'/0'/0'": 'RUEOGXSEV6ONSSZ4GWO52E2YLWWDV2KY5LWPYXV35MGUWFM2BY66K2HUFM',
        "m/44'/283'/1'/0'/0'": 'U2CZDTOP6HKJOMYEWBSHY2DEAMQ6ZQTXBN2GQS65UNLLQON72YGUKS7RZI',
        "m/44'/283'/21234567'/0'/0'": 'SCJLVWC3WQA3SA7S3PSAEWXEC5BIHW3YOW6Y2GOGRSSK37QR2VF326TDIA',
        "m/44'/283'/2147483646'/0'/0'":
          'BVRFZVODKMXRZA55EWJ6JL6WZM5DABYMHO3KSSIEHV7WDTKGBJ4QIQ3I4U',
        "m/44'/283'/2147483647'/0'/0'":
          'QMND2ZXT7XVCHJ2DKRHPVNXI2FAJRVF57VU4UD2K6NJC7L6UBFYYDSCE24',
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
        "m/44'/607'/0'": 'UQB-M9P_vBLEEK1SaFsyMr0Lfd1KQhO-bUEHvwFKAIcbR5R9',
        "m/44'/607'/1'": 'UQCMQvqrpPJ00ZysP3H5OOzI7aJ0sVjN-FRdGf-gJ7ZwBL4e',
        "m/44'/607'/21234567'": 'UQCvXgzm2Mki-_WDZKr-1TcY8G2pYcSgkkIRZmUeeTd_fsdS',
        "m/44'/607'/2147483646'": 'UQDT3-KWpdG4ZfcBLxX0EkYomlipaNaFSHxJRxUPuaxjrToe',
        "m/44'/607'/2147483647'": 'UQCVbmRRcTUABs_4pGi5Xb2lXcWJJ3D8aF9L70thGZclyGDx',
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
        "m/44'/309'/0'/0/0": 'ckb1qyq2syfj4emaxrh06c4ag8fl8r9svgauxcxq6a3exj',
        "m/44'/309'/1'/0/0": 'ckb1qyq9y0m07xmrax7ttrq6lxg3jlwr4lpyj8tqukl5h8',
        "m/44'/309'/21234567'/0/0": 'ckb1qyq8lmudxmj8mrdzkauyrjgsjgqv86nhd60qkhfkve',
        "m/44'/309'/2147483646'/0/0": 'ckb1qyqp8lysyc4z92y76m7mrhw8hlpt09d0egrqrvuthj',
        "m/44'/309'/2147483647'/0/0": 'ckb1qyqgfyt79l54xvnqy5rg6xv6f09frktvtq5suqpcrt',
      },
    },
    {
      method: 'nexaGetAddress',
      name: 'nexaGetAddress',
      params: {
        path: "m/44'/29223'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/29223'/0'/0/0": 'nexa:nqtsq5g53qt77cmy2pdfapuqaf4cu3u48eqdrs8mfk8ut72t',
        "m/44'/29223'/1'/0/0": 'nexa:nqtsq5g5vm70nqxfehzq4xk3tazjgzt9kass2jrp30e6ezz9',
        "m/44'/29223'/21234567'/0/0": 'nexa:nqtsq5g5efjspduaswvgkum83kcelx64xz0k9zasy32h4568',
        "m/44'/29223'/2147483646'/0/0": 'nexa:nqtsq5g5mwvck36z0mkdd0y9rxvghk4vluwrl4q8f9ssj6nh',
        "m/44'/29223'/2147483647'/0/0": 'nexa:nqtsq5g59akjghlm2exqu5crdhpnqzrcqn78eaze5ev5lemy',
      },
    },
    {
      method: 'xrpGetAddress',
      name: 'xrpGetAddress',
      params: {
        path: "m/44'/144'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/144'/0'/0/0": 'rhYSsU4QrGstnSVRYY3sV6R6VwDuW17rfw',
        "m/44'/144'/1'/0/0": 'rEvSmAB6mD7gEmJmtWSbUKQzr3GxHRrcQ7',
        "m/44'/144'/21234567'/0/0": 'rE1KDstfVTFopLt961G7PTWRgb3qFMWPFe',
        "m/44'/144'/2147483646'/0/0": 'rfJcBWjkDPx4WBX3zLktcBwWcyQLJwTptN',
        "m/44'/144'/2147483647'/0/0": 'rszJBA3N1fXb3BbbWv2oNQtjTED1MgkmhM',
      },
    },
    {
      method: 'scdoGetAddress',
      name: 'scdoGetAddress',
      params: {
        path: "m/44'/541'/$$INDEX$$'/0/0",
      },
      expectedAddress: {
        "m/44'/541'/0'/0/0": '1S01eb2f17b9308f54a6226709d13e7072c48c5ca1',
        "m/44'/541'/1'/0/0": '1S01df5c1fd8407f5ca2f1d80005c3f9c1862a0d11',
        "m/44'/541'/21234567'/0/0": '1S0157b70bd5dff421b0380cf438ba6028c42cb2a1',
        "m/44'/541'/2147483646'/0/0": '1S01a1a9bb700a65b06e3ffd891b7092fde616a0d1',
        "m/44'/541'/2147483647'/0/0": '1S016f9e9b00df4c62b6cfbf24544153fa574462c1',
      },
    },
  ],
};
